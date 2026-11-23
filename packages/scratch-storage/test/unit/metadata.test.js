const {test, beforeEach, mock} = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const crossFetch = require('cross-fetch');
const {mockFetch} = require('../fixtures/mock-fetch.js');
mock.method(crossFetch, 'fetch', mockFetch);

const srcDirectory = path.join(__dirname, '../../src/');

beforeEach(() => {
    // reset the metadata container to ensure the tests don't interfere with each other
    // but this also means we need to `require` inside the tests
    /* eslint-disable global-require */
    for (const id of Object.keys(require.cache)) {
        if (id.startsWith(srcDirectory)) {
            delete require.cache[id];
        }
    }

    // temporary: pretend we're running in a browser and the URL has scratchMetadata=1
    // this is a hack to enable the metadata feature in tests
    // see also `hasMetadata` in scratchFetch.js
    global.self = global.self || {};
    global.self.location = new URL('https://example.com/?scratchMetadata=1');
});

test('get without metadata', async () => {
    const FetchTool = require('../../src/FetchTool.js');
    const tool = new FetchTool();

    const mockFetchTestData = {};
    const result = await tool.get({url: '200', mockFetchTestData});

    assert.ok(result instanceof Uint8Array);
    assert.ok(mockFetchTestData.headers);
    assert.strictEqual(mockFetchTestData.headersCount, 0);
});

test('get with metadata', async () => {
    const FetchTool = require('../../src/FetchTool.js');
    const ScratchFetch = require('../../src/scratchFetch');
    const {RequestMetadata, setMetadata} = ScratchFetch;

    const tool = new FetchTool();

    setMetadata(RequestMetadata.ProjectId, 1234);
    setMetadata(RequestMetadata.RunId, 5678);

    const mockFetchTestData = {};
    const result = await tool.get({url: '200', mockFetchTestData});

    assert.ok(result instanceof Uint8Array);
    assert.ok(mockFetchTestData.headers);
    assert.strictEqual(mockFetchTestData.headersCount, 2);
    assert.strictEqual(mockFetchTestData.headers?.get(RequestMetadata.ProjectId), '1234');
    assert.strictEqual(mockFetchTestData.headers?.get(RequestMetadata.RunId), '5678');
});

test('send without metadata', async () => {
    const FetchTool = require('../../src/FetchTool.js');
    const tool = new FetchTool();

    const mockFetchTestData = {};
    const result = await tool.send({url: '200', mockFetchTestData});

    assert.strictEqual(typeof result, 'string');
    assert.ok(mockFetchTestData.headers);
    assert.strictEqual(mockFetchTestData.headersCount, 0);
});

test('send with metadata', async () => {
    const FetchTool = require('../../src/FetchTool.js');
    const ScratchFetch = require('../../src/scratchFetch');
    const {RequestMetadata, setMetadata} = ScratchFetch;

    const tool = new FetchTool();

    setMetadata(RequestMetadata.ProjectId, 4321);
    setMetadata(RequestMetadata.RunId, 8765);

    const mockFetchTestData = {};
    const result = await tool.send({url: '200', mockFetchTestData});

    assert.strictEqual(typeof result, 'string');
    assert.ok(mockFetchTestData.headers);
    assert.strictEqual(mockFetchTestData.headersCount, 2);
    assert.strictEqual(mockFetchTestData.headers?.get(RequestMetadata.ProjectId), '4321');
    assert.strictEqual(mockFetchTestData.headers?.get(RequestMetadata.RunId), '8765');
});

test('selectively delete metadata', async () => {
    const FetchTool = require('../../src/FetchTool.js');
    const ScratchFetch = require('../../src/scratchFetch');
    const {RequestMetadata, setMetadata, unsetMetadata} = ScratchFetch;

    // verify that these special values are preserved and not interpreted as "delete"
    setMetadata(RequestMetadata.ProjectId, null);
    setMetadata(RequestMetadata.RunId, void 0); // void 0 = undefined

    const tool = new FetchTool();

    const mockFetchTestData = {};

    const result1 = await tool.send({url: '200', mockFetchTestData});
    assert.strictEqual(typeof result1, 'string');
    assert.ok(mockFetchTestData.headers);

    assert.strictEqual(mockFetchTestData.headersCount, 2);
    // string "null" means it's present
    assert.strictEqual(mockFetchTestData.headers?.get(RequestMetadata.ProjectId), 'null');
    assert.strictEqual(mockFetchTestData.headers?.get(RequestMetadata.RunId), 'undefined');

    // remove the Project ID from metadata
    unsetMetadata(RequestMetadata.ProjectId);

    const result2 = await tool.send({url: '200', mockFetchTestData});
    assert.strictEqual(typeof result2, 'string');
    assert.ok(mockFetchTestData.headers);

    assert.strictEqual(mockFetchTestData.headersCount, 1);
    // value `null` means it's present
    assert.strictEqual(mockFetchTestData.headers?.get(RequestMetadata.ProjectId), null);
    assert.strictEqual(mockFetchTestData.headers?.get(RequestMetadata.RunId), 'undefined');
});

test('metadata has case-insensitive keys', async () => {
    const FetchTool = require('../../src/FetchTool.js');
    const ScratchFetch = require('../../src/scratchFetch');
    const {setMetadata} = ScratchFetch;

    setMetadata('foo', 1);
    setMetadata('FOO', 2);

    const tool = new FetchTool();

    const mockFetchTestData = {};
    await tool.get({url: '200', mockFetchTestData});

    assert.ok(mockFetchTestData.headers);
    assert.strictEqual(mockFetchTestData.headersCount, 1);
    assert.strictEqual(mockFetchTestData.headers?.get('foo'), '2');
});
