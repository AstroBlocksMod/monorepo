/**
 * @fileoverview
 * Objects: sprites as classes.
 *
 * The VM already splits a sprite the way a class is split. A Sprite holds what every copy shares
 * (scripts, custom blocks, costumes, sounds) and each RenderedTarget holds one copy's state (position,
 * variables). This file names the pieces and adds the one that was missing, a way to make a copy that
 * does not start out as a snapshot of whoever asked for it.
 *
 * - A class is a sprite.
 * - An instance is a target of that sprite. The sprite on the stage counts as one, and so does a clone
 *   made the Scratch way.
 * - A field is one of the sprite's "for this sprite only" variables. A field whose name starts with
 *   "static " is shared by every instance made with "new".
 * - A method is one of the sprite's custom blocks. The one called "constructor" runs when an instance
 *   is made.
 * - A sprite with a "data class" block in it makes instances that never appear on the stage. They are
 *   not in the runtime's target list either, so they cost little and are freed when nothing refers to
 *   them any more.
 *
 * "new" differs from "create clone of" in one way that matters: fields start at the zero value of
 * their type and the constructor sets them, whoever asked. A clone starts with a copy of its
 * creator's variables. "create clone of" is left exactly as it was.
 */

const Reference = require('./reference');
const {callProcedure} = require('./call');
const Variable = require('../engine/variable');
const RenderedTarget = require('../sprites/rendered-target');
const {InputType} = require('../compiler/enums');

/** Name of the custom block that runs when an instance is made. */
const CONSTRUCTOR = 'constructor';

/** A field whose name starts with this is shared by all instances. */
const STATIC_PREFIX = 'static ';

/*
 * A call on another object is written with an ordinary custom block call block, so that it looks and
 * edits like any other custom block: "(enemy) take damage (5)", "new (Enemy) hp (10)". Its first
 * input takes the object, or the class for "new", and that input's ID is one of the two below. The
 * ID is what tells such a block apart from a call to a custom block that has been deleted, which
 * does nothing.
 */

/** ID of the first input of a call block that calls a method: the object. */
const SELF_ARGUMENT_ID = 'astro:self';

/** ID of the first input of a call block that makes an instance: the class. */
const CLASS_ARGUMENT_ID = 'astro:class';

/** ID of the Classes extension, which a project with calls on other objects needs. */
const EXTENSION_ID = 'astroClasses';

/** Opcodes of the hidden blocks that call blocks for other objects run as. */
const CALL_METHOD_OPCODE = `${EXTENSION_ID}_callMethod`;
const CONSTRUCT_OPCODE = `${EXTENSION_ID}_construct`;

/** Opcode of the block that marks a sprite as a data class. */
const DATA_CLASS_OPCODE = `${EXTENSION_ID}_dataClass`;

/**
 * @param {?object} mutation The mutation of a procedures_call block.
 * @returns {Array<string>} The IDs of its inputs, or an empty array if they cannot be read.
 */
const argumentIdsOf = mutation => {
    if (!mutation || typeof mutation.argumentids !== 'string') return [];
    try {
        const ids = JSON.parse(mutation.argumentids);
        return Array.isArray(ids) ? ids : [];
    } catch (e) {
        return [];
    }
};

/**
 * An instance of a data class. It is a target like any other, so the class's scripts run on it
 * unchanged, but it has no drawable and is not in the runtime's target list.
 */
class DataTarget extends RenderedTarget {
    constructor (sprite, runtime) {
        super(sprite, runtime);
        this.isOriginal = false;
        // Every method that would touch the renderer checks for one first.
        this.renderer = null;
    }

    // Never visible, whatever a "show" block says. Blocks that draw something for a sprite, such
    // as a speech bubble, ask this first and expect a drawable if the answer is yes.
    get visible () {
        return false;
    }
    set visible (ignored) {
        // Stays false.
    }
}

/**
 * A reference to an instance.
 */
class InstanceReference extends Reference {
    /**
     * @param {RenderedTarget} target The instance.
     * @param {boolean} isData True if the instance is not on the stage.
     */
    constructor (target, isData) {
        // The sprite on the stage goes by the sprite's name, so that it can be handed to blocks that
        // take a sprite's name.
        super(target.isOriginal ? target.sprite.name : Reference.createLabel(target.sprite.name));
        this.target = target;
        this.isData = isData;
        this.isDeleted = false;
    }

