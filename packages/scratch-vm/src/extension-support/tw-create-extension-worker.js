// Kept in its own module so that `import.meta.url` never reaches Node's module
// loader. Node treats any file containing `import.meta` as an ES module, which would
// make `require('scratch-vm')` fail for every Node consumer. extension-manager.js
// only pulls this in lazily, from the browser-only worker sandbox path.
//
// The `name` option names the emitted chunk `extension-worker`; its path then follows
// the bundle's own output.chunkFilename, rather than the path worker-loader used to
// hardcode.

module.exports = () => new Worker(
    new URL('./extension-worker', import.meta.url),
    {name: 'extension-worker'}
);
