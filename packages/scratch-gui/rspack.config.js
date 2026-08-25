const defaultsDeep = require('lodash.defaultsdeep');
const fs = require('fs');
const path = require('path');
const rspack = require('@rspack/core');

// PostCss
const autoprefixer = require('autoprefixer');
const postcssVars = require('postcss-simple-vars');
const postcssImport = require('postcss-import');

const STATIC_PATH = process.env.STATIC_PATH || '/static';
const {APP_NAME} = require('./src/lib/brand');

const root = process.env.ROOT || '';
if (root.length > 0 && !root.endsWith('/')) {
    throw new Error('If ROOT is defined, it must have a trailing slash.');
}

// @babel/preset-env read these from .browserslistrc; builtin:swc-loader is given
// them explicitly so the two toolchains cannot drift apart.
const targets = fs.readFileSync(path.resolve(__dirname, '.browserslistrc'), 'utf8')
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));

const htmlPluginCommon = {
    root: root,
    // Rspack's template engine exposes no host globals and supports only a limited
    // expression subset -- notably not `===` or `||` -- so anything beyond a plain
    // property read is precomputed here instead.
    rootJSON: JSON.stringify(root),
    isRootPath: root === '/' || root === '',
    // The engine raises a ReferenceError on unknown identifiers rather than treating
    // them as undefined, so every variable a template reads needs a default.
    isEditor: false,
    APP_NAME
};

const extraMeta = JSON.parse(process.env.EXTRA_META || '{}');

/**
 * HtmlRspackPlugin provides no `htmlWebpackPlugin` template variable of its own, so
 * the .ejs templates are handed one assembled from these options. Its template engine
 * supports `<%= %>` and `<% if %>`, which is all the templates rely on.
 */
const htmlPlugin = options => new rspack.HtmlRspackPlugin(Object.assign({
    meta: extraMeta,
    templateParameters: params => Object.assign({}, params, {
        htmlWebpackPlugin: {
            options: Object.assign({}, htmlPluginCommon, options)
        }
    })
}, options));

// When this changes, the path for all JS files will change, bypassing any HTTP caches
const CACHE_EPOCH = 'pentapod';

