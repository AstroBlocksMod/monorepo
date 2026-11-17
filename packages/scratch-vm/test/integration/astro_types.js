const {test} = require('tap');
const VM = require('../../src/virtual-machine');
const JSGenerator = require('../../src/compiler/jsgen');
const {callProcedure} = require('../../src/astro/call');
const {
    ProjectBuilder,
    block,
    blocks,
    load,
    compilerAndInterpreter,
    stepUntil
} = require('../fixtures/astro/project');
const {addLogExtension, log} = require('../fixtures/astro/log-extension');

const as = (value, type) => block('astroTypes_as', {VALUE: value}, {TYPE: type});
const typeMenu = type => {
    const menu = block('astroTypes_menu_TYPE_MENU', {}, {TYPE_MENU: type});
    menu.shadow = true;
    return menu;
};
const isA = (value, type) => block('astroTypes_isA', {VALUE: value, TYPE: typeMenu(type)});
const typeOf = value => block('astroTypes_typeOf', {VALUE: value});

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
        throw new Error('script did not finish');
    }
    logged.pop();
    return {vm, logged};
};

const valueOf = (vm, targetName, variableName) => {
    const target = targetName === 'Stage' ?
        vm.runtime.getTargetForStage() :
        vm.runtime.getSpriteTargetByName(targetName);
    return target.lookupVariableByNameAndType(variableName, '').value;
};

compilerAndInterpreter(test, 'a colon in a name means nothing without the Types extension', async (t, co) => {
    const {vm, logged} = await run(co, project => {
        const score = project.stage.variable('score: number');
        const double = project.stage.define('double %s', ['n: number'], [
            blocks.return(blocks.join(blocks.argument('n: number'), blocks.argument('n: number')))
        ]);
        project.stage.script([
            blocks.whenFlagClicked(),
            blocks.setVariable(score, 'abc'),
            log(double.report('abc')),
            log('end')
        ]);
    });

    t.equal(vm.runtime.astroTypes, null);
    t.equal(valueOf(vm, 'Stage', 'score: number'), 'abc');
    t.same(logged, ['abcabc']);
    t.end();
});

compilerAndInterpreter(test, 'an annotated variable converts what is stored in it', async (t, co) => {
    const {vm, logged} = await run(co, project => {
        project.withTypes();
        const score = project.stage.variable('score: number', 'not a number');
        const label = project.stage.variable('label: text');
        const done = project.stage.variable('done: boolean');
        const alias = project.stage.variable('alias: string');
        const plain = project.stage.variable('plain');
        const unknown = project.stage.variable('odd: nonsense');
        project.stage.script([
            blocks.whenFlagClicked(),
            log(blocks.variable(score)),
            blocks.setVariable(score, 'abc'),
            log(blocks.variable(score)),
            blocks.setVariable(score, '12'),
            log(blocks.join(blocks.variable(score), blocks.variable(score))),
            blocks.changeVariable(score, 'x'),
            blocks.changeVariable(score, 1),
            log(blocks.variable(score)),
            blocks.setVariable(label, blocks.add(1, 2)),
            log(blocks.variable(label)),
            blocks.setVariable(done, 'false'),
            log(blocks.variable(done)),
            blocks.setVariable(done, 'anything'),
            log(blocks.variable(done)),
            blocks.setVariable(alias, 5),
            blocks.setVariable(plain, 'abc'),
            blocks.setVariable(unknown, 'abc'),
            log('end')
        ]);
    });

    t.ok(vm.runtime.astroTypes, 'annotations are on');
    t.strictSame(logged, [0, 0, '1212', 13, '3', false, true]);
    t.equal(valueOf(vm, 'Stage', 'alias: string'), '5', '"string" is another name for text');
    t.equal(valueOf(vm, 'Stage', 'plain'), 'abc', 'a name without a type stays dynamic');
    t.equal(valueOf(vm, 'Stage', 'odd: nonsense'), 'abc', 'so does a name with a type that does not exist');
    t.end();
});

test('an annotated variable converts no matter who writes to it', async t => {
    const {vm} = await run({enabled: true}, project => {
        project.withTypes();
        const sprite = project.sprite('Sprite');
        sprite.variable('hp: number', 5);
        project.stage.list('names: text');
        project.stage.script([blocks.whenFlagClicked(), log('end')]);
    });

    const sprite = vm.runtime.getSpriteTargetByName('Sprite');
    const hp = sprite.lookupVariableByNameAndType('hp: number', '');
    hp.value = 'from an extension';
    t.equal(hp.value, 0);
    vm.setVariableValue(sprite.id, hp.id, '7');
    t.equal(hp.value, 7);

    const clone = sprite.makeClone();
    vm.runtime.addTarget(clone);
    const cloneHp = clone.lookupVariableByNameAndType('hp: number', '', true);
    t.equal(cloneHp.value, 7, 'a clone starts with a copy');
    cloneHp.value = 'x';
    t.equal(cloneHp.value, 0, 'and its copy is typed too');
    t.equal(hp.value, 7);

    const names = vm.runtime.getTargetForStage().lookupVariableByNameAndType('names: text', 'list');
    names.value.push(5);
    t.strictSame(names.value, [5], 'lists are not typed');
    t.end();
});

