const {test} = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const md5 = data => crypto.createHash('md5').update(data)
    .digest('hex');

const ScratchStorage = require('../../dist/node/scratch-storage');

// Hash and file size of each default asset
const knownSizes = {
    '8e768a5a5a01891b05c01c9ca15eb6aa': 255,
    'b586745b98e94d7574f7f7b48d831e20': 46,
    'e5cb3b2aa4e1a9b4c735c3415e507e66': 925
};

const getDefaultAssetTypes = storage => {
    const defaultAssetTypes = [storage.AssetType.ImageBitmap, storage.AssetType.ImageVector, storage.AssetType.Sound];
    return defaultAssetTypes;
};

const getDefaultAssetIds = (storage, defaultAssetTypes) => {
    const defaultIds = {};
    for (const assetType of defaultAssetTypes) {
        const id = storage.getDefaultAssetId(assetType);
        defaultIds[assetType.name] = id;
    }
    return defaultIds;
};

test('constructor', () => {
    const storage = new ScratchStorage();
    assert.ok(storage instanceof ScratchStorage);
});

test('getDefaultAssetId', () => {
    const storage = new ScratchStorage();
    const defaultAssetTypes = getDefaultAssetTypes(storage);
    const defaultIds = getDefaultAssetIds(storage, defaultAssetTypes);
    for (const assetType of defaultAssetTypes) {
        const id = defaultIds[assetType.name];
        assert.strictEqual(typeof id, 'string');
    }
});

test('load', () => {
    const storage = new ScratchStorage();
    const defaultAssetTypes = getDefaultAssetTypes(storage);
    const defaultIds = getDefaultAssetIds(storage, defaultAssetTypes);

    const promises = [];
    const checkAsset = (assetType, id, asset) => {
        assert.ok(asset instanceof storage.Asset);
        assert.deepStrictEqual(asset.assetId, id);
        assert.deepStrictEqual(asset.assetType, assetType);
        assert.ok(asset.data.length);
        assert.strictEqual(asset.data.length, knownSizes[id]);
        assert.strictEqual(md5(asset.data), id);
    };
    for (const assetType of defaultAssetTypes) {
        const id = defaultIds[assetType.name];

        const promise = storage.load(assetType, id);
        assert.ok(promise instanceof Promise);

        const checkedPromise = promise.then(asset => checkAsset(assetType, id, asset));

        promises.push(checkedPromise);
    }

    return Promise.all(promises);
});