    get typeName () {
        return this.target.sprite.name;
    }

    get isAlive () {
        if (this.isDeleted) return false;
        return this.isData || this.target.sprite.clones.includes(this.target);
    }
}

/**
 * Things worked out from a sprite's blocks, kept until the blocks change. Blocks.resetCache() swaps
 * the compiledScripts object for a new one on every edit, which makes that object a usable key.
 * @type {WeakMap<object, object>}
 */
const classDescriptions = new WeakMap();

/**
 * Take the "static " prefix and any type annotation off a variable name.
 * @param {string} name A variable name like "static count: number".
 * @returns {string} The bare field name, like "count".
 */
const fieldNameOf = name => {
    let result = String(name).trim();
    if (result.startsWith(STATIC_PREFIX)) {
        result = result.slice(STATIC_PREFIX.length).trim();
    }
    const colon = result.lastIndexOf(':');
    if (colon > 0 && result.slice(colon + 1).trim()) {
        result = result.slice(0, colon).trim();
    }
    return result;
};

const isStaticName = name => {
    const trimmed = String(name).trim();
    return trimmed.startsWith(STATIC_PREFIX);
};

/**
 * @param {import('../engine/blocks')} blocks A sprite's blocks.
 * @param {string} blockId ID of a block.
 * @returns {boolean} True if the block, anything in it or anything under it is a "return" block.
 */
const containsReturn = (blocks, blockId) => {
    const pending = [blockId];
    while (pending.length > 0) {
        const block = blocks.getBlock(pending.pop());
        if (!block) continue;
        if (block.opcode === 'procedures_return') return true;
        if (block.next) pending.push(block.next);
        for (const name in block.inputs) {
            if (!Object.prototype.hasOwnProperty.call(block.inputs, name)) continue;
            const input = block.inputs[name];
            if (input.block) pending.push(input.block);
            if (input.shadow && input.shadow !== input.block) pending.push(input.shadow);
        }
    }
    return false;
};

/**
 * @typedef {object} MethodDescription
 * @property {string} procedureCode The custom block's proccode.
 * @property {Array<string>} names Input names.
 * @property {Array<string>} ids Input IDs.
 * @property {Array<*>} defaults Input defaults.
 * @property {boolean} returns True if the custom block has a "return" block in it.
 */

/**
 * @typedef {object} ClassDescription
 * @property {boolean} isData True if instances stay off the stage.
 * @property {?MethodDescription} initializer The custom block called "constructor", which runs when
 * an instance is made.
 * @property {Array<MethodDescription>} methods Every other custom block.
 */

/**
 * @param {import('../sprites/sprite')} sprite A sprite.
 * @returns {ClassDescription} What the sprite is as a class.
 */
const describeClass = sprite => {
    const blocks = sprite.blocks;
    const key = blocks._cache.compiledScripts;
    const cached = classDescriptions.get(key);
    if (cached) return cached;

    const description = {
        isData: false,
        initializer: null,
        methods: []
    };
    for (const scriptId of blocks.getScripts()) {
        const topBlock = blocks.getBlock(scriptId);
        if (topBlock && topBlock.opcode === DATA_CLASS_OPCODE) {
            description.isData = true;
        }
    }

    blocks.populateProcedureCache();
    const definitions = blocks._cache.procedureDefinitions;
    for (const procedureCode of Object.keys(definitions).sort()) {
        const definitionId = definitions[procedureCode];
        const parameters = blocks.getProcedureParamNamesIdsAndDefaults(procedureCode);
        if (!definitionId || !parameters) continue;
        const [names, ids, defaults] = parameters;
        const method = {
            procedureCode,
            names,
            ids,
            defaults,
            returns: containsReturn(blocks, blocks.getBlock(definitionId).next)
        };
        if (procedureCode === CONSTRUCTOR || procedureCode.startsWith(`${CONSTRUCTOR} `)) {
            // With more than one, the first by name wins, the same one every time.
            if (!description.initializer) description.initializer = method;
        } else {
            description.methods.push(method);
        }
    }

    classDescriptions.set(key, description);
    return description;
};

