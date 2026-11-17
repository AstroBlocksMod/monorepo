/**
 * @fileoverview
 * Builds sb3 project JSON in code, so that a test for AstroBlocks' own features can keep its scripts next
 * to its assertions instead of in a binary fixture.
 *
 * A block is written as block(opcode, inputs, fields, mutation). An input is a number or string (a
 * literal), another block (a reporter dropped in), or an array of blocks (the inside of a C block).
 */

let lastId = 0;
const uid = prefix => `${prefix}${++lastId}`;

const block = (opcode, inputs = {}, fields = {}, mutation = null) => ({opcode, inputs, fields, mutation});

const isBlock = value => typeof value === 'object' && value !== null && typeof value.opcode === 'string';

/**
 * One sprite or the stage.
 */
class TargetBuilder {
    constructor (name, isStage = false) {
        this.name = name;
        this.isStage = isStage;
        this.variables = {};
        this.lists = {};
        this.blocks = {};
    }

    /**
     * @param {string} name Variable name.
     * @param {*} value Starting value.
     * @returns {Array<string>} The [name, id] pair to use as a block's VARIABLE field.
     */
    variable (name, value = 0) {
        const id = uid('var');
        this.variables[id] = [name, value];
        return [name, id];
    }

    /**
     * @param {string} name List name.
     * @param {Array<*>} value Starting items.
     * @returns {Array<string>} The [name, id] pair to use as a block's LIST field.
     */
    list (name, value = []) {
        const id = uid('list');
        this.lists[id] = [name, value];
        return [name, id];
    }

    _add (node, parentId, topLevel) {
        const id = uid('block');
        const serialized = {
            opcode: node.opcode,
            next: null,
            parent: parentId,
            inputs: {},
            fields: {},
            shadow: !!node.shadow,
            topLevel
        };
        if (topLevel) {
            serialized.x = 0;
            serialized.y = 0;
        }
        if (node.mutation) {
            serialized.mutation = Object.assign({tagName: 'mutation', children: []}, node.mutation);
        }
        this.blocks[id] = serialized;
        for (const [name, field] of Object.entries(node.fields)) {
            serialized.fields[name] = Array.isArray(field) ? field : [field, null];
        }
        for (const [name, input] of Object.entries(node.inputs)) {
            if (Array.isArray(input)) {
                const first = this._chain(input, id, false);
                if (first) serialized.inputs[name] = [2, first];
            } else if (isBlock(input)) {
                serialized.inputs[name] = [input.shadow ? 1 : 2, this._add(input, id, false)];
            } else {
                serialized.inputs[name] = [1, [10, String(input)]];
            }
        }
        return id;
    }

    _chain (nodes, parentId, topLevel) {
        let firstId = null;
        let previousId = null;
        for (const node of nodes) {
            const id = this._add(node, previousId || parentId, topLevel && previousId === null);
            if (previousId) {
                this.blocks[previousId].next = id;
            } else {
                firstId = id;
            }
            previousId = id;
        }
        return firstId;
    }

    /**
     * Add a script.
     * @param {Array<object>} nodes The blocks of the script, top first.
     * @returns {string} ID of the top block.
     */
    script (nodes) {
        return this._chain(nodes, null, true);
    }

    /**
     * Add a custom block.
     * @param {string} proccode The custom block's text with %s and %b for inputs, like "add %s to %s".
     * @param {Array<string>} names A name for each input.
     * @param {Array<object>} body The blocks under the definition.
     * @param {object} [options] Options.
     * @param {boolean} [options.warp] True to run without screen refresh.
     * @returns {{call: Function, report: Function}} call(...args) makes a block that calls the custom
     * block, and report(...args) makes one that can be used as an input to read what it returns.
     */
    define (proccode, names, body, {warp = false} = {}) {
        const ids = names.map(() => uid('arg'));
        const kinds = (proccode.match(/%[sbn]/g) || []).map(placeholder => placeholder[1]);
        const callMutation = {
            proccode,
            argumentids: JSON.stringify(ids),
            warp: String(warp)
        };
        const prototype = block('procedures_prototype', {}, {}, Object.assign({
            argumentnames: JSON.stringify(names),
            argumentdefaults: JSON.stringify(kinds.map(kind => (kind === 'b' ? 'false' : '')))
        }, callMutation));
        prototype.shadow = true;
        names.forEach((name, i) => {
            const reporter = block(
                kinds[i] === 'b' ? 'argument_reporter_boolean' : 'argument_reporter_string_number',
                {},
                {VALUE: name}
            );
            reporter.shadow = true;
            prototype.inputs[ids[i]] = reporter;
        });
        this.script([block('procedures_definition', {custom_block: prototype}), ...body]);

        const makeCall = (args, extraMutation) => {
            const inputs = {};
            args.forEach((arg, i) => {
                inputs[ids[i]] = arg;
            });
            return block('procedures_call', inputs, {}, Object.assign({}, callMutation, extraMutation));
        };
        return {
            call: (...args) => makeCall(args, {}),
            report: (...args) => makeCall(args, {return: '1'})
        };
    }

