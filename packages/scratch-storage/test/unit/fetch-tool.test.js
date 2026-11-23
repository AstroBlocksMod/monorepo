const {test, mock} = require('node:test');
const assert = require('node:assert/strict');
const TextDecoder = require('util').TextDecoder;

const crossFetch = require('cross-fetch');
const mockFetch = require('../fixtures/mock-fetch.js');
mock.method(crossFetch, 'fetch', mockFetch.mockFetch);
const FetchTool = require('../../src/FetchTool.js');

test('send success returns response.text()', async () => {
    const tool = new FetchTool();

    const result = await tool.send({url: '200'});
    assert.strictEqual(result, mockFetch.successText);
});

test('send failure returns response.status', async () => {
    const tool = new FetchTool();

    const catcher = mock.fn();

    try {
        await tool.send({url: '500'});
    } catch (e) {
        catcher(e);
    }

    assert.deepStrictEqual(catcher.mock.calls.map(call => call.arguments), [[500]]);
});

test('get success returns Uint8Array.body(response.arrayBuffer())', async () => {
    const encoding = 'utf-8';
    const decoder = new TextDecoder(encoding);

    const tool = new FetchTool();

    const result = await tool.get({url: '200'});
    assert.strictEqual(decoder.decode(result), mockFetch.successText);
});

test('get with 404 response returns null data', async () => {
    const tool = new FetchTool();

    const result = await tool.get({url: '404'});
    assert.strictEqual(result, null);
});

test('get failure returns response.status', async () => {
    const tool = new FetchTool();
    const catcher = mock.fn();

    try {
        await tool.get({url: '500'});
    } catch (e) {
        catcher(e);
    }

    assert.deepStrictEqual(catcher.mock.calls.map(call => call.arguments), [[500]]);
});
