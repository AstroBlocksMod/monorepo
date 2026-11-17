const {test} = require('tap');
const VM = require('../../src/virtual-machine');
const {FunctionReference} = require('../../src/astro/functions');
const {
    ProjectBuilder,
    block,
    blocks,
    load,
    compilerAndInterpreter,
    stepUntil
} = require('../fixtures/astro/project');
const {addLogExtension, log} = require('../fixtures/astro/log-extension');

const menu = (opcode, field, value) => {
    const shadow = block(opcode, {}, {[field]: value});
    shadow.shadow = true;
    return shadow;
};
const listMenu = name => menu('astroFunctions_menu_LIST_MENU', 'LIST_MENU', name);

const fn = expression => block('astroFunctions_lambda', {EXPRESSION: expression});
const input = number => block('astroFunctions_input', {NUMBER: number});
const fromBlock = procedureCode => block('astroFunctions_fromBlock', {}, {BLOCK: procedureCode});
const call = (f, ...args) => {
    const inputs = {FUNCTION: f};
    if (args.length > 0) inputs.A = args[0];
    if (args.length > 1) inputs.B = args[1];
    return block(`astroFunctions_call${args.length}`, inputs);
};
const runFunction = (f, ...args) => {
    const inputs = {FUNCTION: f};
    if (args.length > 0) inputs.A = args[0];
    return block(`astroFunctions_run${args.length}`, inputs);
};
const bind = (f, value) => block('astroFunctions_bind', {FUNCTION: f, VALUE: value});
const compose = (first, second) => block('astroFunctions_compose', {FIRST: first, SECOND: second});
const isFunction = value => block('astroFunctions_isFunction', {VALUE: value});
const map = (list, f) => block('astroFunctions_map', {LIST: listMenu(list[0]), FUNCTION: f});
const filter = (list, f) => block('astroFunctions_filter', {LIST: listMenu(list[0]), FUNCTION: f});
const forEach = (list, f) => block('astroFunctions_forEach', {LIST: listMenu(list[0]), FUNCTION: f});
const reduce = (list, f, start) => (
    block('astroFunctions_reduce', {LIST: listMenu(list[0]), FUNCTION: f, START: start})
);
const listContents = list => block('data_listcontents', {}, {LIST: list});

/**
 * Load a project and run its green flag scripts to the end.
 * @param {object} compilerOptions Compiler options.
 * @param {Function} build Called with the ProjectBuilder. Scripts must end by logging "end".
 * @returns {Promise<{vm: VirtualMachine, logged: Array<*>}>} The VM and what was logged, without "end".
 */
const run = async (compilerOptions, build) => {
    const vm = new VM();
    vm.setCompilerOptions(compilerOptions);
    const logged = addLogExtension(vm);
    const project = new ProjectBuilder();
    build(project);
    await load(vm, project);
    vm.greenFlag();
    if (!await stepUntil(vm, () => logged.includes('end'))) {
        throw new Error(`script did not finish, logged ${JSON.stringify(logged.map(String))}`);
    }
    logged.pop();
    return {vm, logged};
};

