const {test} = require('tap');
const VM = require('../../src/virtual-machine');
const BlockType = require('../../src/extension-support/block-type');
const ArgumentType = require('../../src/extension-support/argument-type');
const Reference = require('../../src/astro/reference');
const {
    ProjectBuilder,
    block,
    blocks,
    load,
    compilerAndInterpreter,
    stepUntil
} = require('../fixtures/astro/project');

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
                    opcode: 'make',
                    blockType: BlockType.REPORTER,
                    text: 'make [NAME]',
                    arguments: {NAME: {type: ArgumentType.STRING}}
                }
            ]
        };
    }
    log ({VALUE}) {
        logged.push(VALUE);
    }
    make ({NAME}) {
        return new Reference(Reference.createLabel(NAME));
    }
};

const log = value => block('astrotest_log', {VALUE: value});
const make = name => block('astrotest_make', {NAME: name});

compilerAndInterpreter(test, 'references behave like their label in existing blocks', async (t, co) => {
    const vm = new VM();
    vm.setCompilerOptions(co);
    const logged = [];
    vm.extensionManager.addBuiltinExtension('astrotest', createTestExtension(logged));

    const project = new ProjectBuilder();
    const a = project.stage.variable('a');
    const b = project.stage.variable('b');
    const things = project.stage.list('things');
    project.stage.script([
        blocks.whenFlagClicked(),
        blocks.setVariable(a, make('Thing')),
        blocks.setVariable(b, make('Thing')),
        log(blocks.equals(blocks.variable(a), blocks.variable(a))),
        log(blocks.equals(blocks.variable(a), blocks.variable(b))),
        log(blocks.lessThan(blocks.variable(a), blocks.variable(b))),
        log(blocks.join(blocks.variable(a), '!')),
        log(blocks.add(blocks.variable(a), 1)),
        log(blocks.not(blocks.variable(a))),
        blocks.addToList(things, blocks.variable(a)),
        log(block('data_listcontainsitem', {ITEM: blocks.variable(a)}, {LIST: things})),
        log(block('data_itemnumoflist', {ITEM: blocks.variable(b)}, {LIST: things})),
        log(block('data_itemoflist', {INDEX: 1}, {LIST: things})),
        log('end')
    ]);
    await load(vm, project);

    vm.greenFlag();
    t.ok(await stepUntil(vm, () => logged.includes('end')), 'script finished');

    const stage = vm.runtime.getTargetForStage();
    const valueOfA = stage.lookupVariableByNameAndType('a', '').value;
    const valueOfB = stage.lookupVariableByNameAndType('b', '').value;
    t.ok(Reference.isReference(valueOfA), 'the variable holds the reference itself');
    t.not(valueOfA.label, valueOfB.label);

    t.same(logged.map(String), [
        'true', // a = a
        'false', // a = b
        'true', // a < b, compared as text: "Thing #n" sorts before "Thing #n+1" here
        `${valueOfA.label}!`,
        '1',
        'false', // a reference is true, so "not" of it is false
        'true',
        '0',
        valueOfA.label,
        'end'
    ]);
    t.equal(logged[8], valueOfA, 'a list hands back the same reference');

    const saved = JSON.parse(vm.toJSON());
    const savedStage = saved.targets[0];
    t.same(savedStage.variables[a[1]], ['a', valueOfA.label], 'saved as its label');
    t.same(savedStage.lists[things[1]], ['things', [valueOfA.label]], 'in lists too');
    t.end();
});