const base = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: process.env.SOURCEMAP || (process.env.NODE_ENV === 'production' ? false : 'cheap-module-source-map'),
    devServer: {
        static: {
            directory: path.resolve(__dirname, 'build')
        },
        host: '0.0.0.0',
        // webpack-dev-server 3's disableHostCheck
        allowedHosts: 'all',
        compress: true,
        port: process.env.PORT || 8601,
        // allows ROUTING_STYLE=wildcard to work properly
        historyApiFallback: {
            rewrites: [
                {from: /^\/\d+\/?$/, to: '/index.html'},
                {from: /^\/\d+\/fullscreen\/?$/, to: '/fullscreen.html'},
                {from: /^\/\d+\/editor\/?$/, to: '/editor.html'},
                {from: /^\/\d+\/embed\/?$/, to: '/embed.html'},
                {from: /^\/addons\/?$/, to: '/addons.html'}
            ]
        }
    },
    output: {
        // NOTE: `library` is deliberately NOT set here. defaultsDeep gives `base`
        // precedence over the per-config objects below, so a `library.type` in base
        // would silently win over the dist build's UMD setting.
        filename: (
            process.env.NODE_ENV === 'production' ? `js/${CACHE_EPOCH}/[name].[contenthash].js` : 'js/[name].js'
        ),
        chunkFilename: (
            process.env.NODE_ENV === 'production' ? `js/${CACHE_EPOCH}/[name].[contenthash].js` : 'js/[name].js'
        ),
        publicPath: root
    },
    resolve: {
        symlinks: false,
        alias: {
            'text-encoding$': path.resolve(__dirname, 'src/lib/tw-text-encoder'),
            'scratch-render-fonts$': path.resolve(__dirname, 'src/lib/tw-scratch-render-fonts'),
            // pnpm's public hoist puts an arbitrary core-js major at the workspace
            // root, and `symlinks: false` means hoisted packages such as babel-runtime
            // resolve their `core-js/library/...` requests there rather than against
            // their own dependency. Pin it to the v2 copy this package declares.
            'core-js': path.resolve(__dirname, 'node_modules/core-js')
        }
    },
    module: {
        rules: [{
            test: /\.jsx?$/,
            include: [
                path.resolve(__dirname, 'src'),
                /node_modules[\\/]scratch-[^\\/]+[\\/]src/,
                /node_modules[\\/]pify/,
                /node_modules[\\/]@vernier[\\/]godirect/
            ],
            loader: 'builtin:swc-loader',
            options: {
                jsc: {
                    parser: {
                        syntax: 'ecmascript',
                        jsx: true
                    },
                    transform: {
                        react: {
                            // @babel/preset-react defaulted to React.createElement.
                            runtime: 'classic'
                        }
                    }
                },
                // Mixed CommonJS/ESM sources, as with babel's sourceType: 'unambiguous'.
                isModule: 'unknown',
                env: {targets}
            }
        },
        {
            // Inline `!raw-loader!`, `!base64-loader!` and `!arraybuffer-loader!`
            // requests target some of these same extensions. The `!` prefix suppresses
            // a rule's loaders but not its module type, so this stays a loader rule
            // rather than becoming an `asset` module type.
            test: /\.(svg|png|wav|mp3|gif|jpg|woff2|hex)$/,
            loader: 'url-loader',
            options: {
                limit: 2048,
                outputPath: 'static/assets/',
                esModule: false
            }
        },
        {
            test: /\.css$/,
            // Rspack's builtin CSS handling would otherwise claim these files and
            // ignore the loader chain below.
            type: 'javascript/auto',
            use: [{
                loader: 'style-loader'
            }, {
                loader: 'css-loader',
                options: {
                    modules: true,
                    importLoaders: 1,
                    localIdentName: '[name]_[local]_[hash:base64:5]',
                    camelCase: true
                }
            }, {
                loader: 'postcss-loader',
                options: {
                    ident: 'postcss',
                    plugins: function () {
                        return [
                            postcssImport,
                            postcssVars,
                            autoprefixer
                        ];
                    }
                }
            }]
        }]
    },
    plugins: [
        // webpack 4 injected Node globals into web bundles automatically; Rspack
        // (like webpack 5) does not, and the app dies on "Buffer is not defined"
        // without this. Only the globals are needed -- no bare `require('stream')`
        // style imports survive in this graph, or the build would fail to resolve them.
        // Resolved to absolute paths: a bare 'process/browser' request is rejected as
        // not fully specified when it is pulled in from a strict-ESM module.
        new rspack.ProvidePlugin({
            Buffer: [require.resolve('buffer/'), 'Buffer'],
            process: require.resolve('process/browser')
        }),
        new rspack.CopyRspackPlugin({
            patterns: [
                {
                    from: 'node_modules/scratch-blocks/media',
                    to: 'static/blocks-media/default'
                },
                {
                    from: 'node_modules/scratch-blocks/media',
                    to: 'static/blocks-media/high-contrast'
                },
                {
                    from: 'src/lib/themes/blocks/high-contrast-media/blocks-media',
                    to: 'static/blocks-media/high-contrast',
                    force: true
                }
            ]
        })
    ]
};

if (!process.env.CI) {
    base.plugins.push(new rspack.ProgressPlugin());
}

