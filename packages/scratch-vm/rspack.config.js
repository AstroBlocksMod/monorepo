const defaultsDeep = require('lodash.defaultsdeep');
const fs = require('fs');
const path = require('path');
const rspack = require('@rspack/core');

// @babel/preset-env read these from .browserslistrc; builtin:swc-loader is given
// them explicitly so the two toolchains cannot drift apart.
const targets = fs.readFileSync(path.resolve(__dirname, '.browserslistrc'), 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

// webpack 4 accepted `true` as shorthand for "require this module by its own name".
// Rspack does not: it falls back to a `var` external and silently emits a broken
// global reference. Spell out the commonjs2 form instead.
const nodeExternals = names => Object.fromEntries(names.map(name => [name, `commonjs2 ${name}`]));

const expose = name => ({
    loader: 'expose-loader',
    options: {exposes: name}
});

const base = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devServer: {
        static: false,
        host: '0.0.0.0',
        port: process.env.PORT || 8073
    },
    devtool: 'cheap-module-source-map',
    output: {
        filename: '[name].js'
    },
    module: {
        rules: [{
            test: /\.js$/,
            include: path.resolve(__dirname, 'src'),
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
        },
        {
            // Builtin asset module, replacing file-loader with outputPath.
            test: /\.mp3$/,
            type: 'asset/resource',
            generator: {
                filename: 'media/music/[hash][ext]'
            }
        }]
    },
    plugins: []
};

module.exports = [
    // Web-compatible
    defaultsDeep({}, base, {
        target: 'web',
        entry: {
            'scratch-vm': './src/index.js',
            'scratch-vm.min': './src/index.js'
        },
        output: {
            // NOTE: Rspack silently ignores the legacy `library` + `libraryTarget`
            // string pair and falls back to a `var` export, so use the object form.
            library: {
                name: 'VirtualMachine',
                type: 'umd'
            },
            path: path.resolve('dist', 'web')
        },
        module: {
            rules: base.module.rules.concat([
                {
                    test: require.resolve('./src/index.js'),
                    use: [expose('VirtualMachine')]
                }
            ])
        }
    }),
    // Node-compatible
    defaultsDeep({}, base, {
        target: 'node',
        entry: {
            'scratch-vm': './src/index.js'
        },
        output: {
            // Unnamed on purpose: webpack 4 emitted a bare `module.exports = ...`
            // for commonjs2 and consumers depend on that shape.
            library: {
                type: 'commonjs2'
            },
            path: path.resolve('dist', 'node')
        },
        externals: nodeExternals([
            'decode-html',
            'format-message',
            'htmlparser2',
            'scratch-parser',
            'socket.io-client',
            'text-encoding'
        ])
    }),
    // Playground
    defaultsDeep({}, base, {
        target: 'web',
        entry: {
            'benchmark': './src/playground/benchmark',
            'video-sensing-extension-debug': './src/extensions/scratch3_video_sensing/debug'
        },
        output: {
            // webpack 4 defaulted to a `var` library here, since the playground config
            // set no libraryTarget of its own.
            library: {
                name: 'VirtualMachine',
                type: 'var'
            },
            path: path.resolve(__dirname, 'playground'),
            filename: '[name].js'
        },
        module: {
            rules: base.module.rules.concat([
                {
                    test: require.resolve('./src/index.js'),
                    use: [expose('VirtualMachine')]
                },
                {
                    test: require.resolve('./src/extensions/scratch3_video_sensing/debug.js'),
                    use: [expose('Scratch3VideoSensingDebug')]
                },
                {
                    test: require.resolve('stats.js/build/stats.min.js'),
                    use: [expose('Stats')]
                },
                {
                    test: require.resolve('scratch-blocks/dist/vertical.js'),
                    use: [expose('Blockly')]
                },
                {
                    test: require.resolve('scratch-audio/src/index.js'),
                    use: [expose('AudioEngine')]
                },
                {
                    test: require.resolve('scratch-storage/src/index.js'),
                    use: [expose('ScratchStorage')]
                },
                {
                    test: require.resolve('scratch-render/src/index.js'),
                    use: [expose('ScratchRender')]
                }
            ])
        },
        performance: {
            hints: false
        },
        plugins: base.plugins.concat([
            new rspack.CopyRspackPlugin({
                patterns: [{
                    from: 'node_modules/scratch-blocks/media',
                    to: 'media'
                }, {
                    from: 'node_modules/scratch-storage/dist/web'
                }, {
                    from: 'node_modules/scratch-render/dist/web'
                }, {
                    from: 'node_modules/@turbowarp/scratch-svg-renderer/dist/web'
                }, {
                    from: 'src/playground'
                }]
            })
        ])
    })
];
