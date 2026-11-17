const {test} = require('tap');
const VM = require('../../src/virtual-machine');
const Reference = require('../../src/astro/reference');
const ObjectService = require('../../src/astro/objects');
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
const classMenu = name => menu('astroClasses_menu_CLASS_MENU', 'CLASS_MENU', name);
const fieldMenu = name => menu('astroClasses_menu_FIELD_MENU', 'FIELD_MENU', name);

const newInstance = className => block('astroClasses_newInstance', {CLASS: classMenu(className)});
const myself = () => block('astroClasses_myself');
const deleteInstance = object => block('astroClasses_deleteInstance', {OBJECT: object});
const getField = (name, object) => block('astroClasses_getField', {FIELD: fieldMenu(name), OBJECT: object});
const setField = (name, object, value) => (
    block('astroClasses_setField', {FIELD: fieldMenu(name), OBJECT: object, VALUE: value})
);
const isA = (object, className) => block('astroClasses_isA', {OBJECT: object, CLASS: classMenu(className)});
const classOf = object => block('astroClasses_classOf', {OBJECT: object});
const exists = object => block('astroClasses_exists', {OBJECT: object});
const dataClass = () => block('astroClasses_dataClass');

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

/**
 * An Enemy sprite: a field, a static field, a constructor and two methods.
 * @param {ProjectBuilder} project The project to add it to.
 * @returns {object} Its custom blocks.
 */
const buildEnemy = project => {
    const enemy = project.sprite('Enemy');
    const hp = enemy.variable('hp', 99);
    const count = enemy.variable('static count', 0);
    enemy.variable('untouched', 'set on the sprite');
    return {
        sprite: enemy,
        create: enemy.define('constructor hp %s', ['start'], [
            blocks.setVariable(hp, blocks.argument('start')),
            blocks.changeVariable(count, 1)
        ]),
        takeDamage: enemy.define('take damage %s', ['amount'], [
            blocks.changeVariable(hp, blocks.subtract(0, blocks.argument('amount'))),
            blocks.return(blocks.variable(hp))
        ]),
        getHp: enemy.define('get hp', [], [
            blocks.return(blocks.variable(hp))
        ])
    };
};

compilerAndInterpreter(test, 'instances have their own fields, set by the constructor', async (t, co) => {
    const {vm, logged} = await run(co, project => {
        const enemy = buildEnemy(project);
        const player = project.sprite('Player');
        const a = player.variable('a');
        const b = player.variable('b');
        const c = player.variable('c');
        player.script([
            blocks.whenFlagClicked(),
            blocks.setVariable(a, enemy.create.construct('Enemy', 10)),
            blocks.setVariable(b, enemy.create.construct('Enemy', 20)),
            log(getField('hp', blocks.variable(a))),
            log(getField('hp', blocks.variable(b))),
            log(getField('untouched', blocks.variable(a))),
            enemy.takeDamage.callOn(blocks.variable(a), 3),
            log(enemy.getHp.reportOn(blocks.variable(a))),
            log(blocks.add(enemy.takeDamage.reportOn(blocks.variable(b), 1), 100)),
            setField('hp', blocks.variable(a), 50),
            log(enemy.getHp.reportOn(blocks.variable(a))),
            // The sprite on the stage is an instance too, and goes by the sprite's name.
            log(getField('hp', 'Enemy')),
            log(getField('count', blocks.variable(a))),
            log(getField('count', 'Enemy')),
            log(getField('static count', blocks.variable(b))),
            // "new [CLASS]" passes the constructor nothing, so its input is the default.
            blocks.setVariable(c, newInstance('Enemy')),
            log(getField('hp', blocks.variable(c))),
            log(getField('count', 'Enemy')),
            log('end')
        ]);
    });

    t.same(logged.map(String), ['10', '20', '0', '7', '119', '50', '99', '2', '2', '2', '', '3']);

    const sprite = vm.runtime.getSpriteTargetByName('Enemy').sprite;
    t.equal(sprite.clones.length, 4, 'three instances and the sprite itself');
    const player = vm.runtime.getSpriteTargetByName('Player');
    const a = player.lookupVariableByNameAndType('a', '').value;
    t.ok(Reference.isReference(a));
    t.equal(a.target.isOriginal, false);
    t.ok(vm.runtime.targets.includes(a.target), 'an instance of an ordinary sprite is on the stage');
    t.end();
});