compilerAndInterpreter(test, 'a function made from an expression', async (t, co) => {
    const {vm, logged} = await run(co, project => {
        const stage = project.stage;
        const double = stage.variable('double');
        const base = stage.variable('base', 100);
        const addBase = stage.variable('add base');
        const calls = stage.variable('calls', 0);
        const counted = stage.variable('counted');
        const count = stage.define('count', [], [
            blocks.changeVariable(calls, 1),
            blocks.return(blocks.variable(calls))
        ]);
        stage.script([
            blocks.whenFlagClicked(),
            blocks.setVariable(double, fn(blocks.multiply(input(1), 2))),
            log(call(blocks.variable(double), 5)),
            log(call(blocks.variable(double), call(blocks.variable(double), 5))),
            // It reads the variables of where it was made as they are when it is called.
            blocks.setVariable(addBase, fn(blocks.add(blocks.variable(base), input(1)))),
            blocks.setVariable(base, 1),
            log(call(blocks.variable(addBase), 1)),
            // Making a function does not run what is in it.
            blocks.setVariable(counted, fn(count.report())),
            log(blocks.variable(calls)),
            log(call(blocks.variable(counted))),
            log(call(blocks.variable(counted))),
            // Inputs by number. One that was not given is empty.
            log(call(fn(blocks.join(input(2), input(1))), 'a', 'b')),
            log(call(fn(blocks.join(input(1), input(3))), 'a', 'b')),
            log(call(fn(input(1)))),
            // Something typed into the slot is a function that always gives that.
            log(call(fn('hello'), 1)),
            log('end')
        ]);
    });

    t.same(logged.map(String), ['10', '20', '2', '0', '1', '2', 'ba', 'a', '', 'hello']);
    const double = vm.runtime.getTargetForStage().lookupVariableByNameAndType('double', '').value;
    t.ok(double instanceof FunctionReference);
    t.match(String(double), /^function #\d+$/);
    const savedVariables = Object.values(JSON.parse(vm.toJSON()).targets[0].variables);
    t.same(savedVariables.find(saved => saved[0] === 'double'), ['double', double.label], 'saved as its label');
    t.end();
});

compilerAndInterpreter(test, 'functions from custom blocks and from other functions', async (t, co) => {
    const {logged} = await run(co, project => {
        const stage = project.stage;
        const said = stage.list('said');
        stage.define('shout %s', ['text'], [
            blocks.return(blocks.join(blocks.argument('text'), '!'))
        ]);
        stage.define('say %s', ['text'], [
            blocks.addToList(said, blocks.argument('text'))
        ]);
        const add = fn(blocks.add(input(1), input(2)));
        const joined = fn(blocks.join(input(1), input(2)));
        const double = fn(blocks.multiply(input(1), 2));
        stage.script([
            blocks.whenFlagClicked(),
            log(call(fromBlock('shout %s'), 'hi')),
            runFunction(fromBlock('say %s'), 'one'),
            runFunction(fn(call(fromBlock('say %s'), 'two'))),
            log(listContents(said)),
            log(call(fromBlock('no such block'), 1)),
            // With the first input filled in.
            log(call(bind(add, 10), 5)),
            log(call(bind(bind(joined, 'a'), 'b'))),
            // One after the other.
            log(call(compose(bind(add, 1), double), 3)),
            log(call(compose(double, fromBlock('shout %s')), 4)),
            // Calling something that is not a function gives nothing.
            log(call('text', 1)),
            log(call(5)),
            runFunction('text'),
            log(call(bind('text', 1), 2)),
            log(isFunction(double)),
            log(isFunction('function #1')),
            log('end')
        ]);
    });

    t.same(logged.map(String), [
        'hi!', 'one two', '',
        '15', 'ab',
        '8', '8!',
        '', '', '',
        'true', 'false'
    ]);
    t.end();
});

compilerAndInterpreter(test, 'functions on lists', async (t, co) => {
    const {logged} = await run(co, project => {
        const stage = project.stage;
        // Two digits each, as the two engines join a list of single characters differently.
        const numbers = stage.list('numbers', [10, 20, 30, 40]);
        const seen = stage.list('seen');
        const positions = stage.list('positions', ['a', 'b', 'c']);
        stage.define('note %s', ['item'], [
            blocks.addToList(seen, blocks.argument('item'))
        ]);
        stage.script([
            blocks.whenFlagClicked(),
            map(numbers, fn(blocks.multiply(input(1), 2))),
            log(listContents(numbers)),
            filter(numbers, fn(blocks.greaterThan(input(1), 40))),
            log(listContents(numbers)),
            log(reduce(numbers, fn(blocks.add(input(1), input(2))), 0)),
            log(reduce(numbers, fn(blocks.join(input(1), input(2))), '>')),
            forEach(numbers, fromBlock('note %s')),
            log(listContents(seen)),
            // The second input is the item's position.
            map(positions, fn(blocks.join(input(1), input(2)))),
            log(listContents(positions)),
            // A list that does not exist, and something that is not a function.
            map(['no such list', null], fn(input(1))),
            log(reduce(['no such list', null], fn(input(1)), 'start')),
            map(positions, 'not a function'),
            log(block('data_lengthoflist', {}, {LIST: positions})),
            log('end')
        ]);
    });

    t.same(logged.map(String), ['20 40 60 80', '60 80', '140', '>6080', '60 80', 'a1 b2 c3', 'start', '3']);
    t.end();
});

compilerAndInterpreter(test, 'a function that waits is waited for, in order', async (t, co) => {
    const {logged} = await run(co, project => {
        const stage = project.stage;
        const numbers = stage.list('numbers', [1, 2, 3]);
        const order = stage.list('order');
        const slow = stage.define('slow %s', ['n'], [
            blocks.wait(0),
            blocks.addToList(order, blocks.argument('n')),
            blocks.return(blocks.multiply(blocks.argument('n'), 10))
        ]);
        stage.script([
            blocks.whenFlagClicked(),
            log(call(fn(slow.report(input(1))), 7)),
            map(numbers, fn(slow.report(input(1)))),
            log(listContents(numbers)),
            log(reduce(numbers, fn(blocks.add(input(1), slow.report(input(2)))), 0)),
            log(listContents(order)),
            log('end')
        ]);
    });

    t.same(logged.map(String), ['70', '10 20 30', '600', '7 1 2 3 10 20 30']);
    t.end();
});

compilerAndInterpreter(test, 'a function runs where it was made', async (t, co) => {
    const {vm, logged} = await run(co, project => {
        const shared = project.stage.variable('shared');
        const maker = project.sprite('Maker');
        const secret = maker.variable('secret', 'made by Maker');
        maker.script([
            blocks.whenFlagClicked(),
            blocks.setVariable(shared, fn(
                blocks.join(blocks.variable(secret), blocks.join(' at ', blocks.xPosition()))
            )),
            blocks.setX(25)
        ]);
        const caller = project.sprite('Caller');
        caller.script([
            blocks.whenFlagClicked(),
            // Let Maker's script go first.
            blocks.wait(0),
            log(call(blocks.variable(shared))),
            log('end')
        ]);
    });

    t.same(logged, ['made by Maker at 25']);
    t.equal(vm.runtime.getSpriteTargetByName('Caller').x, 0);
    t.end();
});

compilerAndInterpreter(test, 'functions with classes and types', async (t, co) => {
    const {logged} = await run(co, project => {
        project.withTypes();
        const counter = project.sprite('Counter');
        const count = counter.variable('count: number', 0);
        counter.script([block('astroClasses_dataClass')]);
        counter.define('step', [], [
            blocks.changeVariable(count, 1),
            blocks.return(blocks.variable(count))
        ], {warp: true});
        const stepper = counter.define('stepper', [], [
            blocks.return(fromBlock('step'))
        ], {warp: true});

        const player = project.sprite('Player');
        const a = player.variable('a');
        const b = player.variable('b');
        const callback = player.variable('callback: function');
        const newCounter = () => block('astroClasses_newInstance', {
            CLASS: menu('astroClasses_menu_CLASS_MENU', 'CLASS_MENU', 'Counter')
        });
        player.script([
            blocks.whenFlagClicked(),
            blocks.setVariable(a, newCounter()),
            blocks.setVariable(b, newCounter()),
            // A function from an instance's custom block stays tied to that instance.
            blocks.setVariable(callback, stepper.reportOn(blocks.variable(a))),
            log(call(blocks.variable(callback))),
            log(call(blocks.variable(callback))),
            log(call(stepper.reportOn(blocks.variable(b)))),
            log(block('astroTypes_typeOf', {VALUE: blocks.variable(callback)})),
            // Once the instance is deleted the function does nothing.
            block('astroClasses_deleteInstance', {OBJECT: blocks.variable(a)}),
            log(call(blocks.variable(callback))),
            // A variable typed as a function holds a function or nothing.
            blocks.setVariable(callback, 'not a function'),
            log(blocks.variable(callback)),
            log('end')
        ]);
    });

    t.same(logged.map(String), ['1', '2', '1', 'function', '', '']);
    t.end();
});