/**
 * The text of the call block that makes an instance of a class with its constructor's inputs.
 * @param {string} constructorCode The proccode of the constructor, like "constructor hp %s".
 * @returns {string} A proccode like "new %s hp %s", whose first input is the class.
 */
const constructorCallCode = constructorCode => `new %s${constructorCode.slice(CONSTRUCTOR.length)}`;

class ObjectService {
    /**
     * @param {import('../engine/runtime')} runtime The runtime.
     * @returns {ObjectService} The runtime's object service, made on first use.
     */
    static for (runtime) {
        if (!runtime.astroObjects) {
            runtime.astroObjects = new ObjectService(runtime);
        }
        return runtime.astroObjects;
    }

    constructor (runtime) {
        this.runtime = runtime;

        /**
         * The one reference there is to each instance.
         * @type {WeakMap<RenderedTarget, InstanceReference>}
         */
        this.references = new WeakMap();

        /**
         * The type each class is when its name is used in a type annotation.
         * @type {WeakMap<import('../sprites/sprite'), import('./types').AstroType>}
         */
        this.classTypes = new WeakMap();

        // A class name can be used as a type: "target: Enemy".
        runtime.astroTypeSources.push({
            resolve: name => {
                const sprite = this.classNamed(name);
                return sprite ? this.typeOfClass(sprite) : null;
            },
            names: () => this.classNames()
        });
    }

    /**
     * @returns {Array<import('../sprites/sprite')>} Every class, which is every sprite but the stage.
     */
    classes () {
        return this.runtime.targets
            .filter(target => target.isOriginal && !target.isStage)
            .map(target => target.sprite);
    }

    /**
     * @returns {Array<string>} The name of every class.
     */
    classNames () {
        return this.classes().map(sprite => sprite.name);
    }

    /**
     * @param {string} name A sprite name.
     * @returns {?import('../sprites/sprite')} The class by that name.
     */
    classNamed (name) {
        const target = this.runtime.getSpriteTargetByName(String(name));
        return target && !target.isStage ? target.sprite : null;
    }

    /**
     * @param {import('../sprites/sprite')} sprite A class.
     * @returns {import('./types').AstroType} The type whose values are the instances of the class.
     * A variable of this type holds an instance of the class or nothing.
     */
    typeOfClass (sprite) {
        let type = this.classTypes.get(sprite);
        if (!type) {
            const accepts = value => {
                const reference = this.resolve(value);
                return !!reference && reference.target.sprite === sprite;
            };
            type = {
                get name () {
                    return sprite.name;
                },
                // The compiler knows nothing about references.
                inputType: InputType.ANY,
                accepts,
                coerce: value => (accepts(value) ? this.resolve(value) : ''),
                zero: ''
            };
            this.classTypes.set(sprite, type);
        }
        return type;
    }

    /**
     * @param {RenderedTarget} target An instance.
     * @returns {InstanceReference} The reference to it. Always the same one for the same instance.
     */
    referenceFor (target) {
        let reference = this.references.get(target);
        if (!reference) {
            reference = new InstanceReference(target, false);
            this.references.set(target, reference);
        }
        return reference;
    }

    /**
     * Find the instance a value stands for.
     * @param {*} value A reference, or the name of a sprite, which stands for the sprite on the stage.
     * @returns {?InstanceReference} The reference, or null if the value is not an instance that
     * still exists.
     */
    resolve (value) {
        if (value instanceof InstanceReference) {
            return value.isAlive ? value : null;
        }
        if (typeof value === 'string' && value !== '') {
            const target = this.runtime.getSpriteTargetByName(value);
            return target ? this.referenceFor(target) : null;
        }
        return null;
    }