compilerAndInterpreter(test, 'telling instances and classes apart', async (t, co) => {
    const {logged} = await run(co, project => {
        const enemy = buildEnemy(project);
        project.sprite('Wall');
        const player = project.sprite('Player');
        const a = player.variable('a');
        const b = player.variable('b');
        player.script([
            blocks.whenFlagClicked(),
            blocks.setVariable(a, enemy.create.construct('Enemy', 1)),
            blocks.setVariable(b, enemy.create.construct('Enemy', 1)),
            log(blocks.equals(blocks.variable(a), blocks.variable(a))),
            log(blocks.equals(blocks.variable(a), blocks.variable(b))),
            log(isA(blocks.variable(a), 'Enemy')),
            log(isA(blocks.variable(a), 'Wall')),
            log(isA('some text', 'Enemy')),
            log(classOf(blocks.variable(a))),
            log(classOf(myself())),
            log(classOf(5)),
            log(exists(blocks.variable(a))),
            log(exists('some text')),
            log(blocks.equals(myself(), 'Player')),
            // Things that are not instances, or not the right kind, do nothing.
            log(getField('hp', 'some text')),
            log(getField('no such field', blocks.variable(a))),
            log(enemy.getHp.reportOn('some text')),
            log(enemy.getHp.reportOn(myself())),
            log(enemy.create.construct('No Such Class', 1)),
            log(newInstance('Stage')),
            setField('hp', 'some text', 1),
            enemy.takeDamage.callOn(5, 1),
            log('end')
        ]);
    });

    t.same(logged.map(String), [
        'true', 'false',
        'true', 'false', 'false',
        'Enemy', 'Player', '',
        'true', 'false',
        'true',
        '', '', '', '', '', ''
    ]);
    t.end();
});

compilerAndInterpreter(test, 'deleting instances', async (t, co) => {
    const {vm, logged} = await run(co, project => {
        const enemy = buildEnemy(project);
        const die = enemy.sprite.define('die', [], [
            log('dying'),
            deleteInstance(myself()),
            log('never')
        ]);
        const player = project.sprite('Player');
        const a = player.variable('a');
        const b = player.variable('b');
        player.script([
            blocks.whenFlagClicked(),
            blocks.setVariable(a, enemy.create.construct('Enemy', 1)),
            blocks.setVariable(b, enemy.create.construct('Enemy', 2)),
            deleteInstance(blocks.variable(a)),
            log(exists(blocks.variable(a))),
            log(getField('hp', blocks.variable(a))),
            log(enemy.getHp.reportOn(blocks.variable(a))),
            log(exists(blocks.variable(b))),
            die.callOn(blocks.variable(b)),
            log(exists(blocks.variable(b))),
            // The sprite on the stage cannot be deleted.
            deleteInstance('Enemy'),
            log(exists('Enemy')),
            log('end')
        ]);
    });

    t.same(logged.map(String), ['false', '', '', 'true', 'dying', 'false', 'true']);
    t.equal(vm.runtime.getSpriteTargetByName('Enemy').sprite.clones.length, 1);
    t.end();
});

compilerAndInterpreter(test, 'a data class makes instances that are not on the stage', async (t, co) => {
    const {vm, logged} = await run(co, project => {
        const vector = project.sprite('Vector');
        const x = vector.variable('x', 0);
        const y = vector.variable('y', 0);
        vector.script([dataClass()]);
        const create = vector.define('constructor %s %s', ['x', 'y'], [
            blocks.setVariable(x, blocks.argument('x')),
            blocks.setVariable(y, blocks.argument('y'))
        ], {warp: true});
        const plus = vector.define('plus %s', ['other'], [
            blocks.return(create.construct(
                'Vector',
                blocks.add(blocks.variable(x), getField('x', blocks.argument('other'))),
                blocks.add(blocks.variable(y), getField('y', blocks.argument('other')))
            ))
        ], {warp: true});
        const me = vector.define('me', [], [
            // Blocks that draw or move do nothing visible, and must not break.
            blocks.setX(50),
            block('looks_hide'),
            block('looks_show'),
            block('looks_say', {MESSAGE: 'hello'}),
            block('looks_nextcostume'),
            blocks.return(myself())
        ], {warp: true});

        const player = project.sprite('Player');
        const v = player.variable('v');
        const sum = player.variable('sum');
        player.script([
            blocks.whenFlagClicked(),
            blocks.setVariable(v, create.construct('Vector', 1, 2)),
            blocks.setVariable(sum, plus.reportOn(blocks.variable(v), create.construct('Vector', 3, 4))),
            log(getField('x', blocks.variable(sum))),
            log(getField('y', blocks.variable(sum))),
            log(classOf(blocks.variable(sum))),
            log(blocks.equals(me.reportOn(blocks.variable(v)), blocks.variable(v))),
            log(blocks.equals(blocks.variable(sum), blocks.variable(v))),
            deleteInstance(blocks.variable(sum)),
            log(exists(blocks.variable(sum))),
            log(exists(blocks.variable(v))),
            log('end')
        ]);
    });

    t.same(logged.map(String), ['4', '6', 'Vector', 'true', 'false', 'false', 'true']);
    const vector = vm.runtime.getSpriteTargetByName('Vector');
    t.equal(vector.sprite.clones.length, 1, 'no clone was made');
    t.equal(vm.runtime.targets.length, 3, 'and no target was added');
    t.equal(vector.x, 0, 'the sprite on the stage did not move');
    t.equal(vector.visible, true);
    const v = vm.runtime.getSpriteTargetByName('Player').lookupVariableByNameAndType('v', '').value;
    t.equal(v.target.x, 50, 'the instance keeps its own position');
    t.equal(v.target.visible, false, 'and can never be shown');
    t.end();
});

