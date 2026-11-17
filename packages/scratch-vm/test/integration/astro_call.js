const {test} = require('tap');
const VM = require('../../src/virtual-machine');
const BlockType = require('../../src/extension-support/block-type');
const ArgumentType = require('../../src/extension-support/argument-type');
const {callProcedure, MAX_NESTED_CALLS} = require('../../src/astro/call');
const {
    ProjectBuilder,
    block,
    blocks,
    load,
    compilerAndInterpreter,
    stepUntil
} = require('../fixtures/astro/project');

/**
 * Blocks that let a test project call a custom block of another sprite and record values.
 * @param {Array<*>} logged Receives each value given to the "log" block.
 * @returns {Function} The extension class.
 */
const createTestExtension = logged => class TestExtension {
    getInfo () {
        return {
            id: 'astrotest',
            name: 'Astro Test',
            blocks: [
                {
                    opcode: 'log',
                    blockType: BlockType.COMMAND,
                    text: 'log [VALUE]',
                    arguments: {VALUE: {type: ArgumentType.STRING}}
                },
                {
                    opcode: 'call',
                    blockType: BlockType.REPORTER,
                    text: 'call [NAME] on [SPRITE] with [A]',
                    arguments: {
                        NAME: {type: ArgumentType.STRING},
                        SPRITE: {type: ArgumentType.STRING},
                        A: {type: ArgumentType.STRING}
                    }
                }
            ]
        };
    }
    log ({VALUE}) {
        logged.push(VALUE);
    }
    call ({NAME, SPRITE, A}, util) {
        const target = util.runtime.getSpriteTargetByName(SPRITE);
        return callProcedure(target, NAME, typeof A === 'undefined' ? [] : [A], util);
    }
};

const callOn = (sprite, name, a) => {
    const inputs = {NAME: name, SPRITE: sprite};
    if (typeof a !== 'undefined') inputs.A = a;
    return block('astrotest_call', inputs);
};
const log = value => block('astrotest_log', {VALUE: value});

const setup = async (compilerOptions, build) => {
    const vm = new VM();
    vm.setCompilerOptions(compilerOptions);
    const extension = {logged: []};
    vm.extensionManager.addBuiltinExtension('astrotest', createTestExtension(extension.logged));
    const project = new ProjectBuilder();
    build(project);
    await load(vm, project);
    return {vm, extension};
};

compilerAndInterpreter(test, 'a custom block called on another sprite runs on that sprite', async (t, co) => {
    const {vm, extension} = await setup(co, project => {
        const counter = project.sprite('Counter');
        const total = counter.variable('total', 10);
        counter.define('add %s', ['amount'], [
            blocks.changeVariable(total, blocks.argument('amount')),
            blocks.setX(blocks.variable(total)),
            blocks.return(blocks.variable(total))
        ]);
        counter.define('label %s', ['text'], [
            blocks.return(blocks.join(blocks.argument('text'), '!'))
        ]);
        counter.define('quiet', [], [
            blocks.changeVariable(total, 100),
            blocks.stopThisScript(),
            blocks.changeVariable(total, 1000)
        ]);

        project.stage.script([
            blocks.whenFlagClicked(),
            log(callOn('Counter', 'add %s', 5)),
            log(blocks.add(callOn('Counter', 'add %s', 1), callOn('Counter', 'add %s', 2))),
            log(callOn('Counter', 'label %s')),
            log(callOn('Counter', 'quiet')),
            log(callOn('Counter', 'no such block %s', 1)),
            log('end')
        ]);
    });

    vm.greenFlag();
    t.ok(await stepUntil(vm, () => extension.logged.includes('end')), 'script finished');

    // 15, then (16 + 18), then the default for a missing input, then two calls that return nothing.
    t.same(extension.logged.map(String), ['15', '34', '!', '', '', 'end']);
    const counter = vm.runtime.getSpriteTargetByName('Counter');
    t.equal(counter.lookupVariableByNameAndType('total', '').value, 118, 'ran against the sprite\'s own variable');
    t.equal(counter.x, 18, 'motion blocks moved the called sprite');
    t.equal(vm.runtime.getTargetForStage().x, 0, 'and not the caller');
    t.end();
});

test('a compiled custom block that never waits finishes inside the calling block', async t => {
    const {vm, extension} = await setup({enabled: true}, project => {
        const counter = project.sprite('Counter');
        const total = counter.variable('total', 0);
        counter.define('sum to %s', ['n'], [
            blocks.repeat(blocks.argument('n'), [blocks.changeVariable(total, 1)]),
            blocks.return(blocks.variable(total))
        ], {warp: true});
        project.stage.script([
            blocks.whenFlagClicked(),
            log(callOn('Counter', 'sum to %s', 1000)),
            log('end')
        ]);
    });

    vm.greenFlag();
    vm.runtime._step();
    t.same(extension.logged.map(String), ['1000', 'end'], 'done in a single step');
    t.equal(vm.runtime.threads.length, 0, 'no thread was left behind');
    t.end();
});

compilerAndInterpreter(test, 'a custom block that waits hands back its value once it is done', async (t, co) => {
    const {vm, extension} = await setup(co, project => {
        const counter = project.sprite('Counter');
        counter.define('slow %s', ['text'], [
            blocks.wait(0),
            blocks.wait(0),
            blocks.return(blocks.join('slow ', blocks.argument('text')))
        ]);
        project.stage.script([
            blocks.whenFlagClicked(),
            log(blocks.join(callOn('Counter', 'slow %s', 'a'), callOn('Counter', 'slow %s', 'b'))),
            log('end')
        ]);
    });

    vm.greenFlag();
    vm.runtime._step();
    t.same(extension.logged, [], 'the caller waits');
    t.ok(await stepUntil(vm, () => extension.logged.includes('end')), 'script finished');
    t.same(extension.logged, ['slow aslow b', 'end']);
    t.end();
});

compilerAndInterpreter(test, 'calls nest deeper than the stack limit', async (t, co) => {
    const depth = MAX_NESTED_CALLS * 3;
    const {vm, extension} = await setup(co, project => {
        const counter = project.sprite('Counter');
        counter.define('count down %s', ['n'], [
            blocks.if(blocks.greaterThan(blocks.argument('n'), 0), [
                blocks.return(blocks.add(
                    1,
                    callOn('Counter', 'count down %s', blocks.subtract(blocks.argument('n'), 1))
                ))
            ]),
            blocks.return(0)
        ], {warp: true});
        project.stage.script([
            blocks.whenFlagClicked(),
            log(callOn('Counter', 'count down %s', depth)),
            log('end')
        ]);
    });

    vm.greenFlag();
    t.ok(await stepUntil(vm, () => extension.logged.includes('end'), depth * 4), 'script finished');
    t.same(extension.logged.map(String), [String(depth), 'end']);
    t.end();
});

compilerAndInterpreter(test, 'stopping the project ends a call that is waiting', async (t, co) => {
    const {vm, extension} = await setup(co, project => {
        const counter = project.sprite('Counter');
        counter.define('forever', [], [
            block('control_forever', {SUBSTACK: [blocks.wait(0)]})
        ]);
        project.stage.script([
            blocks.whenFlagClicked(),
            log(callOn('Counter', 'forever')),
            log('never')
        ]);
    });

    vm.greenFlag();
    vm.runtime._step();
    vm.runtime._step();
    t.ok(vm.runtime.threads.length > 0, 'threads are running');
    vm.stopAll();
    await stepUntil(vm, () => false, 5);
    t.same(extension.logged, [], 'the caller did not carry on');
    t.equal(vm.runtime.threads.length, 0, 'nothing is left running');
    t.end();
});