    /**
     * Give an instance the fields of its class, each at its starting value.
     * @param {RenderedTarget} target The new instance.
     * @param {RenderedTarget} original The sprite on the stage, which the fields are read from.
     * @private
     */
    _resetFields (target, original) {
        const fields = {};
        for (const id in original.variables) {
            if (!Object.prototype.hasOwnProperty.call(original.variables, id)) continue;
            const variable = original.variables[id];
            if (isStaticName(variable.name)) {
                // The very same Variable, which is all it takes for every script to see one value.
                fields[id] = variable;
            } else {
                fields[id] = new Variable(variable.id, variable.name, variable.type, false);
            }
        }
        target.variables = fields;

        const types = this.runtime.astroTypes;
        if (types) {
            types.applyToTarget(target);
        }
        for (const id in fields) {
            if (!Object.prototype.hasOwnProperty.call(fields, id)) continue;
            const variable = target.variables[id];
            if (variable.type === Variable.SCALAR_TYPE && !isStaticName(variable.name)) {
                variable.value = variable.astroType ? variable.astroType.zero : 0;
            }
        }
    }

    /**
     * Make an instance of a class and run its constructor.
     * @param {import('../sprites/sprite')} sprite The class.
     * @param {Array<*>} args Values for the constructor's inputs.
     * @param {?import('../engine/block-utility')} util The block utility of the block asking.
     * @returns {InstanceReference|string|Promise<InstanceReference>} The new instance, or '' if the
     * clone limit is reached. A promise if the constructor waits.
     */
    instantiate (sprite, args, util) {
        const original = sprite.clones[0];
        if (!original) return '';
        const description = describeClass(sprite);

        let target;
        if (description.isData) {
            target = new DataTarget(sprite, this.runtime);
            this._resetFields(target, original);
        } else {
            target = original.makeClone();
            if (!target) return '';
            this._resetFields(target, original);
            this.runtime.addTarget(target);
            target.goBehindOther(original);
        }

        const reference = new InstanceReference(target, description.isData);
        this.references.set(target, reference);

        if (!description.initializer) return reference;
        const constructed = callProcedure(target, description.initializer.procedureCode, args, util);
        if (constructed && typeof constructed.then === 'function') {
            return constructed.then(() => reference);
        }
        return reference;
    }

    /**
     * Delete an instance. The sprite on the stage cannot be deleted.
     * @param {InstanceReference} reference The instance.
     */
    destroy (reference) {
        const target = reference.target;
        if (target.isOriginal || !reference.isAlive) return;
        reference.isDeleted = true;
        if (!reference.isData) {
            this.runtime.disposeTarget(target);
            // A method of the instance may still be running further up the JavaScript stack, where
            // it cannot be stopped before it next waits. Nothing it does should reach the renderer.
            target.renderer = null;
        }
        this.runtime.stopForTarget(target);
    }

    /**
     * @param {InstanceReference} reference An instance.
     * @param {string} fieldName A field name, with or without its "static " and its type.
     * @returns {?Variable} The field's variable, or null if the instance has no such field.
     */
    fieldOf (reference, fieldName) {
        const variables = reference.target.variables;
        const wanted = String(fieldName);
        const bareName = fieldNameOf(wanted);
        let match = null;
        for (const id in variables) {
            if (!Object.prototype.hasOwnProperty.call(variables, id)) continue;
            const variable = variables[id];
            if (variable.type !== Variable.SCALAR_TYPE) continue;
            if (variable.name === wanted) return variable;
            if (!match && fieldNameOf(variable.name) === bareName) match = variable;
        }
        return match;
    }

    /**
     * @returns {Array<string>} The bare name of every field of every class, for menus.
     */
    fieldNames () {
        const names = [];
        for (const sprite of this.classes()) {
            const variables = sprite.clones[0].variables;
            for (const id in variables) {
                if (!Object.prototype.hasOwnProperty.call(variables, id)) continue;
                if (variables[id].type !== Variable.SCALAR_TYPE) continue;
                const name = fieldNameOf(variables[id].name);
                if (!names.includes(name)) names.push(name);
            }
        }
        return names;
    }

    /**
     * Call a method of an instance.
     * @param {InstanceReference} reference The instance.
     * @param {string} procedureCode The proccode of the custom block.
     * @param {Array<*>} args Values for its inputs.
     * @param {?import('../engine/block-utility')} util The block utility of the block asking.
     * @returns {*|Promise<*>} What the method returned, see callProcedure().
     */
    callMethod (reference, procedureCode, args, util) {
        return callProcedure(reference.target, procedureCode, args, util);
    }

