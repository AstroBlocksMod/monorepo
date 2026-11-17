/**
 * @fileoverview
 * Call a custom block on a target from outside that target's scripts, and get its return value.
 *
 * A custom block normally runs inside the script that calls it. Calling a method of another object means
 * running one sprite's custom block from another sprite's script, against a particular instance. That is
 * done here by giving each call a thread of its own on the target, entered through the custom block's
 * definition. The thread belongs to the call, so everything inside the custom block (motion, variables,
 * "stop this script", further custom blocks) sees the target it is running on, in the compiler and in the
 * interpreter alike.
 *
 * When the thread is compiled it is run on the spot, inside the caller's step, and a custom block that
 * never waits finishes before this returns. Otherwise (the custom block waits, the thread could not be
 * compiled, or the calls are nested too deep) the thread joins the runtime's thread list like any other
 * and the caller is given a promise.
 */

const Thread = require('../engine/thread');
const compilerExecute = require('../compiler/jsexecute');
const {IntermediateScript, IntermediateStack} = require('../compiler/intermediate');

/**
 * Calls run inside calls on the JavaScript stack. Past this depth they are queued as ordinary threads
 * instead, which keeps deep recursion from overflowing the stack at the cost of a frame per call.
 */
const MAX_NESTED_CALLS = 64;

/**
 * ID of the stack entry beneath a called procedure. No block has it, so the interpreter finds nothing
 * to run once the procedure pops off the stack, and ends the thread.
 */
const CALL_BLOCK_ID = 'astro:call';

const GeneratorFunction = Object.getPrototypeOf(function* () {}).constructor;

/**
 * How many calls are running on the JavaScript stack right now. Module level because the JavaScript
 * stack is shared by every runtime.
 */
let nestedCalls = 0;

/**
 * Calls that are waiting on a thread in the runtime's thread list, per runtime.
 * @type {WeakMap<object, Set<{thread: Thread, call: object, resolve: Function}>>}
 */
const waitingCalls = new WeakMap();

const isFinished = thread => (
    thread.status === Thread.STATUS_DONE ||
    thread.stack.length === 0 ||
    thread.isKilled
);

/**
 * @param {object} definitionBlock A procedures_definition block.
 * @param {import('../engine/blocks')} blocks The blocks the definition is in.
 * @returns {boolean} True if the custom block runs without screen refresh.
 */
const isWarpDefinition = (definitionBlock, blocks) => {
    const prototypeInput = definitionBlock.inputs && definitionBlock.inputs.custom_block;
    const prototypeBlock = prototypeInput && blocks.getBlock(prototypeInput.block);
    const warp = prototypeBlock && prototypeBlock.mutation && prototypeBlock.mutation.warp;
    if (typeof warp === 'boolean') return warp;
    if (typeof warp === 'string') {
        try {
            return !!JSON.parse(warp);
        } catch (e) {
            return false;
        }
    }
    return false;
};

/**
 * Stand in for the generator of a compiled thread, so that the sequencer can step a thread that runs one
 * procedure and keeps what it returns.
 * @param {Thread} thread The thread of the call.
 * @param {Function} procedure The compiled procedure, already bound to the thread.
 * @param {object} call The call record, which receives the return value.
 * @returns {{next: Function}} An object the sequencer can use as thread.generator.
 */
const createCallGenerator = (thread, procedure, call) => {
    let running = null;
    const finish = value => {
        call.value = typeof value === 'undefined' ? '' : value;
        thread.target.runtime.sequencer.retireThread(thread);
    };
    return {
        next () {
            if (running === null) {
                const returned = procedure(...call.values);
                // A procedure that can never wait is compiled to a plain function and is done already.
                if (!(procedure instanceof GeneratorFunction)) {
                    finish(returned);
                    return;
                }
                running = returned;
            }
            const step = running.next();
            if (step.done) {
                finish(step.value);
            }
        }
    };
};

/**
 * Compile the procedure for the thread's target and point the thread at it.
 * Leaves thread.isCompiled false if the procedure cannot be compiled.
 * @param {Thread} thread The thread of the call.
 * @param {string} procedureCode The procedure's proccode.
 * @param {boolean} isWarp True if the procedure runs without screen refresh.
 * @param {object} call The call record.
 */
const compileCall = (thread, procedureCode, isWarp, call) => {
    // Same naming as generateProcedureVariant() in compiler/irgen.js.
    const variant = `${isWarp ? 'W' : 'Z'}${procedureCode}`;
    const blocks = thread.blockContainer;

    // The entry script does nothing but depend on the procedure, so that the compiler builds it and
    // everything it calls. See the astro hook in IRGenerator.generate().
    thread.astroEntry = {
        generate: topBlockId => {
            blocks.populateProcedureCache();
            const script = new IntermediateScript();
            script.topBlockId = topBlockId;
            script.stack = new IntermediateStack();
            script.dependedProcedures.push(variant);
            return script;
        }
    };
    thread.tryCompile();
    if (!thread.isCompiled) return;

    const procedure = thread.procedures[variant];
    if (typeof procedure !== 'function') {
        thread.isCompiled = false;
        return;
    }
    thread.generator = createCallGenerator(thread, procedure, call);
};