test('renaming a variable changes its type', async t => {
    const {vm} = await run({enabled: true}, project => {
        project.withTypes();
        project.stage.variable('amount', '12 apples');
        project.stage.script([blocks.whenFlagClicked(), log('end')]);
    });

    const stage = vm.runtime.getTargetForStage();
    const amount = stage.lookupVariableByNameAndType('amount', '');
    stage.renameVariable(amount.id, 'amount: number');
    t.equal(amount.value, 0, 'the value it had is converted');
    amount.value = '3';
    t.equal(amount.value, 3);

    stage.renameVariable(amount.id, 'amount: text');
    t.equal(amount.value, '3');

    stage.renameVariable(amount.id, 'amount');
    amount.value = 4;
    t.equal(amount.value, 4, 'without an annotation it is dynamic again');
    t.end();
});

compilerAndInterpreter(test, 'custom block inputs and return values are converted', async (t, co) => {
    const {vm, logged} = await run(co, project => {
        project.withTypes();
        const sprite = project.sprite('Sprite');
        const double = sprite.define('double %s', ['n: number'], [
            blocks.return(blocks.join(blocks.argument('n: number'), blocks.argument('n: number')))
        ]);
        const flag = sprite.define('flag %b', ['on: boolean'], [
            blocks.return(blocks.booleanArgument('on: boolean'))
        ]);
        const answer = sprite.define('answer %s: number', ['what'], [
            blocks.return(blocks.argument('what'))
        ]);
        const nothing = sprite.define('nothing: number', [], []);
        const untyped = sprite.define('untyped %s', ['value'], [
            blocks.return(blocks.argument('value'))
        ]);
        sprite.script([
            blocks.whenFlagClicked(),
            log(double.report('abc')),
            log(double.report('4')),
            log(double.report()),
            log(flag.report()),
            log(answer.report('abc')),
            log(answer.report('4.5')),
            log(nothing.report()),
            log(untyped.report('abc')),
            log('end')
        ]);
    });

    t.strictSame(logged, ['00', '44', '00', false, 0, 4.5, 0, 'abc']);

    // A call from outside a script. Interpreted, it only finishes once the runtime steps.
    const call = async (procedureCode, args) => {
        const sprite = vm.runtime.getSpriteTargetByName('Sprite');
        const result = {done: false, value: null};
        Promise.resolve(callProcedure(sprite, procedureCode, args)).then(value => {
            result.done = true;
            result.value = value;
        });
        await stepUntil(vm, () => result.done);
        return result.value;
    };
    t.equal(await call('double %s', ['abc']), '00', 'a call from outside a script converts too');
    t.equal(await call('answer %s: number', ['abc']), 0);
    t.end();
});

compilerAndInterpreter(test, 'the Types blocks', async (t, co) => {
    const {logged} = await run(co, project => {
        project.withTypes();
        project.stage.script([
            blocks.whenFlagClicked(),
            log(as('12', 'number')),
            log(as('abc', 'number')),
            log(as(12, 'text')),
            log(as('false', 'boolean')),
            log(isA('12', 'number')),
            log(isA('abc', 'number')),
            log(isA('', 'number')),
            log(isA('abc', 'text')),
            log(isA(blocks.equals(1, 1), 'boolean')),
            log(isA('abc', 'no such type')),
            log(typeOf('12')),
            log(typeOf('abc')),
            log(typeOf(blocks.equals(1, 1))),
            log('end')
        ]);
    });

    t.strictSame(logged, [
        12, 0, '12', false,
        true, false, false, true, true, false,
        'number', 'text', 'boolean'
    ]);
    t.end();
});

