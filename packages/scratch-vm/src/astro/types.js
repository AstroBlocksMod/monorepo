/**
 * @fileoverview
 * Gradual types.
 *
 * A type is written at the end of a name, after a colon: a variable called "score: number", a custom block
 * input called "label: text", a custom block called "area of %s %s: number" (the type of what it returns).
 * Names without one stay dynamic, which is how every Scratch and TurboWarp project already is.
 *
 * Annotations only mean something once the Types extension is in the project, as it is the extension that
 * puts a TypeService on the runtime. Without it a colon in a name is only a colon, so projects from
 * elsewhere keep running the way they always did.
 *
 * The rule the rest of the design rests on: an annotation never changes what a correct program does. It
 * converts a value of the wrong type (the Scratch way, "abc" becomes 0) and lets the compiler skip
 * conversions it now knows are not needed. So a runtime that ignores annotations still runs a correct
 * program correctly.
 *
 * Where a type is enforced:
 * - A variable converts whatever is stored in it. An annotated variable is a TypedVariable, a Variable
 *   whose value goes through a setter, so this holds for every writer: both engines, extensions, sliders
 *   and the project file. The compiler relies on that when it reads one without converting.
 * - A custom block input is converted when the custom block is called.
 * - What a custom block returns is converted where the call is used.
 * - Lists are not typed.
 */

const Cast = require('../util/cast');
const Reference = require('./reference');
const Variable = require('../engine/variable');
const {InputType, InputOpcode} = require('../compiler/enums');
const {IntermediateInput} = require('../compiler/intermediate');

/**
 * @typedef {object} AstroType
 * @property {string} name What the type is called in an annotation.
 * @property {number} inputType What the compiler may assume about a value of this type, as InputType
 * bits. InputType.ANY means it may assume nothing, and then it does not convert values itself either.
 * @property {function(*): *} coerce Convert any value to this type.
 * @property {function(*): boolean} accepts Whether a value already is of this type, for "is a" checks.
 * @property {*} zero The value a variable of this type starts with.
 * @property {Function} [VariableClass] The Variable subclass for variables of this type. Types without
 * one use TypedVariable.
 */

const isNumeric = value => {
    if (typeof value === 'number') return !Number.isNaN(value);
    if (typeof value !== 'string' || value.trim() === '') return false;
    return !Number.isNaN(Number(value));
};

/** @type {AstroType} */
const NUMBER = {
    name: 'number',
    inputType: InputType.NUMBER,
    coerce: Cast.toNumber,
    accepts: isNumeric,
    zero: 0
};

/** @type {AstroType} */
const TEXT = {
    name: 'text',
    inputType: InputType.STRING,
    coerce: Cast.toString,
    accepts: value => typeof value === 'string',
    zero: ''
};

/** @type {AstroType} */
const BOOLEAN = {
    name: 'boolean',
    inputType: InputType.BOOLEAN,
    coerce: Cast.toBoolean,
    accepts: value => typeof value === 'boolean' || value === 'true' || value === 'false',
    zero: false
};

/*
 * Typed variables keep their value behind a getter and setter on the prototype. That shape matters:
 * it runs as fast as a plain property, where an accessor defined on each variable object runs many
 * times slower. Each built in type has a class of its own so that its setter stays a simple check.
 */

/**
 * A variable of a type that has no class of its own.
 */
class TypedVariable extends Variable {
    get value () {
        return this._value;
    }
    set value (newValue) {
        // The Variable constructor stores a first value before the type is known.
        this._value = this.astroType ? this.astroType.coerce(newValue) : newValue;
    }
}

class NumberVariable extends Variable {
    get value () {
        return this._value;
    }
    set value (newValue) {
        this._value = (typeof newValue === 'number' && !Number.isNaN(newValue)) ? newValue : Cast.toNumber(newValue);
    }
}
NumberVariable.prototype.astroType = NUMBER;
NUMBER.VariableClass = NumberVariable;

class TextVariable extends Variable {
    get value () {
        return this._value;
    }
    set value (newValue) {
        this._value = typeof newValue === 'string' ? newValue : Cast.toString(newValue);
    }
}
TextVariable.prototype.astroType = TEXT;
TEXT.VariableClass = TextVariable;

class BooleanVariable extends Variable {
    get value () {
        return this._value;
    }
    set value (newValue) {
        this._value = typeof newValue === 'boolean' ? newValue : Cast.toBoolean(newValue);
    }
}
BooleanVariable.prototype.astroType = BOOLEAN;
BOOLEAN.VariableClass = BooleanVariable;

