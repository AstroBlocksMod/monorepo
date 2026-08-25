const path = require('path');
const rspack = require('@rspack/core');

// Matches the browser list the old babel-preset-env config targeted.
const targets = ['last 3 versions', 'Safari >= 8', 'iOS >= 8'];

// webpack 4 accepted `true` as shorthand for "require this module by its own name".
// Rspack does not: it falls back to a `var` external and silently emits a broken
// global reference. Spell out the commonjs2 form instead.
const nodeExternals = entries => Object.fromEntries(
    entries.map(entry => (Array.isArray(entry) ? entry : [entry, entry]))
        .map(([request, name]) => [request, `commonjs2 ${name}`])
);

const base = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devServer: {
        static: false,
        host: '0.0.0.0',
        port: process.env.PORT || 8361
    },
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
                    isModule: 'unknown',
                    env: {targets}
                }
            }
        ]
    },
    optimization: {
        minimizer: [
            // Only the `.min` entries are minified; the plain bundles ship readable,
            // which is what uglifyjs-webpack-plugin's `include` did before.
            new rspack.SwcJsMinimizerRspackPlugin({
                include: /\.min\.js$/
            })
        ]
    },
    plugins: []
};

module.exports = [
    // Playground
    Object.assign({}, base, {
        target: 'web',
        entry: {
            playground: './src/playground/playground.js',
            queryPlayground: './src/playground/queryPlayground.js'
        },
        output: {
            library: {
                type: 'umd'
            },
            path: path.resolve('playground'),
            filename: '[name].js'
        },
        plugins: base.plugins.concat([
            new rspack.CopyRspackPlugin({
                patterns: [
                    {
                        context: 'src/playground',
                        // CopyRspackPlugin's globber does not support extglob `+(a|b)`.
                        from: '*.{html,css}'
                    }
                ]
            })
        ])
    }),
    // Web-compatible
    Object.assign({}, base, {
        target: 'web',
        output: {
            // NOTE: Rspack silently ignores the legacy `library` + `libraryTarget`
            // string pair and falls back to a `var` export, so use the object form.
            library: {
                name: 'ScratchRender',
                type: 'umd'
            },
            path: path.resolve('dist', 'web'),
            filename: '[name].js'
        },
        entry: {
            'scratch-render': './src/index.js',
            'scratch-render.min': './src/index.js'
        }
    }),
    // Node-compatible
    Object.assign({}, base, {
        target: 'node',
        entry: {
            'scratch-render': './src/index.js'
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
            ['!ify-loader!grapheme-breaker', 'grapheme-breaker'],
            ['!ify-loader!linebreak', 'linebreak'],
            'hull.js',
            '@turbowarp/scratch-svg-renderer',
            'twgl.js',
            'xml-escape'
        ])
    })
];