    /**
     * @param {object} block A block as the VM or a project file stores it.
     * @returns {?string} The ID of the Classes extension if the block is a call on another object.
     * Such a block has the opcode of a custom block call, so nothing else says that the project
     * needs the extension.
     */
    static extensionForBlock (block) {
        if (!block || block.opcode !== 'procedures_call') return null;
        const firstId = argumentIdsOf(block.mutation)[0];
        return (firstId === SELF_ARGUMENT_ID || firstId === CLASS_ARGUMENT_ID) ? EXTENSION_ID : null;
    }

    /**
     * Recognize a call block that has no custom block to call in its own sprite but is a call on
     * another object: a method call, whose first input is the object, or "new", whose first input
     * is the class. Used by both engines, which then run the hidden block named in the result.
     * @param {import('../engine/runtime')} runtime The runtime.
     * @param {object} mutation The call block's mutation.
     * @returns {?{opcode: string, fields: object, inputs: Object<string, string>}} The hidden block to run,
     * the fields to give it, and which of the call block's inputs goes to which of its inputs.
     */
    static describeForeignCall (runtime, mutation) {
        if (!runtime || !runtime.astroObjects) return null;
        if (!mutation || typeof mutation.proccode !== 'string') return null;
        const ids = argumentIdsOf(mutation);
        const procedureCode = mutation.proccode;

        let opcode;
        const fields = {};
        const inputs = {};
        if (ids[0] === SELF_ARGUMENT_ID && procedureCode.startsWith('%s ')) {
            opcode = CALL_METHOD_OPCODE;
            fields.METHOD = procedureCode.slice('%s '.length);
            inputs.SELF = ids[0];
        } else if (ids[0] === CLASS_ARGUMENT_ID && procedureCode.startsWith('new %s')) {
            opcode = CONSTRUCT_OPCODE;
            inputs.CLASS = ids[0];
        } else {
            return null;
        }
        ids.slice(1).forEach((id, i) => {
            inputs[`ARG${i}`] = id;
        });
        return {opcode, fields, inputs};
    }

    /**
     * Run a call recognized by describeForeignCall() in the interpreter, which has already worked
     * out the values of the call block's inputs.
     * @param {object} foreignCall What describeForeignCall() returned.
     * @param {object} args The call block's input values by input ID.
     * @param {import('../engine/block-utility')} util The block utility.
     * @returns {*|Promise<*>} What the hidden block returns.
     */
    static runForeignCall (foreignCall, args, util) {
        const blockArgs = Object.assign({}, foreignCall.fields);
        for (const name in foreignCall.inputs) {
            if (!Object.prototype.hasOwnProperty.call(foreignCall.inputs, name)) continue;
            const inputId = foreignCall.inputs[name];
            blockArgs[name] = Object.prototype.hasOwnProperty.call(args, inputId) ? args[inputId] : '';
        }
        const blockFunction = util.runtime.getOpcodeFunction(foreignCall.opcode);
        return blockFunction ? blockFunction(blockArgs, util) : '';
    }

    /**
     * Collect the numbered inputs of a hidden call block.
     * @param {object} args The block's arguments, with ARG0, ARG1 and so on.
     * @returns {Array<*>} The values in order.
     */
    static collectArguments (args) {
        const values = [];
        for (let i = 0; Object.prototype.hasOwnProperty.call(args, `ARG${i}`); i++) {
            values.push(args[`ARG${i}`]);
        }
        return values;
    }
}

ObjectService.InstanceReference = InstanceReference;
ObjectService.describeClass = describeClass;
ObjectService.constructorCallCode = constructorCallCode;
ObjectService.fieldNameOf = fieldNameOf;
ObjectService.CONSTRUCTOR = CONSTRUCTOR;
ObjectService.EXTENSION_ID = EXTENSION_ID;
ObjectService.SELF_ARGUMENT_ID = SELF_ARGUMENT_ID;
ObjectService.CLASS_ARGUMENT_ID = CLASS_ARGUMENT_ID;
ObjectService.DATA_CLASS_OPCODE = DATA_CLASS_OPCODE;

module.exports = ObjectService;