/**
 * Make a variable that holds what another holds, enforcing a type or none.
 * @param {Variable} variable The variable to copy.
 * @param {?AstroType} type The type the copy enforces. Null makes a plain Variable.
 * @returns {Variable} The copy.
 */
const copyVariableAs = (variable, type) => {
    let copy;
    if (!type) {
        copy = new Variable(variable.id, variable.name, variable.type, variable.isCloud);
    } else if (type.VariableClass) {
        copy = new type.VariableClass(variable.id, variable.name, variable.type, variable.isCloud);
    } else {
        copy = new TypedVariable(variable.id, variable.name, variable.type, variable.isCloud);
        copy.astroType = type;
    }
    copy.value = variable.value;
    return copy;
};

/**
 * Point a variable that has been replaced at its replacement, so that a script still running with the
 * old object reads and writes the one value there is.
 * @param {Variable} replaced The old variable.
 * @param {Variable} replacement The variable now in its place.
 */
const forwardVariable = (replaced, replacement) => {
    Object.defineProperty(replaced, 'value', {
        configurable: true,
        enumerable: true,
        get: () => replacement.value,
        set: newValue => {
            replacement.value = newValue;
        }
    });
};

/**
 * Split an annotated name into its name and its type.
 * @param {string} text Something like "score: number".
 * @returns {?{name: string, typeName: string}} Null if there is no annotation.
 */
const parseAnnotation = text => {
    if (typeof text !== 'string') return null;
    const colon = text.lastIndexOf(':');
    if (colon < 1) return null;
    const name = text.slice(0, colon).trim();
    const typeName = text.slice(colon + 1).trim();
    if (!name || !typeName) return null;
    return {name, typeName};
};

/**
 * ID of the Types extension. A project that has annotations on lists it, and keeps
 * {annotations: true} in its storage.
 */
const EXTENSION_ID = 'astroTypes';

/** Opcode of the extension's "(value) as [type]" block, which converts a value to a type by name. */
const CONVERT_OPCODE = `${EXTENSION_ID}_as`;

class TypeService {
    /**
     * @param {import('../engine/runtime')} runtime The runtime.
     */
    constructor (runtime) {
        this.runtime = runtime;

        /**
         * Types by the name used in annotations.
         * @type {Map<string, AstroType>}
         */
        this.builtinTypes = new Map([
            ['number', NUMBER],
            ['text', TEXT],
            // What most text-based languages call it.
            ['string', TEXT],
            ['boolean', BOOLEAN]
        ]);

        /**
         * Other places a type can come from, such as the classes in the project. Each is asked in turn
         * for names that are not built in.
         * @type {Array<{resolve: function(string): ?AstroType, names: function(): Array<string>}>}
         */
        this.sources = [];
    }

    /**
     * @param {string} typeName A type name as written in an annotation.
     * @returns {?AstroType} The type, or null if nothing by that name exists.
     */
    typeNamed (typeName) {
        const builtin = this.builtinTypes.get(typeName);
        if (builtin) return builtin;
        for (const source of this.sources) {
            const type = source.resolve(typeName);
            if (type) return type;
        }
        return null;
    }

    /**
     * @returns {Array<string>} Every type name that can be written right now, built in ones first.
     */
    typeNames () {
        const names = [NUMBER.name, TEXT.name, BOOLEAN.name];
        for (const source of this.sources) {
            for (const name of source.names()) {
                if (!names.includes(name)) names.push(name);
            }
        }
        return names;
    }

    /**
     * @param {*} value Any value.
     * @returns {string} The name of the type the value is, as it would be written in an annotation.
     * Text that reads as a number counts as a number, as it does everywhere else in Scratch.
     */
    typeNameOf (value) {
        if (Reference.isReference(value)) return value.typeName;
        if (typeof value === 'boolean') return BOOLEAN.name;
        if (NUMBER.accepts(value)) return NUMBER.name;
        return TEXT.name;
    }

    /**
     * @param {string} annotatedName A name that may end in an annotation, like "score: number".
     * @returns {?AstroType} The annotated type, or null if the name is dynamic.
     */
    typeOf (annotatedName) {
        const annotation = parseAnnotation(annotatedName);
        return annotation ? this.typeNamed(annotation.typeName) : null;
    }

