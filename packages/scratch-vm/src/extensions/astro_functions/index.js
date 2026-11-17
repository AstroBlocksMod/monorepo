// astro: First-class functions. See astro/functions.js for how they work.

const formatMessage = require('format-message');
const BlockType = require('../../extension-support/block-type');
const ArgumentType = require('../../extension-support/argument-type');
const Cast = require('../../util/cast');
const Variable = require('../../engine/variable');
const ObjectService = require('../../astro/objects');
const Functions = require('../../astro/functions');

const EXTENSION_ID = 'astroFunctions';

// Icon made for AstroBlocks: an arrow from one dot to another, a value going in and one coming out.
const iconSVG = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
    '<circle cx="20" cy="20" r="20" fill="#ad1457"/>' +
    '<circle cx="10.5" cy="20" r="3.5" fill="#fff"/>' +
    '<path d="M17 20h11m-4.5-5l5 5-5 5" fill="none" stroke="#fff" stroke-width="3" ' +
    'stroke-linecap="round" stroke-linejoin="round"/></svg>';
const iconURI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(iconSVG)}`;

/**
 * astro: Blocks that make functions, call them, and use them on lists.
 */
class AstroFunctions {
    constructor (runtime) {
        /**
         * The runtime instantiating this block package.
         * @type {Runtime}
         */
        this.runtime = runtime;

        // "function" can be used as a type: "on done: function".
        runtime.astroTypeSources.push({
            resolve: name => (name === Functions.FUNCTION_TYPE.name ? Functions.FUNCTION_TYPE : null),
            names: () => [Functions.FUNCTION_TYPE.name]
        });
    }

    /**
     * @returns {object} metadata for this extension and its blocks.
     */
    getInfo () {
        const functionArgument = {
            type: ArgumentType.STRING,
            defaultValue: ''
        };
        const valueArgument = {
            type: ArgumentType.STRING,
            defaultValue: ''
        };
        const listArgument = {
            type: ArgumentType.STRING,
            menu: 'LIST_MENU'
        };
        return {
            id: EXTENSION_ID,
            name: formatMessage({
                id: 'astro_functions.name',
                default: 'Functions',
                description: 'Name of the extension that adds functions as values.'
            }),
            color1: '#ad1457',
            color2: '#931049',
            color3: '#790d3c',
            menuIconURI: iconURI,
            blocks: [
                {
                    opcode: 'lambda',
                    text: formatMessage({
                        id: 'astro_functions.blocks.lambda',
                        default: 'function [EXPRESSION]',
                        description: 'Block that makes a function out of the blocks in its slot.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        [Functions.LAMBDA_INPUT]: valueArgument
                    }
                },
                {
                    opcode: 'input',
                    text: formatMessage({
                        id: 'astro_functions.blocks.input',
                        default: 'input [NUMBER]',
                        description: 'Block that gives one of the values a function was called with.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        NUMBER: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 1
                        }
                    }
                },
                {
                    opcode: 'fromBlock',
                    text: formatMessage({
                        id: 'astro_functions.blocks.fromBlock',
                        default: 'function from my block [BLOCK]',
                        description: 'Block that makes a function that calls one of the sprite\'s custom blocks.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {
                        BLOCK: {
                            type: ArgumentType.STRING,
                            menu: 'BLOCK_MENU'
                        }
                    }
                },
                '---',
                {
                    opcode: 'call0',
                    text: formatMessage({
                        id: 'astro_functions.blocks.call0',
                        default: 'call [FUNCTION]',
                        description: 'Block that calls a function and gives what it returned.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {FUNCTION: functionArgument}
                },
                {
                    opcode: 'call1',
                    text: formatMessage({
                        id: 'astro_functions.blocks.call1',
                        default: 'call [FUNCTION] with [A]',
                        description: 'Block that calls a function with one input and gives what it returned.'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {FUNCTION: functionArgument, A: valueArgument}
                },
                {
                    opcode: 'call2',
                    text: formatMessage({
                        id: 'astro_functions.blocks.call2',
                        default: 'call [FUNCTION] with [A] [B]',
                        description: 'Block that calls a function with two inputs and gives what it returned.'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {FUNCTION: functionArgument, A: valueArgument, B: valueArgument}
                },
                {
                    opcode: 'run0',
                    text: formatMessage({
                        id: 'astro_functions.blocks.run0',
                        default: 'run [FUNCTION]',
                        description: 'Block that calls a function and ignores what it returned.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {FUNCTION: functionArgument}
                },
                {
                    opcode: 'run1',
                    text: formatMessage({
                        id: 'astro_functions.blocks.run1',
                        default: 'run [FUNCTION] with [A]',
                        description: 'Block that calls a function with one input and ignores what it returned.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {FUNCTION: functionArgument, A: valueArgument}
                },
                '---',
                {
                    opcode: 'bind',
                    text: formatMessage({
                        id: 'astro_functions.blocks.bind',
                        default: '[FUNCTION] with first input [VALUE]',
                        description: 'Block that makes a function out of another by fixing its first input.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {FUNCTION: functionArgument, VALUE: valueArgument}
                },
                {
                    opcode: 'compose',
                    text: formatMessage({
                        id: 'astro_functions.blocks.compose',
                        default: '[FIRST] then [SECOND]',
                        description: 'Block that makes a function that passes what one function returns to another.'
                    }),
                    blockType: BlockType.REPORTER,
                    disableMonitor: true,
                    arguments: {FIRST: functionArgument, SECOND: functionArgument}
                },
                {
                    opcode: 'isFunction',
                    text: formatMessage({
                        id: 'astro_functions.blocks.isFunction',
                        default: '[VALUE] is a function?',
                        description: 'Block that checks whether a value is a function.'
                    }),
                    blockType: BlockType.BOOLEAN,
                    arguments: {VALUE: valueArgument}
                },
                '---',
                {
                    opcode: 'map',
                    text: formatMessage({
                        id: 'astro_functions.blocks.map',
                        default: 'replace each item of [LIST] with [FUNCTION] of it',
                        description: 'Block that replaces every item of a list with what a function returns for it.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {LIST: listArgument, FUNCTION: functionArgument}
                },
                {
                    opcode: 'filter',
                    text: formatMessage({
                        id: 'astro_functions.blocks.filter',
                        default: 'keep the items of [LIST] where [FUNCTION]',
                        description: 'Block that removes the items of a list for which a function does not return true.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {LIST: listArgument, FUNCTION: functionArgument}
                },
                {
                    opcode: 'forEach',
                    text: formatMessage({
                        id: 'astro_functions.blocks.forEach',
                        default: 'for each item of [LIST] run [FUNCTION]',
                        description: 'Block that calls a function once for every item of a list.'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {LIST: listArgument, FUNCTION: functionArgument}
                },
                {
                    opcode: 'reduce',
                    text: formatMessage({
                        id: 'astro_functions.blocks.reduce',
                        default: 'combine the items of [LIST] with [FUNCTION] starting at [START]',
                        description: 'Block that folds a list into one value with a function of two inputs.'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        LIST: listArgument,
                        FUNCTION: functionArgument,
                        START: {
                            type: ArgumentType.STRING,
                            defaultValue: '0'
                        }
                    }
                }
            ],
            menus: {
                BLOCK_MENU: {
                    acceptReporters: false,
                    items: 'getBlockMenu'
                },
                LIST_MENU: {
                    acceptReporters: true,
                    items: 'getListMenu'
                }
            }
        };
    }

    getBlockMenu (targetId) {
        const target = this.runtime.getTargetById(targetId);
        const description = target ? ObjectService.describeClass(target.sprite) : null;
        const methods = description ? description.methods : [];
        if (methods.length === 0) return [{text: '', value: ''}];
        return methods.map(method => ({
            text: ObjectService.readableProcedureCode(method.procedureCode),
            value: method.procedureCode
        }));
    }

    getListMenu (targetId) {
        const names = [];
        const collect = target => {
            if (!target) return;
            for (const variable of Object.values(target.variables)) {
                if (variable.type === Variable.LIST_TYPE && !names.includes(variable.name)) {
                    names.push(variable.name);
                }
            }
        };
        collect(this.runtime.getTargetById(targetId));
        collect(this.runtime.getTargetForStage());
        return names.length > 0 ? names : [''];
    }

    /**
     * @param {*} name A list name.
     * @param {object} util The block utility.
     * @returns {?Variable} The list by that name that the running sprite can see.
     */
    _listNamed (name, util) {
        return util.target.lookupVariableByNameAndType(Cast.toString(name), Variable.LIST_TYPE) || null;
    }

    lambda (args, util) {
        // Neither engine works the slot out before running this block (see lazyInputsOf()), so
        // all there is to do is find the block that is in it.
        const thread = util.thread;
        const frame = thread.peekStackFrame();
        // A compiled thread keeps the ID of the running block on its stack. The interpreter keeps
        // the block itself on the stack frame.
        const ownId = thread.isCompiled ? thread.stack[0] : (frame && frame.op && frame.op.id);
        const blocks = util.target.blocks;
        const own = blocks.getBlock(ownId);
        const slot = own && own.inputs[Functions.LAMBDA_INPUT];
        const expression = slot && blocks.getBlock(slot.block);
        if (!expression) {
            return Functions.constantFunction('');
        }
        if (expression.shadow) {
            // Only what was typed into the slot.
            const fields = Object.values(expression.fields);
            return Functions.constantFunction(fields.length > 0 ? fields[0].value : '');
        }
        return Functions.expressionFunction(util.target, expression.id);
    }

    input ({NUMBER}, util) {
        const call = util.thread.astroCall;
        const index = Math.round(Cast.toNumber(NUMBER)) - 1;
        if (!call || index < 0 || index >= call.values.length) return '';
        return call.values[index];
    }

    fromBlock ({BLOCK}, util) {
        return Functions.procedureFunction(util.target, Cast.toString(BLOCK));
    }

    call0 ({FUNCTION}, util) {
        return Functions.callFunction(FUNCTION, [], util);
    }

    call1 ({FUNCTION, A}, util) {
        return Functions.callFunction(FUNCTION, [A], util);
    }

    call2 ({FUNCTION, A, B}, util) {
        return Functions.callFunction(FUNCTION, [A, B], util);
    }

    run0 ({FUNCTION}, util) {
        return Functions.then(Functions.callFunction(FUNCTION, [], util), () => {});
    }

    run1 ({FUNCTION, A}, util) {
        return Functions.then(Functions.callFunction(FUNCTION, [A], util), () => {});
    }

    bind ({FUNCTION, VALUE}) {
        return Functions.boundFunction(FUNCTION, [VALUE]);
    }

    compose ({FIRST, SECOND}) {
        return Functions.composedFunction(FIRST, SECOND);
    }

    isFunction ({VALUE}) {
        return VALUE instanceof Functions.FunctionReference;
    }

    // The list blocks work on a copy of the list and put the result back at the end, so that a
    // function that waits or changes the list does not trip them up. A function is called with the
    // item and its position.

    map ({LIST, FUNCTION}, util) {
        const list = this._listNamed(LIST, util);
        if (!list) return;
        const results = [];
        const done = Functions.forEachCall(
            list.value.slice(),
            (item, i) => Functions.callFunction(FUNCTION, [item, i + 1], util),
            result => {
                results.push(result);
                return false;
            }
        );
        return Functions.then(done, () => {
            list.value = results;
            list._monitorUpToDate = false;
        });
    }

    filter ({LIST, FUNCTION}, util) {
        const list = this._listNamed(LIST, util);
        if (!list) return;
        const kept = [];
        const done = Functions.forEachCall(
            list.value.slice(),
            (item, i) => Functions.callFunction(FUNCTION, [item, i + 1], util),
            (result, item) => {
                if (Cast.toBoolean(result)) kept.push(item);
                return false;
            }
        );
        return Functions.then(done, () => {
            list.value = kept;
            list._monitorUpToDate = false;
        });
    }

    forEach ({LIST, FUNCTION}, util) {
        const list = this._listNamed(LIST, util);
        if (!list) return;
        const done = Functions.forEachCall(
            list.value.slice(),
            (item, i) => Functions.callFunction(FUNCTION, [item, i + 1], util),
            () => false
        );
        return Functions.then(done, () => {});
    }

    reduce ({LIST, FUNCTION, START}, util) {
        const list = this._listNamed(LIST, util);
        let combined = START;
        if (!list) return combined;
        const done = Functions.forEachCall(
            list.value.slice(),
            (item, i) => Functions.callFunction(FUNCTION, [combined, item, i + 1], util),
            result => {
                combined = result;
                return false;
            }
        );
        return Functions.then(done, () => combined);
    }
}

module.exports = AstroFunctions;