compilerAndInterpreter(test, 'a constructor that waits still gives back the finished instance', async (t, co) => {
    const {logged} = await run(co, project => {
        const slow = project.sprite('Slow');
        const ready = slow.variable('ready', 'no');
        const create = slow.define('constructor %s', ['value'], [
            blocks.wait(0),
            blocks.setVariable(ready, blocks.argument('value'))
        ]);
        const player = project.sprite('Player');
        player.script([
            blocks.whenFlagClicked(),
            log(getField('ready', create.construct('Slow', 'yes'))),
            log('end')
        ]);
    });
    t.same(logged, ['yes']);
    t.end();
});

compilerAndInterpreter(test, 'clones made the Scratch way are instances too, and still copy', async (t, co) => {
    const {logged} = await run(co, project => {
        const enemy = project.sprite('Enemy');
        const hp = enemy.variable('hp', 0);
        enemy.script([
            blocks.whenFlagClicked(),
            blocks.setVariable(hp, 42),
            block('control_create_clone_of', {
                CLONE_OPTION: menu('control_create_clone_of_menu', 'CLONE_OPTION', '_myself_')
            })
        ]);
        enemy.script([
            block('control_start_as_clone'),
            log(blocks.variable(hp)),
            log(classOf(myself())),
            log(blocks.equals(myself(), 'Enemy')),
            log(exists(myself())),
            log('end')
        ]);
    });
    t.same(logged.map(String), ['42', 'Enemy', 'false', 'true']);
    t.end();
});

compilerAndInterpreter(test, 'classes and types', async (t, co) => {
    const {vm, logged} = await run(co, project => {
        project.withTypes();
        const enemy = project.sprite('Enemy');
        enemy.variable('hp: number', 99);
        const name = enemy.variable('name: text', 'original');
        const getName = enemy.define('get name', [], [blocks.return(blocks.variable(name))]);
        project.sprite('Wall');

        const player = project.sprite('Player');
        const target = player.variable('target: Enemy');
        const anything = player.variable('anything');
        // Custom block inputs and return values typed with a class work the same way.
        const describe = player.define('describe %s', ['who: Enemy'], [
            blocks.return(classOf(blocks.argument('who: Enemy')))
        ]);
        const pick = player.define('pick %s: Enemy', ['what'], [
            blocks.return(blocks.argument('what'))
        ]);
        player.script([
            blocks.whenFlagClicked(),
            log(describe.report(newInstance('Enemy'))),
            log(describe.report(newInstance('Wall'))),
            log(describe.report('abc')),
            log(classOf(pick.report(newInstance('Enemy')))),
            log(pick.report(newInstance('Wall'))),
            blocks.setVariable(anything, newInstance('Enemy')),
            // Fields start at the zero value of their type.
            log(getField('hp', blocks.variable(anything))),
            log(blocks.join(getName.reportOn(blocks.variable(anything)), '!')),
            setField('hp', blocks.variable(anything), 'abc'),
            log(getField('hp: number', blocks.variable(anything))),
            // A variable typed with a class holds an instance of it or nothing.
            blocks.setVariable(target, blocks.variable(anything)),
            log(blocks.equals(blocks.variable(target), blocks.variable(anything))),
            blocks.setVariable(target, 'abc'),
            log(blocks.variable(target)),
            blocks.setVariable(target, newInstance('Wall')),
            log(blocks.variable(target)),
            blocks.setVariable(target, 'Enemy'),
            log(classOf(blocks.variable(target))),
            log(block('astroTypes_typeOf', {VALUE: blocks.variable(anything)})),
            log('end')
        ]);
    });

    t.same(logged.slice(0, 5).map(String), ['Enemy', '', '', 'Enemy', '']);
    t.strictSame(logged.slice(5, 8), [0, '!', 0]);
    t.same(logged.slice(8).map(String), ['true', '', '', 'Enemy', 'Enemy']);
    const target = vm.runtime.getSpriteTargetByName('Player').lookupVariableByNameAndType('target: Enemy', '');
    t.ok(Reference.isReference(target.value), 'a sprite name stored in it became the instance');
    t.end();
});