    /**
     * @param {Variable} variable A variable.
     * @returns {?AstroType} The type its name gives it, or null if it is dynamic. Lists and broadcasts
     * are always dynamic.
     */
    typeOfVariable (variable) {
        if (variable.type !== Variable.SCALAR_TYPE) return null;
        return this.typeOf(variable.name);
    }

    /**
     * Make one of a target's variables enforce a type, or none.
     * The Variable object is swapped for one of the right class. The old one keeps working for any
     * script that still holds it.
     * @param {import('../engine/target')} target The target that has the variable.
     * @param {string} id The variable's key in target.variables.
     * @param {?AstroType} type The type to enforce, or null for none.
     * @returns {boolean} True if that was a change.
     * @private
     */
    _enforce (target, id, type) {
        const variable = target.variables[id];
        const enforced = variable.astroType || null;
        if (type === enforced) return false;
        const replacement = copyVariableAs(variable, type);
        target.variables[id] = replacement;
        forwardVariable(variable, replacement);
        return true;
    }

    /**
     * Make one of a target's variables enforce the type in its name.
     * @param {import('../engine/target')} target The target that has the variable.
     * @param {string} id The variable's key in target.variables.
     * @returns {boolean} True if what the variable enforces changed.
     */
    applyToVariable (target, id) {
        return this._enforce(target, id, this.typeOfVariable(target.variables[id]));
    }

    /**
     * Apply annotations to every variable of a target.
     * @param {import('../engine/target')} target The target.
     * @returns {boolean} True if any variable changed what it enforces.
     */
    applyToTarget (target) {
        let changed = false;
        for (const id in target.variables) {
            if (!Object.prototype.hasOwnProperty.call(target.variables, id)) continue;
            changed = this.applyToVariable(target, id) || changed;
        }
        return changed;
    }

    /**
     * Apply annotations to every variable in the project, and throw away compiled scripts if that
     * changed anything, as they were compiled for the old types.
     */
    applyToProject () {
        let changed = false;
        for (const target of this.runtime.targets) {
            changed = this.applyToTarget(target) || changed;
        }
        if (changed) {
            this.runtime.resetAllCaches();
        }
    }

    /**
     * Stop every variable in the project from enforcing a type, for when annotations are turned off.
     */
    releaseProject () {
        let changed = false;
        for (const target of this.runtime.targets) {
            for (const id in target.variables) {
                if (!Object.prototype.hasOwnProperty.call(target.variables, id)) continue;
                changed = this._enforce(target, id, null) || changed;
            }
        }
        if (changed) {
            this.runtime.resetAllCaches();
        }
    }

    /**
     * Called when a variable was renamed, which is how its type is changed.
     * @param {import('../engine/target')} target The target the variable was renamed on.
     * @param {Variable} variable The renamed variable.
     */
    variableWasRenamed (target, variable) {
        const id = variable.id;
        let changed = false;
        // Clones hold their own copy of each of the sprite's variables, which the rename did not reach.
        const owners = target.sprite ? target.sprite.clones : [target];
        for (const owner of owners) {
            const copy = owner.variables[id];
            if (!copy) continue;
            copy.name = variable.name;
            changed = this.applyToVariable(owner, id) || changed;
        }
        if (changed) {
            // Any script may read this variable, so all of them are stale.
            this.runtime.resetAllCaches();
        }
    }

    /**
     * Tell the compiler the type of a variable it is about to use, and make sure the variable
     * enforces it. The compiler can create a variable that a block names but that does not exist, and
     * such a variable has not been through applyToTarget().
     * @param {{scope: string, id: ?string, name: string}} descended The compiler's record of the variable.
     * @param {import('../engine/target')} target The target the script is compiled for.
     * @param {?import('../engine/target')} stage The stage.
     */
    annotateDescendedVariable (descended, target, stage) {
        const owner = descended.scope === 'stage' ? stage : target;
        const id = String(descended.id);
        const variable = owner && owner.variables[id];
        descended.astroType = variable ? this.typeOfVariable(variable) : null;
        if (!descended.astroType) return;
        // Compiled scripts are shared by every clone of a sprite.
        const owners = owner.sprite ? owner.sprite.clones : [owner];
        for (const each of owners) {
            if (each.variables[id]) this.applyToVariable(each, id);
        }
    }

    /**
     * @param {string} procedureCode A custom block's proccode, like "area of %s %s: number".
     * @returns {?AstroType} The type of what it returns, or null if that is dynamic.
     */
    returnType (procedureCode) {
        return this.typeOf(procedureCode);
    }