/**
 * Run a compiled thread now, inside whatever thread is currently being stepped.
 * @param {Thread} thread The thread to step.
 * @param {?import('../engine/block-utility')} util The block utility of the block making the call, if any.
 */
const stepNested = (thread, util) => {
    const sequencer = thread.target.runtime.sequencer;
    const outerThread = sequencer.activeThread;
    const utilThread = util ? util.thread : null;
    const utilSequencer = util ? util.sequencer : null;

    compilerExecute.saveGlobalState();
    sequencer.activeThread = thread;
    nestedCalls++;
    try {
        sequencer.stepThread(thread);
    } finally {
        nestedCalls--;
        sequencer.activeThread = outerThread;
        compilerExecute.restoreGlobalState();
        // The block utility is shared, and blocks in the nested thread have pointed it at that thread.
        if (util) {
            util.thread = utilThread;
            util.sequencer = utilSequencer;
        }
    }
};

/**
 * @param {Thread} thread A thread in the runtime's thread list.
 * @param {object} call The call record.
 * @returns {Promise<*>} Resolves to what the call returned once the thread is finished.
 */
const waitForThread = (thread, call) => {
    const runtime = thread.target.runtime;
    let waiting = waitingCalls.get(runtime);
    if (!waiting) {
        waiting = new Set();
        waitingCalls.set(runtime, waiting);
        runtime.on('AFTER_EXECUTE', () => {
            for (const entry of waiting) {
                if (isFinished(entry.thread)) {
                    waiting.delete(entry);
                    entry.resolve(entry.call.value);
                }
            }
        });
    }
    return new Promise(resolve => {
        waiting.add({thread, call, resolve});
    });
};

/**
 * Run the thread of a call: on the spot if it is compiled, as far as it gets without waiting, and
 * otherwise or after that as one of the runtime's threads.
 * @param {Thread} thread The thread of the call, ready to step.
 * @param {object} call The call record.
 * @param {?import('../engine/block-utility')} util The block utility of the block making the call, if any.
 * @returns {*|Promise<*>} What the call returned, or a promise for it if the thread is not done yet.
 */
const runThread = (thread, call, util) => {
    if (thread.isCompiled && nestedCalls < MAX_NESTED_CALLS) {
        stepNested(thread, util);
        if (isFinished(thread)) {
            return call.value;
        }
    }
    thread.target.runtime.threads.push(thread);
    return waitForThread(thread, call);
};

/**
 * Call a custom block on a target.
 * @param {import('../engine/target')} target The target to run the custom block on.
 * @param {string} procedureCode The custom block's proccode, like "take damage %s".
 * @param {Array<*>} args Values for the custom block's inputs, in order. Missing ones get their defaults.
 * @param {?import('../engine/block-utility')} [util] The block utility of the block making the call. Pass
 * it whenever the call is made from a block.
 * @returns {*|Promise<*>} What the custom block returned ('' if nothing), or a promise for it if the
 * custom block had to wait. A target that has no such custom block returns ''.
 */
const callProcedure = (target, procedureCode, args, util) => {
    const runtime = target.runtime;
    const blocks = target.blocks;

    const definitionId = blocks.getProcedureDefinition(procedureCode);
    const definitionBlock = definitionId && blocks.getBlock(definitionId);
    const parameters = blocks.getProcedureParamNamesIdsAndDefaults(procedureCode);
    if (!definitionBlock || !parameters) {
        return '';
    }
    const [names, _ids, defaults] = parameters;
    const isWarp = isWarpDefinition(definitionBlock, blocks);

    const call = {
        values: names.map((_name, i) => (i < args.length ? args[i] : defaults[i])),
        value: ''
    };

    const thread = new Thread(definitionId);
    thread.target = target;
    thread.blockContainer = blocks;
    thread.astroCall = call;
    thread.pushStack(definitionId);

    if (runtime.compilerOptions.enabled) {
        compileCall(thread, procedureCode, isWarp, call);
    }
    if (!thread.isCompiled) {
        // The interpreter keeps a procedure's inputs on the stack frame beneath it, which for an
        // ordinary call is the frame of the calling block. Here that frame belongs to a block that
        // does not exist. A compiled thread must not have it: it keeps one entry on its stack.
        thread.popStack();
        thread.pushStack(CALL_BLOCK_ID);
        const callFrame = thread.peekStackFrame();
        callFrame.warpMode = isWarp;
        callFrame.params = {};
        names.forEach((name, i) => {
            callFrame.params[name] = call.values[i];
        });
        // Thread.isRecursiveCall() reads the block each frame last ran. Point it at a block that exists.
        callFrame.op = {id: definitionId};
        thread.pushStack(definitionId);
    }

    return runThread(thread, call, util);
};

module.exports = {
    callProcedure,
    MAX_NESTED_CALLS
};