compilerAndInterpreter(test, 'a type the compiler knows nothing about is enforced as well', async (t, co) => {
    // A type from somewhere other than the built in ones, as a class will be: even numbers, or 0.
    const even = {
        name: 'even',
        inputType: 0x1FFF, // InputType.ANY
        coerce: value => (Number(value) % 2 === 0 ? Number(value) : 0),
        accepts: value => Number(value) % 2 === 0,
        zero: 0
    };

    const vm = new VM();
    vm.setCompilerOptions(co);
    const logged = addLogExtension(vm);
    const project = new ProjectBuilder().withTypes();
    const count = project.stage.variable('count: even', 0);
    const pass = project.stage.define('pass %s', ['n: even'], [
        blocks.return(blocks.argument('n: even'))
    ]);
    const answer = project.stage.define('answer %s: even', ['n'], [
        blocks.return(blocks.argument('n'))
    ]);
    project.stage.script([
        blocks.whenFlagClicked(),
        log(pass.report(4)),
        log(pass.report(5)),
        log(answer.report(6)),
        log(answer.report(7)),
        blocks.setVariable(count, 8),
        log(blocks.variable(count)),
        blocks.setVariable(count, 9),
        log(blocks.variable(count)),
        log(isA(8, 'even')),
        log(isA(9, 'even')),
        log('end')
    ]);
    await load(vm, project);
    vm.runtime.astroTypes.sources.push({
        resolve: name => (name === 'even' ? even : null),
        names: () => ['even']
    });
    vm.runtime.astroTypes.applyToProject();

    vm.greenFlag();
    t.ok(await stepUntil(vm, () => logged.includes('end')), 'script finished');
    t.strictSame(logged, [4, 0, 6, 0, 8, 0, true, false, 'end']);
    t.end();
});

test('annotations being on is saved with the project and loaded from it', async t => {
    const {vm} = await run({enabled: true}, project => {
        project.withTypes();
        project.stage.variable('score: number', 3);
        project.stage.script([blocks.whenFlagClicked(), log('end')]);
    });

    const saved = JSON.parse(vm.toJSON());
    t.ok(saved.extensions.includes('astroTypes'), 'the extension is listed though no block of it is used');
    t.same(saved.extensionStorage.astroTypes, {annotations: true});

    // A fresh VM, where the extension is not loaded yet.
    const vm2 = new VM();
    addLogExtension(vm2);
    await vm2.loadProject(JSON.stringify(saved));
    t.ok(vm2.runtime.astroTypes, 'loading the project turned annotations on');
    const score = vm2.runtime.getTargetForStage().lookupVariableByNameAndType('score: number', '');
    score.value = 'abc';
    t.equal(score.value, 0);

    // The same VM again, where it already is.
    await vm2.loadProject(JSON.stringify(saved));
    t.ok(vm2.runtime.astroTypes, 'still on after loading again');
    const scoreAgain = vm2.runtime.getTargetForStage().lookupVariableByNameAndType('score: number', '');
    scoreAgain.value = 'abc';
    t.equal(scoreAgain.value, 0);
    t.end();
});

test('a project from elsewhere stays dynamic even after a typed project was open', async t => {
    const {vm} = await run({enabled: true}, project => {
        project.withTypes();
        project.stage.script([blocks.whenFlagClicked(), log('end')]);
    });
    t.ok(vm.runtime.astroTypes);

    const legacy = new ProjectBuilder();
    legacy.stage.variable('score: number', 'abc');
    await load(vm, legacy);

    t.equal(vm.runtime.astroTypes, null, 'annotations went off with the old project');
    t.equal(valueOf(vm, 'Stage', 'score: number'), 'abc', 'the value was left alone');
    const saved = JSON.parse(vm.toJSON());
    t.notOk(saved.extensions.includes('astroTypes'), 'and the extension is not saved into it');
    t.end();
});

test('annotations can be turned off and on', async t => {
    const {vm} = await run({enabled: true}, project => {
        project.withTypes();
        project.stage.variable('score: number', 3);
        project.stage.script([blocks.whenFlagClicked(), log('end')]);
    });
    const extension = vm.runtime.ext_astroTypes;
    const score = vm.runtime.getTargetForStage().lookupVariableByNameAndType('score: number', '');

    extension.toggleAnnotations();
    t.equal(vm.runtime.astroTypes, null);
    score.value = 'abc';
    t.equal(score.value, 'abc', 'the variable is dynamic while annotations are off');
    t.notOk(JSON.parse(vm.toJSON()).extensions.includes('astroTypes'));

    extension.toggleAnnotations();
    t.ok(vm.runtime.astroTypes);
    t.equal(score.value, 0, 'turning them on converts what is there');
    t.end();
});

test('the compiler uses annotations to skip conversions', async t => {
    const compile = async withTypes => {
        const sources = [];
        JSGenerator.testingApparatus = {
            report: (_generator, source) => sources.push(source)
        };
        try {
            await run({enabled: true}, project => {
                if (withTypes) project.withTypes();
                const score = project.stage.variable('score: number', 1);
                const total = project.stage.variable('total: number', 1);
                project.stage.script([
                    blocks.whenFlagClicked(),
                    blocks.setVariable(total, blocks.multiply(blocks.variable(score), 2)),
                    log('end')
                ]);
            });
        } finally {
            JSGenerator.testingApparatus = null;
        }
        return sources.join('\n');
    };

    const dynamic = await compile(false);
    const typed = await compile(true);
    t.match(dynamic, /\(\+b\d+\.value\) \* 2/, 'a dynamic variable is converted to a number before use');
    t.match(typed, /\(b\d+\.value \* 2\)/, 'an annotated one is used as it is');
    t.end();
});
