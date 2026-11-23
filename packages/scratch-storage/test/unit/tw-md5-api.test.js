const {test} = require('node:test');
const assert = require('node:assert/strict');
const ScratchStorage = require('../../src/index');

test('storage.md5', () => {
    const storage = new ScratchStorage();
    assert.strictEqual(storage.md5(new ArrayBuffer(0)), 'd41d8cd98f00b204e9800998ecf8427e');
    assert.strictEqual(storage.md5('hello'), '5d41402abc4b2a76b9719d911017c592');
});
