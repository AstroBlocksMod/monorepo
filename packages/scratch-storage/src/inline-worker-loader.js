/**
 * Compiles the requested module into a standalone bundle and hands back its source
 * as a string, so that the caller can turn it into a Blob URL at runtime.
 *
 * This replaces `worker-loader?{"inline":true}`, which reached into webpack 4
 * internals that Rspack does not provide. Keeping the worker inline (rather than
 * emitting a separate file and referencing it by URL) is deliberate: scratch-storage
 * is regularly loaded cross-origin, where a same-origin worker URL would not resolve.
 */

const {EntryPlugin} = require('@rspack/core');

const NAME = 'inline-worker';

module.exports.pitch = function (request) {
    const target = this.target || (this._compilation && this._compilation.options.target);

    // Node builds have no Worker to construct, and running the child compilation there
    // makes the Rspack CLI exit non-zero even though the build itself succeeds.
    if (target !== 'web') {
        return 'throw new Error("Not supported in non-web environment");';
    }

    this.cacheable(false);
    const callback = this.async();

    const compiler = this._compilation.createChildCompiler(NAME, {});
    // `!!` matches worker-loader's behaviour: the worker entry is compiled without
    // re-applying the parent config's module rules.
    new EntryPlugin(this.context, `!!${request}`, NAME).apply(compiler);

    compiler.runAsChild((err, entries, compilation) => {
        if (err) {
            return callback(err);
        }

        const assets = compilation.getAssets();
        if (assets.length === 0) {
            return callback(new Error(`${NAME}-loader: child compilation emitted no assets`));
        }

        const source = assets[0].source.source();

        // Child compilations emit into the parent's output directory. The source is
        // inlined into the bundle, so the emitted files would just be dead weight.
        for (const asset of assets) {
            this._compilation.deleteAsset(asset.name);
        }

        return callback(null, `module.exports = ${JSON.stringify(source)};`);
    });
};
