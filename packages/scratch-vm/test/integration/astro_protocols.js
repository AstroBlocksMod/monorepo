const {test} = require('tap');
const VM = require('../../src/virtual-machine');
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
const protocol = () => block('astroProtocols_protocol');
const conformsTo = name => block('astroProtocols_conformsTo', {}, {PROTOCOL: name});
const conforms = (object, name) => block('astroProtocols_conforms', {
    OBJECT: object,
    PROTOCOL: menu('astroProtocols_menu_PROTOCOL_VALUE_MENU', 'PROTOCOL_VALUE_MENU', name)
});
const newInstance = className => block('astroClasses_newInstance', {
    CLASS: menu('astroClasses_menu_CLASS_MENU', 'CLASS_MENU', className)
});
const isA = (object, className) => block('astroClasses_isA', {
    OBJECT: object,
    CLASS: menu('astroClasses_menu_CLASS_MENU', 'CLASS_MENU', className)
});

/**
 * A project with a Damageable protocol and sprites that do and do not conform to it.
 * @param {ProjectBuilder} project The project.
 * @returns {object} The protocol's custom blocks.
 */
const buildProject = project => {
    project.withTypes();

    // The protocol: one custom block and one typed variable.
    const damageable = project.sprite('Damageable');
    damageable.script([protocol()]);
    damageable.variable('hp: number');
    const takeDamage = damageable.define('take damage %s', ['amount'], []);

    // Conforms: says so and has both.
    const enemy = project.sprite('Enemy');
    enemy.script([conformsTo('Damageable')]);
    const enemyHp = enemy.variable('hp: number', 10);
    enemy.define('take damage %s', ['amount'], [
        blocks.changeVariable(enemyHp, blocks.subtract(0, blocks.argument('amount'))),
        blocks.return(blocks.variable(enemyHp))
    ]);

    // Conforms as well, in its own way. It is a data class.
    const shield = project.sprite('Shield');
    shield.script([conformsTo('Damageable')]);
    shield.script([block('astroClasses_dataClass')]);
    const shieldHp = shield.variable('hp: number', 0);
    shield.define('take damage %s', ['amount'], [
        blocks.changeVariable(shieldHp, 1),
        blocks.return('blocked')
    ]);

    // Has everything but does not say that it conforms.
    const barrel = project.sprite('Barrel');
    barrel.variable('hp: number', 3);
    barrel.define('take damage %s', ['amount'], [blocks.return('barrel was hit')]);

    // Says that it conforms but lacks the custom block, and its variable has the wrong type.
    const ghost = project.sprite('Ghost');
    ghost.script([conformsTo('Damageable')]);
    ghost.script([conformsTo('No Such Protocol')]);
    ghost.variable('hp: text', '');

    return {takeDamage};
};

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

compilerAndInterpreter(test, 'conforming takes saying so and having everything', async (t, co) => {
    const {vm, logged} = await run(co, project => {
        buildProject(project);
        const player = project.sprite('Player');
        player.script([
            blocks.whenFlagClicked(),
            log(conforms(newInstance('Enemy'), 'Damageable')),
            log(conforms(newInstance('Shield'), 'Damageable')),
            log(conforms(newInstance('Barrel'), 'Damageable')),
            log(conforms(newInstance('Ghost'), 'Damageable')),
            log(conforms('Enemy', 'Damageable')),
            log(conforms('some text', 'Damageable')),
            log(conforms(newInstance('Enemy'), 'Enemy')),
            log(conforms(newInstance('Enemy'), 'No Such Protocol')),
            // "is a" takes a protocol too.
            log(isA(newInstance('Shield'), 'Damageable')),
            log(isA(newInstance('Barrel'), 'Damageable')),
            // A protocol cannot be made an instance of.
            log(newInstance('Damageable')),
            log('end')
        ]);
    });

    t.same(logged.map(String), [
        'true', 'true', 'false', 'false',
        'true', 'false', 'false', 'false',
        'true', 'false',
        ''
    ]);
    t.ok(vm.extensionManager.isExtensionLoaded('astroClasses'), 'the Classes extension came along');
    t.end();
});