test('a project that only calls methods still needs, saves and loads the extension', async t => {
    const build = project => {
        const enemy = buildEnemy(project);
        const player = project.sprite('Player');
        const a = player.variable('a');
        player.script([
            blocks.whenFlagClicked(),
            blocks.setVariable(a, enemy.create.construct('Enemy', 5)),
            log(enemy.takeDamage.reportOn(blocks.variable(a), 1)),
            log('end')
        ]);
    };
    const {vm, logged} = await run({enabled: true}, build);
    t.same(logged.map(String), ['4']);
    t.ok(vm.extensionManager.isExtensionLoaded('astroClasses'), 'loaded for the call blocks alone');

    const saved = JSON.parse(vm.toJSON());
    t.ok(saved.extensions.includes('astroClasses'));

    const vm2 = new VM();
    const logged2 = addLogExtension(vm2);
    await vm2.loadProject(JSON.stringify(saved));
    vm2.greenFlag();
    t.ok(await stepUntil(vm2, () => logged2.includes('end')));
    t.same(logged2.map(String), ['4', 'end']);
    t.end();
});

test('without the extension a call block with no custom block does nothing, as before', async t => {
    const vm = new VM();
    const logged = addLogExtension(vm);
    const project = new ProjectBuilder();
    const other = project.sprite('Other');
    const orphan = other.define('orphan %s', ['value'], [blocks.return(1)]);
    const player = project.sprite('Player');
    player.script([
        blocks.whenFlagClicked(),
        // A call to a custom block of another sprite, as left behind by the backpack.
        orphan.call('abc'),
        log(orphan.report('abc')),
        log('end')
    ]);
    await load(vm, project);
    vm.greenFlag();
    t.ok(await stepUntil(vm, () => logged.includes('end')));
    t.equal(vm.extensionManager.isExtensionLoaded('astroClasses'), false);
    t.same(logged.map(String), ['', 'end']);
    t.end();
});

test('the palette lists the constructor and methods of every class', async t => {
    const {vm} = await run({enabled: true}, project => {
        buildEnemy(project);
        const player = project.sprite('Player');
        player.script([blocks.whenFlagClicked(), log(myself()), log('end')]);
    });
    const info = vm.runtime.ext_astroClasses.getInfo();
    const xml = info.blocks.filter(entry => entry.blockType === 'xml').map(entry => entry.xml);
    const labels = info.blocks.filter(entry => entry.blockType === 'label').map(entry => entry.text);

    t.same(labels, ['Enemy'], 'a sprite with no custom blocks is left out');
    t.equal(xml.length, 3);
    t.match(xml[0], /proccode="new %s hp %s"/);
    t.match(xml[0], /argumentids="\[&quot;astro:class&quot;,/);
    t.match(xml[0], /return="1"/);
    t.match(xml[0], /<field name="TEXT">Enemy<\/field>/);
    t.match(xml[1], /proccode="%s get hp"/);
    t.match(xml[1], /return="1"/);
    t.match(xml[2], /proccode="%s take damage %s"/);
    t.match(xml[2], /argumentids="\[&quot;astro:self&quot;,/);

    const description = ObjectService.describeClass(vm.runtime.getSpriteTargetByName('Enemy').sprite);
    t.equal(description.isData, false);
    t.equal(description.initializer.procedureCode, 'constructor hp %s');
    t.same(description.methods.map(method => [method.procedureCode, method.returns]), [
        ['get hp', true],
        ['take damage %s', true]
    ]);
    t.end();
});

test('fieldNameOf', t => {
    t.equal(ObjectService.fieldNameOf('hp'), 'hp');
    t.equal(ObjectService.fieldNameOf('hp: number'), 'hp');
    t.equal(ObjectService.fieldNameOf('static count'), 'count');
    t.equal(ObjectService.fieldNameOf('static count: number'), 'count');
    t.equal(ObjectService.fieldNameOf('  static   high score : number '), 'high score');
    t.equal(ObjectService.fieldNameOf('statistic'), 'statistic');
    t.end();
});
