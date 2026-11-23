const {test, mock} = require('node:test');
const assert = require('node:assert/strict');
const crossFetch = require('cross-fetch');

const mockFetch = () => Promise.reject(new Error('Intentional error for testing'));
mock.method(crossFetch, 'fetch', mockFetch);

const FetchTool = require('../../src/FetchTool');

test('get() returns a somewhat useful error message', async () => {
    const tool = new FetchTool();

    let error = null;
    try {
        await tool.get({
            url: 'https://something.turbowarp.org/1234.png'
        });
    } catch (e) {
        error = e;
    }

    assert.match(
        error.toString(),
        /Storage request https:\/\/something.turbowarp.org\/1234.png failed: Error: Intentional error for testing/
    );
});