compilerAndInterpreter(test, 'a call through a protocol reaches whichever sprite the instance is', async (t, co) => {
    const {logged} = await run(co, project => {
        const {takeDamage} = buildProject(project);
        const player = project.sprite('Player');
        const targets = player.list('targets');
        const hit = player.define('hit %s', ['target: Damageable'], [
            log(takeDamage.reportOn(blocks.argument('target: Damageable'), 4))
        ]);
        player.script([
            blocks.whenFlagClicked(),
            blocks.addToList(targets, newInstance('Enemy')),
            blocks.addToList(targets, newInstance('Shield')),
            hit.call(block('data_itemoflist', {INDEX: 1}, {LIST: targets})),
            hit.call(block('data_itemoflist', {INDEX: 2}, {LIST: targets})),
            // A Barrel has the custom block but does not conform, so the typed input holds nothing
            // and the call goes nowhere. Called directly, the same block does run.
            hit.call(newInstance('Barrel')),
            log(takeDamage.reportOn(newInstance('Barrel'), 4)),
            log('end')
        ]);
    });
    // A new Enemy's hp starts at 0, the zero value of a number, whatever the sprite's own hp is.
    t.same(logged.map(String), ['-4', 'blocked', '', 'barrel was hit']);
    t.end();
});

compilerAndInterpreter(test, 'a variable typed with a protocol holds a conformer or nothing', async (t, co) => {
    const {logged} = await run(co, project => {
        buildProject(project);
        const player = project.sprite('Player');
        const target = player.variable('target: Damageable');
        const classOf = object => block('astroClasses_classOf', {OBJECT: object});
        player.script([
            blocks.whenFlagClicked(),
            blocks.setVariable(target, newInstance('Enemy')),
            log(classOf(blocks.variable(target))),
            blocks.setVariable(target, newInstance('Shield')),
            log(classOf(blocks.variable(target))),
            blocks.setVariable(target, newInstance('Barrel')),
            log(blocks.variable(target)),
            blocks.setVariable(target, 'some text'),
            log(blocks.variable(target)),
            log('end')
        ]);
    });
    t.same(logged.map(String), ['Enemy', 'Shield', '', '']);
    t.end();
});

test('what a sprite lacks is worked out and shown in the palette', async t => {
    const {vm} = await run({enabled: true}, project => {
        buildProject(project);
        project.sprite('Player').script([blocks.whenFlagClicked(), log('end')]);
    });
    const service = vm.runtime.astroObjects;
    const sprite = name => vm.runtime.getSpriteTargetByName(name).sprite;

    t.same(service.protocols().map(each => each.name), ['Damageable']);
    t.same(service.conformance(sprite('Enemy'), sprite('Damageable')), {declared: true, missing: []});
    t.same(service.conformance(sprite('Barrel'), sprite('Damageable')), {declared: false, missing: []});
    t.same(service.conformance(sprite('Ghost'), sprite('Damageable')), {
        declared: true,
        missing: [
            {kind: 'method', name: 'take damage %s'},
            {kind: 'field', name: 'hp: number'}
        ]
    });
    t.same(service.protocolProblems(), [
        {
            className: 'Ghost',
            protocolName: 'Damageable',
            isUnknown: false,
            missing: [
                {kind: 'method', name: 'take damage %s'},
                {kind: 'field', name: 'hp: number'}
            ]
        },
        {className: 'Ghost', protocolName: 'No Such Protocol', isUnknown: true, missing: []}
    ]);

    const info = vm.runtime.ext_astroProtocols.getInfo();
    const labels = info.blocks.filter(entry => entry.blockType === 'label').map(entry => entry.text);
    t.same(labels, [
        'Ghost does not conform to Damageable yet. It needs:',
        'the custom block "take damage ( )"',
        'the variable "hp: number"',
        'Ghost: there is no protocol called No Such Protocol'
    ]);
    t.same(vm.runtime.ext_astroProtocols.getProtocolMenu(), ['Damageable']);
    t.end();
});

test('a project with protocols saves and loads its extensions', async t => {
    const {vm} = await run({enabled: true}, project => {
        buildProject(project);
        project.sprite('Player').script([blocks.whenFlagClicked(), log('end')]);
    });
    const saved = JSON.parse(vm.toJSON());
    t.ok(saved.extensions.includes('astroProtocols'));

    const vm2 = new VM();
    addLogExtension(vm2);
    await vm2.loadProject(JSON.stringify(saved));
    t.ok(vm2.extensionManager.isExtensionLoaded('astroProtocols'));
    t.ok(vm2.extensionManager.isExtensionLoaded('astroClasses'));
    t.equal(vm2.runtime.astroObjects.protocolProblems().length, 2);
    t.end();
});
