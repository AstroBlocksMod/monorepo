// Based on https://github.com/webpack-contrib/worker-loader/tree/v2.0.0
//
// Compiles the requested module into a standalone bundle and returns its source as a
// string, so the iframe sandbox can inject it directly. Rspack does not ship
// webpack's SingleEntryPlugin, but EntryPlugin plus a child compiler is equivalent.

const {EntryPlugin} = require('@rspack/core');

const NAME = 'extension worker';

module.exports.pitch = function (request) {
    const target = this.target || (this._compilation && this._compilation.options.target);

    // Technically this loader does work in other environments, but our use case does not want that.
    if (target !== 'web') {
        return 'throw new Error("Not supported in non-web environment");';
    }

    this.cacheable(false);
    const callback = this.async();

    const compiler = this._compilation.createChildCompiler(NAME, {});
    new EntryPlugin(this.context, `!!${request}`, NAME).apply(compiler);

    compiler.runAsChild((err, entries, compilation) => {
        if (err) {
            return callback(err);
        }

        const assets = compilation.getAssets();
        if (assets.length === 0) {
            return callback(new Error('tw-load-script-as-plain-text: child compilation emitted no assets'));
        }

        const source = assets[0].source.source();

        // Child compilations emit into the parent's output directory. The source is
        // inlined into the bundle, so those files would just be dead weight -- the
        // webpack build used to leave a stray "extension worker.js" behind this way.
        for (const asset of assets) {
            this._compilation.deleteAsset(asset.name);
        }

        return callback(null, `module.exports = ${JSON.stringify(source)};`);
    });
};
