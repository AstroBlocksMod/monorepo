const {test, mock} = require('node:test');
const assert = require('node:assert/strict');
const crossFetch = require('cross-fetch');

let attempt = 0;
const mockFetch = () => {
    attempt++;
    if (attempt === 1) {
        // eslint-disable-next-line prefer-promise-reject-errors
        return Promise.reject('Intentional error for testing');
    }
    return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(new Uint8Array([100, 101, 102, 103]).buffer)
    });
};
mock.method(crossFetch, 'fetch', mockFetch);

const FetchTool = require('../../src/FetchTool');

test('get() retries on error', async () => {
    const tool = new FetchTool();
    const result = await tool.get({url: 'url'});
    assert.deepStrictEqual(new Uint8Array(result), new Uint8Array([
        100, 101, 102, 103
    ]));
});
