/**
 * @fileoverview
 * First-class functions.
 *
 * A function is a reference value (see reference.js) that can be called. There are four ways to get one:
 *
 * - From an expression. "function ((input 1) * 2)" is the reporter in the slot, to be worked out each
 *   time the function is called. The function remembers which sprite or instance made it, and the
 *   expression runs there, so the variables it reads are that one's. The slot is not worked out when
 *   the function is made: both engines are told to leave it alone (lazyInputsOf()).
 * - From a custom block, which is then called with the function's inputs.
 * - From another function with its first inputs already filled in.
 * - From two functions, the second taking what the first returns.
 *
 * Calling goes through call.js, so a function that never waits is done on the spot when compiled.
 */

const Reference = require('./reference');
const {callProcedure, callReporter} = require('./call');
const {InputType} = require('../compiler/enums');

/** Opcode of the block that makes a function from the expression in its slot. */
const LAMBDA_OPCODE = 'astroFunctions_lambda';

/** Name of that block's slot. */
const LAMBDA_INPUT = 'EXPRESSION';

const NO_INPUTS = [];
const LAMBDA_LAZY_INPUTS = [LAMBDA_INPUT];

const isPromise = value => (
    value !== null &&
    typeof value === 'object' &&
    typeof value.then === 'function'
);

/**
 * Do something with a value that may still be on its way.
 * @param {*|Promise<*>} value A value or a promise for one.
 * @param {function(*): *} next What to do with the value.
 * @returns {*|Promise<*>} What next returned, or a promise for it.
 */
const then = (value, next) => (isPromise(value) ? value.then(next) : next(value));

/**
 * A function, as a value.
 */
class FunctionReference extends Reference {
    /**
     * @param {function(Array<*>, ?object): *} run Calls the function with input values and the block
     * utility of the calling block. May return a promise.
     */
    constructor (run) {
        super(Reference.createLabel('function'));
        this.run = run;
    }

    get typeName () {
        return 'function';
    }
}

/**
 * @param {import('../engine/target')} target A target.
 * @returns {boolean} False if the target has been deleted.
 */
const isTargetAlive = target => {
    const objects = target.runtime.astroObjects;
    if (objects) return objects.referenceFor(target).isAlive;
    return target.sprite.clones.includes(target);
};

/**
 * @param {*} value The value a function always returns.
 * @returns {FunctionReference} A function that takes no notice of its inputs.
 */
const constantFunction = value => new FunctionReference(() => value);

/**
 * @param {import('../engine/target')} target The sprite or instance the expression belongs to.
 * @param {string} blockId ID of the reporter block that is the expression.
 * @returns {FunctionReference} A function that works the expression out on the target.
 */
const expressionFunction = (target, blockId) => new FunctionReference((args, util) => (
    isTargetAlive(target) ? callReporter(target, blockId, args, util) : ''
));

/**
 * @param {import('../engine/target')} target The sprite or instance whose custom block it is.
 * @param {string} procedureCode The custom block's proccode.
 * @returns {FunctionReference} A function that calls the custom block on the target.
 */
const procedureFunction = (target, procedureCode) => new FunctionReference((args, util) => (
    isTargetAlive(target) ? callProcedure(target, procedureCode, args, util) : ''
));

/**
 * Call a value as a function.
 * @param {*} value A function. Anything else returns ''.
 * @param {Array<*>} args Input values.
 * @param {?object} util The block utility of the calling block.
 * @returns {*|Promise<*>} What the function returned, or a promise for it if it had to wait.
 */
const callFunction = (value, args, util) => (
    value instanceof FunctionReference ? value.run(args, util) : ''
);

/**
 * @param {*} value A function.
 * @param {Array<*>} firstArgs Values for its first inputs.
 * @returns {FunctionReference} A function that takes the rest of the inputs.
 */
const boundFunction = (value, firstArgs) => new FunctionReference((args, util) => (
    callFunction(value, firstArgs.concat(args), util)
));

/**
 * @param {*} first A function.
 * @param {*} second A function of one input.
 * @returns {FunctionReference} A function that calls the first and gives what it returns to the second.
 */
const composedFunction = (first, second) => new FunctionReference((args, util) => (
    then(callFunction(first, args, util), result => callFunction(second, [result], util))
));

/**
 * Call a function once for each item, one after the other, waiting whenever a call has to.
 * @param {Array<*>} items The items.
 * @param {function(*, number): (*|Promise<*>)} callItem Calls the function for an item.
 * @param {function(*, *, number): boolean} onResult Given what each call returned, the item and its
 * index. Returning true stops early.
 * @returns {?Promise<null>} A promise if any call had to wait, otherwise null.
 */
const forEachCall = (items, callItem, onResult) => {
    const from = start => {
        for (let i = start; i < items.length; i++) {
            const result = callItem(items[i], i);
            if (isPromise(result)) {
                return result.then(value => (onResult(value, items[i], i) ? null : from(i + 1)));
            }
            if (onResult(result, items[i], i)) break;
        }
        return null;
    };
    return from(0);
};

/**
 * Tell an engine which of a block's inputs it must not work out before running the block, because the
 * block does that itself, when and as often as it needs to.
 * @param {string} opcode A block's opcode.
 * @returns {Array<string>} Names of such inputs. Empty for nearly every block.
 */
const lazyInputsOf = opcode => (opcode === LAMBDA_OPCODE ? LAMBDA_LAZY_INPUTS : NO_INPUTS);

/**
 * The type "function", for annotations like "on done: function".
 * A variable of this type holds a function or nothing.
 * @type {import('./types').AstroType}
 */
const FUNCTION_TYPE = {
    name: 'function',
    inputType: InputType.ANY,
    accepts: value => value instanceof FunctionReference,
    coerce: value => (value instanceof FunctionReference ? value : ''),
    zero: ''
};

module.exports = {
    FunctionReference,
    LAMBDA_OPCODE,
    LAMBDA_INPUT,
    FUNCTION_TYPE,
    constantFunction,
    expressionFunction,
    procedureFunction,
    boundFunction,
    composedFunction,
    callFunction,
    forEachCall,
    lazyInputsOf,
    then,
    isPromise
};