    toJSON (layerOrder) {
        const common = {
            isStage: this.isStage,
            name: this.name,
            variables: this.variables,
            lists: this.lists,
            broadcasts: {},
            blocks: this.blocks,
            comments: {},
            currentCostume: 0,
            costumes: [],
            sounds: [],
            volume: 100,
            layerOrder
        };
        if (this.isStage) {
            return Object.assign(common, {
                tempo: 60,
                videoTransparency: 50,
                videoState: 'on',
                textToSpeechLanguage: null
            });
        }
        return Object.assign(common, {
            visible: true,
            x: 0,
            y: 0,
            size: 100,
            direction: 90,
            draggable: false,
            rotationStyle: 'all around'
        });
    }
}

/**
 * A whole project. The stage is made for you and is at project.stage.
 */
class ProjectBuilder {
    constructor () {
        this.stage = new TargetBuilder('Stage', true);
        this.sprites = [];
        this.extensions = [];
        this.extensionStorage = {};
    }

    /**
     * Turn type annotations on, the way a project saved with the Types extension has them.
     * @returns {ProjectBuilder} this
     */
    withTypes () {
        this.extensions.push('astroTypes');
        this.extensionStorage.astroTypes = {annotations: true};
        return this;
    }

    /**
     * @param {string} name Sprite name.
     * @returns {TargetBuilder} The new sprite.
     */
    sprite (name) {
        const sprite = new TargetBuilder(name);
        this.sprites.push(sprite);
        return sprite;
    }

    toJSON () {
        return {
            targets: [this.stage, ...this.sprites].map((target, i) => target.toJSON(i)),
            monitors: [],
            extensions: this.extensions,
            extensionStorage: this.extensionStorage,
            meta: {
                semver: '3.0.0',
                vm: '0.2.0',
                agent: ''
            }
        };
    }
}

// Shorthand for the blocks nearly every test needs.
const blocks = {
    whenFlagClicked: () => block('event_whenflagclicked'),
    variable: field => block('data_variable', {}, {VARIABLE: field}),
    setVariable: (field, value) => block('data_setvariableto', {VALUE: value}, {VARIABLE: field}),
    changeVariable: (field, value) => block('data_changevariableby', {VALUE: value}, {VARIABLE: field}),
    addToList: (field, item) => block('data_addtolist', {ITEM: item}, {LIST: field}),
    argument: name => block('argument_reporter_string_number', {}, {VALUE: name}),
    booleanArgument: name => block('argument_reporter_boolean', {}, {VALUE: name}),
    return: value => block('procedures_return', {VALUE: value}),
    add: (a, b) => block('operator_add', {NUM1: a, NUM2: b}),
    subtract: (a, b) => block('operator_subtract', {NUM1: a, NUM2: b}),
    multiply: (a, b) => block('operator_multiply', {NUM1: a, NUM2: b}),
    join: (a, b) => block('operator_join', {STRING1: a, STRING2: b}),
    equals: (a, b) => block('operator_equals', {OPERAND1: a, OPERAND2: b}),
    lessThan: (a, b) => block('operator_lt', {OPERAND1: a, OPERAND2: b}),
    greaterThan: (a, b) => block('operator_gt', {OPERAND1: a, OPERAND2: b}),
    not: operand => block('operator_not', {OPERAND: operand}),
    if: (condition, substack) => block('control_if', {CONDITION: condition, SUBSTACK: substack}),
    ifElse: (condition, substack, substack2) => block('control_if_else', {
        CONDITION: condition,
        SUBSTACK: substack,
        SUBSTACK2: substack2
    }),
    repeat: (times, substack) => block('control_repeat', {TIMES: times, SUBSTACK: substack}),
    wait: seconds => block('control_wait', {DURATION: seconds}),
    stopThisScript: () => block('control_stop', {}, {STOP_OPTION: 'this script'}, {hasnext: 'false'}),
    setX: x => block('motion_setx', {X: x}),
    xPosition: () => block('motion_xposition')
};

/**
 * Load a built project into a VM.
 * @param {VirtualMachine} vm The VM.
 * @param {ProjectBuilder} project The project.
 * @returns {Promise<void>} Resolves when the project is loaded.
 */
const load = (vm, project) => vm.loadProject(JSON.stringify(project.toJSON()));

/**
 * Run the same test with the compiler off and on.
 * @param {Function} test tap's test().
 * @param {string} name Test name.
 * @param {Function} callback Called with (t, compilerOptions).
 */
const compilerAndInterpreter = (test, name, callback) => {
    test(`${name} - interpreted`, t => callback(t, {enabled: false}));
    test(`${name} - compiled`, t => callback(t, {enabled: true}));
};

/**
 * Step the runtime until a condition holds, letting promises settle between steps.
 * @param {VirtualMachine} vm The VM.
 * @param {Function} isDone Returns true when the wait is over.
 * @param {number} [maxSteps] Give up after this many steps.
 * @returns {Promise<boolean>} True if the condition held, false if the steps ran out.
 */
const stepUntil = async (vm, isDone, maxSteps = 200) => {
    for (let i = 0; i < maxSteps; i++) {
        if (isDone()) return true;
        vm.runtime._step();
        await new Promise(resolve => setImmediate(resolve));
    }
    return isDone();
};

module.exports = {
    ProjectBuilder,
    TargetBuilder,
    block,
    blocks,
    load,
    compilerAndInterpreter,
    stepUntil
};
