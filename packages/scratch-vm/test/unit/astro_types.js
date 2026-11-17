const {test} = require('tap');
const TypeService = require('../../src/astro/types');
const Reference = require('../../src/astro/reference');
const Variable = require('../../src/engine/variable');
const {InputType} = require('../../src/compiler/enums');

const makeService = () => {
    const runtime = {
        targets: [],
        resets: 0,
        resetAllCaches () {
            this.resets++;
        }
    };
    return {runtime, service: new TypeService(runtime)};
};

const makeTarget = (runtime, variables) => {
    const target = {variables: {}};
    for (const [id, name, value] of variables) {
        target.variables[id] = new Variable(id, name, '', false);
        target.variables[id].value = value;
    }
    runtime.targets.push(target);
    return target;
};

test('parseAnnotation', t => {
    const parse = TypeService.parseAnnotation;
    t.same(parse('score: number'), {name: 'score', typeName: 'number'});
    t.same(parse('score:number'), {name: 'score', typeName: 'number'});
    t.same(parse('  high score  :  text  '), {name: 'high score', typeName: 'text'});
    t.same(parse('a: b: number'), {name: 'a: b', typeName: 'number'}, 'the last colon is the one that counts');
    t.same(parse('area of %s %s: number'), {name: 'area of %s %s', typeName: 'number'});
    t.equal(parse('score'), null);
    t.equal(parse(': number'), null, 'a type needs a name before it');
    t.equal(parse('score:'), null);
    t.equal(parse('score: '), null);
    t.equal(parse(''), null);
    t.equal(parse(null), null);
    t.end();
});

test('typeOf', t => {
    const {service} = makeService();
    t.equal(service.typeOf('score: number'), TypeService.NUMBER);
    t.equal(service.typeOf('label: text'), TypeService.TEXT);
    t.equal(service.typeOf('label: string'), TypeService.TEXT);
    t.equal(service.typeOf('done: boolean'), TypeService.BOOLEAN);
    t.equal(service.typeOf('done: Boolean'), null, 'type names are case sensitive');
    t.equal(service.typeOf('time: 12:30'), null);
    t.equal(service.typeOf('plain'), null);
    t.end();
});

test('lists and broadcasts are never typed', t => {
    const {service} = makeService();
    t.equal(service.typeOfVariable(new Variable('a', 'names: text', 'list', false)), null);
    t.equal(service.typeOfVariable(new Variable('b', 'go: number', 'broadcast_msg', false)), null);
    t.equal(service.typeOfVariable(new Variable('c', 'score: number', '', false)), TypeService.NUMBER);
    t.end();
});

test('typeNameOf', t => {
    const {service} = makeService();
    t.equal(service.typeNameOf(5), 'number');
    t.equal(service.typeNameOf('5'), 'number');
    t.equal(service.typeNameOf(' 5 '), 'number');
    t.equal(service.typeNameOf(NaN), 'text');
    t.equal(service.typeNameOf(''), 'text');
    t.equal(service.typeNameOf('abc'), 'text');
    t.equal(service.typeNameOf(true), 'boolean');
    t.equal(service.typeNameOf('true'), 'text', 'only a real boolean is one');
    t.equal(service.typeNameOf(new Reference('a #1')), 'reference');
    t.end();
});

test('an annotated variable is swapped for a typed one', t => {
    const {runtime, service} = makeService();
    const target = makeTarget(runtime, [
        ['a', 'score: number', '12'],
        ['b', 'label: text', 5],
        ['c', 'done: boolean', 'false'],
        ['d', 'plain', 'abc']
    ]);
    const original = target.variables.a;
    const plain = target.variables.d;

    service.applyToProject();
    t.equal(runtime.resets, 1, 'compiled scripts were thrown away');
    t.not(target.variables.a, original);
    t.equal(target.variables.d, plain, 'a dynamic variable is left as it is');

    t.equal(target.variables.a.value, 12);
    t.equal(target.variables.b.value, '5');
    t.equal(target.variables.c.value, false);
    t.equal(target.variables.a.id, 'a');
    t.equal(target.variables.a.name, 'score: number');
    t.equal(target.variables.a.astroType, TypeService.NUMBER);

    target.variables.a.value = NaN;
    t.equal(target.variables.a.value, 0);
    target.variables.a.value = Infinity;
    t.equal(target.variables.a.value, Infinity);
    target.variables.b.value = true;
    t.equal(target.variables.b.value, 'true');
    target.variables.c.value = 0;
    t.equal(target.variables.c.value, false);

    original.value = '7';
    t.equal(target.variables.a.value, 7, 'the object it replaced still writes to it');
    target.variables.a.value = 8;
    t.equal(original.value, 8, 'and reads from it');

    service.applyToProject();
    t.equal(runtime.resets, 1, 'applying again changes nothing');
    t.end();
});

test('releaseProject makes every variable dynamic again', t => {
    const {runtime, service} = makeService();
    const target = makeTarget(runtime, [['a', 'score: number', 3]]);
    service.applyToProject();
    const typed = target.variables.a;

    service.releaseProject();
    t.equal(runtime.resets, 2);
    t.equal(target.variables.a.astroType, undefined);
    target.variables.a.value = 'abc';
    t.equal(target.variables.a.value, 'abc');
    t.equal(typed.value, 'abc', 'the typed object it replaced follows along');
    t.end();
});

test('a type from another source uses the general typed variable', t => {
    const {runtime, service} = makeService();
    const even = {
        name: 'even',
        inputType: InputType.ANY,
        coerce: value => (Number(value) % 2 === 0 ? Number(value) : 0),
        accepts: value => Number(value) % 2 === 0,
        zero: 0
    };
    service.sources.push({
        resolve: name => (name === 'even' ? even : null),
        names: () => ['even', 'number']
    });
    t.same(service.typeNames(), ['number', 'text', 'boolean', 'even']);

    const target = makeTarget(runtime, [['a', 'count: even', 3]]);
    service.applyToProject();
    t.ok(target.variables.a instanceof TypeService.TypedVariable);
    t.equal(target.variables.a.value, 0);
    target.variables.a.value = 4;
    t.equal(target.variables.a.value, 4);
    target.variables.a.value = 5;
    t.equal(target.variables.a.value, 0);
    t.end();
});

test('coercing custom block inputs and return values', t => {
    const {service} = makeService();
    const values = ['abc', 'abc', 'abc'];
    service.coerceArguments(['n: number', 'label', 'on: boolean'], values);
    t.strictSame(values, [0, 'abc', true]);

    const parameters = {'n: number': '4', 'label': 4};
    service.coerceParameters(parameters);
    t.strictSame(parameters, {'n: number': 4, 'label': 4});

    t.equal(service.coerceReturnValue('area of %s %s: number', ''), 0);
    t.equal(service.coerceReturnValue('area of %s %s', ''), '');
    t.end();
});

test('isOnIn', t => {
    t.equal(TypeService.isOnIn({astroTypes: {annotations: true}}), true);
    t.equal(TypeService.isOnIn({astroTypes: {annotations: false}}), false);
    t.equal(TypeService.isOnIn({astroTypes: null}), false);
    t.equal(TypeService.isOnIn({}), false);
    t.equal(TypeService.isOnIn(null), false);
    t.end();
});