module.exports = [
    // to run editor examples
    defaultsDeep({}, base, {
        entry: {
            'editor': './src/playground/editor.jsx',
            'player': './src/playground/player.jsx',
            'fullscreen': './src/playground/fullscreen.jsx',
            'embed': './src/playground/embed.jsx',
            'addon-settings': './src/playground/addon-settings.jsx',
            'credits': './src/playground/credits/credits.jsx'
        },
        output: {
            // The app build never set libraryTarget, so `var` is what webpack 4 emitted.
            library: {
                name: 'GUI',
                type: 'var'
            },
            path: path.resolve(__dirname, 'build')
        },
        optimization: {
            splitChunks: {
                chunks: 'all',
                minChunks: 2,
                minSize: 50000,
                maxInitialRequests: 5
            }
        },
        plugins: base.plugins.concat([
            new rspack.DefinePlugin({
                'process.env.NODE_ENV': `"${process.env.NODE_ENV}"`,
                'process.env.DEBUG': Boolean(process.env.DEBUG),
                'process.env.ENABLE_SERVICE_WORKER': JSON.stringify(process.env.ENABLE_SERVICE_WORKER || ''),
                'process.env.ROOT': JSON.stringify(root),
                'process.env.ROUTING_STYLE': JSON.stringify(process.env.ROUTING_STYLE || 'filehash'),
                'process.env.ENABLE_WINDCHIMES': JSON.stringify(process.env.ENABLE_WINDCHIMES || '')
            }),
            htmlPlugin({
                chunks: ['editor'],
                template: 'src/playground/index.ejs',
                filename: 'editor.html',
                title: `${APP_NAME} - Block-based programming to the stars!`,
                isEditor: true
            }),
            htmlPlugin({
                chunks: ['player'],
                template: 'src/playground/index.ejs',
                filename: 'index.html',
                title: `${APP_NAME} - Block-based programming to the stars!`
            }),
            htmlPlugin({
                chunks: ['fullscreen'],
                template: 'src/playground/index.ejs',
                filename: 'fullscreen.html',
                title: `${APP_NAME} - Block-based programming to the stars!`
            }),
            htmlPlugin({
                chunks: ['embed'],
                template: 'src/playground/embed.ejs',
                filename: 'embed.html',
                title: `Embedded Project - ${APP_NAME}`
            }),
            htmlPlugin({
                chunks: ['addon-settings'],
                template: 'src/playground/simple.ejs',
                filename: 'addons.html',
                title: `Addon Settings - ${APP_NAME}`
            }),
            htmlPlugin({
                chunks: ['credits'],
                template: 'src/playground/simple.ejs',
                filename: 'credits.html',
                title: `${APP_NAME} Credits`
            }),
            new rspack.CopyRspackPlugin({
                patterns: [
                    {
                        from: 'static',
                        to: ''
                    }
                ]
            }),
            new rspack.CopyRspackPlugin({
                patterns: [
                    {
                        from: 'extensions/**',
                        to: 'static',
                        context: 'src/examples'
                    }
                ]
            })
        ])
    })
].concat(
    process.env.NODE_ENV === 'production' || process.env.BUILD_MODE === 'dist' ? (
        // export as library
        defaultsDeep({}, base, {
            target: 'web',
            entry: {
                'scratch-gui': './src/index.js'
            },
            output: {
                library: {
                    name: 'GUI',
                    type: 'umd'
                },
                filename: 'js/[name].js',
                chunkFilename: 'js/[name].js',
                path: path.resolve('dist'),
                publicPath: `${STATIC_PATH}/`
            },
            // webpack 4 derived the externals type from libraryTarget; Rspack defaults
            // to `var`, which would emit broken global lookups for a UMD consumer.
            externalsType: 'umd',
            externals: {
                'react': 'react',
                'react-dom': 'react-dom'
            },
            module: {
                rules: base.module.rules.map(rule => (
                    rule.loader === 'url-loader' ? Object.assign({}, rule, {
                        options: Object.assign({}, rule.options, {
                            publicPath: `${STATIC_PATH}/assets/`
                        })
                    }) : rule
                ))
            },
            plugins: base.plugins.concat([
                new rspack.CopyRspackPlugin({
                    patterns: [
                        {
                            from: 'extension-worker.{js,js.map}',
                            context: 'node_modules/scratch-vm/dist/web',
                            noErrorOnMissing: true
                        }
                    ]
                }),
                // Include library JSON files for scratch-desktop to use for downloading
                new rspack.CopyRspackPlugin({
                    patterns: [
                        {
                            from: 'src/lib/libraries/*.json',
                            to: 'libraries/[name][ext]'
                        }
                    ]
                })
            ])
        })) : []
);
