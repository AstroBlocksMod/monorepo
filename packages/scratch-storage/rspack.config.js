const fs = require('fs');
const path = require('path');

// @babel/preset-env picked these up from .browserslistrc; builtin:swc-loader is
// given them explicitly so the two toolchains cannot drift apart.
const targets = fs.readFileSync(path.resolve(__dirname, '.browserslistrc'), 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

// webpack 4 accepted `true` as shorthand for "require this module by its own name".
// Rspack does not: it falls back to a `var` external and silently emits a broken
// global reference. Spell out the commonjs2 form instead.
const nodeExternals = names => Object.fromEntries(names.map(name => [name, `commonjs2 ${name}`]));

const base = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: 'cheap-module-source-map',
    module: {
        rules: [
            {
                include: [
                    path.resolve('src')
                ],
                test: /\.js$/,
                loader: 'builtin:swc-loader',
                options: {
                    jsc: {
                        parser: {
                            syntax: 'ecmascript'
                        }
                    },
                    // src mixes CommonJS and ESM files; let swc decide per file rather
                    // than forcing one interpretation. Equivalent to babel's
                    // sourceType: 'unambiguous'.
                    isModule: false,
                    env: {targets}
                }
            },
            {
                test: /\.(png|svg|wav)$/,
                loader: 'arraybuffer-loader'
            }
        ]
    },
    plugins: []
};

module.exports = [
    // Web-compatible
    Object.assign({}, base, {
        target: 'web',
        entry: {
            'scratch-storage': './src/index.js',
            'scratch-storage.min': './src/index.js'
        },
        output: {
            // NOTE: Rspack silently ignores the legacy `library` + `libraryTarget`
            // string pair and falls back to a `var` export, so always use the
            // object form. UMD is the one type that does use the name.
            library: {
                name: 'ScratchStorage',
                type: 'umd'
            },
            path: path.resolve('dist', 'web'),
            filename: '[name].js'
        }
    }),

    // Node-compatible
    Object.assign({}, base, {
        target: 'node',
        entry: {
            'scratch-storage': './src/index.js'
        },
        output: {
            // Unnamed on purpose: webpack 4 emitted a bare `module.exports = ...`
            // for commonjs2 and consumers depend on that shape.
            library: {
                type: 'commonjs2'
            },
            path: path.resolve('dist', 'node'),
            filename: '[name].js'
        },
        externals: nodeExternals([
            'base64-js',
            'js-md5',
            'localforage',
            'text-encoding'
        ])
    })
];