    /**
     * Convert the values passed to a custom block to the types of its inputs.
     * @param {Array<string>} names The input names of the custom block.
     * @param {Array<*>} values A value for each input. Changed in place.
     */
    coerceArguments (names, values) {
        for (let i = 0; i < names.length && i < values.length; i++) {
            const type = this.typeOf(names[i]);
            if (type) {
                values[i] = type.coerce(values[i]);
            }
        }
    }

    /**
     * coerceArguments() for the interpreter, which keeps a custom block's inputs by name.
     * @param {object} parameters Input values by input name. Changed in place.
     */
    coerceParameters (parameters) {
        for (const name in parameters) {
            if (!Object.prototype.hasOwnProperty.call(parameters, name)) continue;
            const type = this.typeOf(name);
            if (type) {
                parameters[name] = type.coerce(parameters[name]);
            }
        }
    }

    /**
     * Convert what a custom block returned to the type its name says it returns.
     * @param {string} procedureCode The custom block's proccode.
     * @param {*} value What it returned.
     * @returns {*} The converted value.
     */
    coerceReturnValue (procedureCode, value) {
        const type = this.returnType(procedureCode);
        return type ? type.coerce(value) : value;
    }

    /**
     * @param {?object} extensionStorage A project's extension storage, as saved or as on the runtime.
     * @returns {boolean} True if the project has annotations on.
     */
    static isOnIn (extensionStorage) {
        const stored = extensionStorage && extensionStorage[EXTENSION_ID];
        return !!(stored && stored.annotations);
    }

    /**
     * typeOf() for callers that do not know whether type annotations are on.
     * @param {import('../engine/runtime')} runtime The runtime.
     * @param {string} annotatedName A name that may end in an annotation.
     * @returns {?AstroType} The annotated type. Null if the name is dynamic or annotations are off.
     */
    static typeOfName (runtime, annotatedName) {
        return runtime.astroTypes ? runtime.astroTypes.typeOf(annotatedName) : null;
    }

    /**
     * @param {import('../engine/runtime')} runtime The runtime.
     * @param {string} annotatedName A name that may end in an annotation.
     * @returns {number} What the compiler may assume about a value with that name, as InputType bits.
     */
    static inputTypeOf (runtime, annotatedName) {
        const type = TypeService.typeOfName(runtime, annotatedName);
        return type ? type.inputType : InputType.ANY;
    }

    /**
     * Convert a value in a compiled script, if the compiler can do the conversion itself.
     * This is for values on their way into a variable, which converts whatever it is given anyway.
     * @param {?AstroType} type The type to convert to. Null leaves the input alone.
     * @param {import('../compiler/intermediate').IntermediateInput} input The value.
     * @returns {import('../compiler/intermediate').IntermediateInput} The converted value.
     */
    static castInput (type, input) {
        if (!type || type.inputType === InputType.ANY) return input;
        return input.toType(type.inputType);
    }

    /**
     * Convert a value in a compiled script to a type, whatever the type is.
     * This is for custom block inputs and return values, where nothing else does the converting.
     * A type the compiler cannot convert to itself is converted by the "as" block of the Types
     * extension, which can wait in principle, so the script is marked as one that may.
     * @param {?AstroType} type The type to convert to. Null leaves the input alone.
     * @param {import('../compiler/intermediate').IntermediateInput} input The value.
     * @param {import('../compiler/intermediate').IntermediateScript} script The script being compiled.
     * @returns {import('../compiler/intermediate').IntermediateInput} The converted value.
     */
    static convertInput (type, input, script) {
        if (!type) return input;
        if (type.inputType !== InputType.ANY) return input.toType(type.inputType);
        script.yields = true;
        return new IntermediateInput(InputOpcode.COMPATIBILITY_LAYER, InputType.ANY, {
            opcode: CONVERT_OPCODE,
            id: CONVERT_OPCODE,
            inputs: {VALUE: input},
            fields: {TYPE: type.name}
        }, true);
    }
}

TypeService.EXTENSION_ID = EXTENSION_ID;
TypeService.parseAnnotation = parseAnnotation;
TypeService.TypedVariable = TypedVariable;
TypeService.NUMBER = NUMBER;
TypeService.TEXT = TEXT;
TypeService.BOOLEAN = BOOLEAN;

module.exports = TypeService;
