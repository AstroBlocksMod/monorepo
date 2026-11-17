const {test} = require('tap');
const Reference = require('../../src/astro/reference');
const Cast = require('../../src/util/cast');
const Runtime = require('../../src/engine/runtime');
const MonitorRecord = require('../../src/engine/monitor-record');
const Cloud = require('../../src/io/cloud');

test('labels are unique', t => {
    const a = Reference.createLabel('Unique Thing');
    const b = Reference.createLabel('Unique Thing');
    t.equal(a, 'Unique Thing #1');
    t.equal(b, 'Unique Thing #2');
    t.equal(Reference.createLabel('Other Thing'), 'Other Thing #1');
    t.end();
});

test('a reference converts like its label', t => {
    const a = new Reference(Reference.createLabel('Enemy'));
    const b = new Reference(Reference.createLabel('Enemy'));

    t.equal(Cast.toString(a), a.label);
    t.equal(`${a}`, a.label);
    t.equal(Cast.toNumber(a), 0);
    t.equal(Cast.toBoolean(a), true);

    t.equal(Cast.compare(a, a), 0, 'equals itself');
    t.equal(Cast.compare(a, a.label), 0, 'equals its own label');
    t.equal(Cast.compare(a, a.label.toUpperCase()), 0, 'ignoring case, like any text');
    t.not(Cast.compare(a, b), 0, 'does not equal another reference');
    t.not(Cast.compare(a, 0), 0, 'does not equal a number');
    t.not(Cast.compare(a, ''), 0, 'does not equal nothing');
    t.end();
});

test('a reference is saved as its label', t => {
    const a = new Reference(Reference.createLabel('Enemy'));
    t.equal(JSON.stringify({variables: {id: ['target', a]}}), `{"variables":{"id":["target","${a.label}"]}}`);
    t.end();
});

test('isReference', t => {
    t.equal(Reference.isReference(new Reference('x')), true);
    t.equal(Reference.isReference('x'), false);
    t.equal(Reference.isReference({label: 'x'}), false);
    t.equal(Reference.isReference(null), false);
    t.equal(new Reference('x').isAlive, true);
    t.end();
});

test('toPlain', t => {
    const a = new Reference('a #1');
    t.equal(Reference.toPlain(a), 'a #1');
    t.equal(Reference.toPlain(5), 5);
    t.equal(Reference.toPlain(null), null);

    const plainList = [1, 'two', true];
    t.equal(Reference.toPlain(plainList), plainList, 'a list with no reference is not copied');
    const list = [1, a, 'three'];
    t.same(Reference.toPlain(list), [1, 'a #1', 'three']);
    t.equal(list[1], a, 'the list itself is untouched');
    t.end();
});

test('toPlainArguments', t => {
    const a = new Reference('a #1');
    const plainArgs = {A: 1, B: 'two'};
    t.equal(Reference.toPlainArguments(plainArgs), plainArgs, 'arguments with no reference are not copied');

    const args = {A: a, B: 'two', mutation: {children: []}};
    const converted = Reference.toPlainArguments(args);
    t.same(converted, {A: 'a #1', B: 'two', mutation: {children: []}});
    t.equal(args.A, a, 'the arguments themselves are untouched');
    t.end();
});

test('monitors receive labels', t => {
    const runtime = new Runtime();
    const a = new Reference('a #1');
    runtime.requestAddMonitor(new MonitorRecord({id: 'variable', value: 0}));
    runtime.requestAddMonitor(new MonitorRecord({id: 'list', value: []}));

    const delta = {id: 'variable', value: a};
    runtime.requestUpdateMonitor(delta);
    t.equal(runtime._monitorState.get('variable').get('value'), 'a #1');
    t.equal(delta.value, a, 'the caller\'s object is untouched');

    runtime.requestUpdateMonitor({id: 'list', value: [a, 2]});
    t.same(runtime._monitorState.get('list').get('value'), ['a #1', 2]);

    runtime.requestUpdateMonitor({id: 'variable', value: 5});
    t.equal(runtime._monitorState.get('variable').get('value'), 5, 'other values pass through');
    t.end();
});

test('value bubbles show the label', t => {
    const runtime = new Runtime();
    const target = {};
    runtime.getEditingTarget = () => target;
    const reported = [];
    runtime.on('VISUAL_REPORT', report => reported.push(report.value));

    runtime.visualReport(target, 'block', new Reference('a #1'));
    runtime.visualReport(target, 'block', 'text');
    t.same(reported, ['a #1', 'text']);
    t.end();
});

test('references are not sent to the cloud', t => {
    const cloud = new Cloud(new Runtime());
    const updates = [];
    cloud.setProvider({
        updateVariable: (name, value) => updates.push([name, value])
    });

    cloud.requestUpdateVariable('☁ score', new Reference('a #1'));
    cloud.requestUpdateVariable('☁ score', 12);
    t.same(updates, [['☁ score', 12]]);
    t.end();
});
