const path = require('path');
const rspack = require('@rspack/core');

// PostCss
const autoprefixer = require('autoprefixer');
const postcssVars = require('postcss-simple-vars');
const postcssImport = require('postcss-import');

// Mirrors the "browserslist" field in package.json, which is what
// @babel/preset-env used to read.
const targets = ['last 3 versions', 'Safari >= 8', 'iOS >= 8'];

const base = {
    mode: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    devtool: 'cheap-module-source-map',
    module: {
        rules: [{
            test: /\.jsx?$/,
            include: path.resolve(__dirname, 'src'),
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
                env: {targets}
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
                    modules: {
                        localIdentName: '[name]_[local]_[hash:base64:5]'
                    },
                    importLoaders: 1,
                    localsConvention: 'camelCase'
                }
            }, {
                loader: 'postcss-loader',
                options: {
                    ident: 'postcss',
                    plugins: function () {
                        return [
                            postcssImport,
                            postcssVars,
                            autoprefixer()
                        ];
                    }
                }
            }]
        },
        {
            test: /\.png$/i,
            loader: 'url-loader'
        },
        {
            // Kept as a loader rather than an `asset/inline` module type: icons are
            // also imported as `!../../tw-recolor/build!./icon.svg`, and the inline
            // `!` prefix only suppresses a rule's loaders, not its module type.
            test: /\.svg$/,
            loader: 'svg-url-loader',
            options: {
                noquotes: true
            }
        }]
    },
    optimization: {
        minimizer: [
            // Scoped to `.min.js`, which no entry currently produces. Kept as-is so
            // the output stays byte-for-byte comparable with the webpack build.
            new rspack.SwcJsMinimizerRspackPlugin({
                include: /\.min\.js$/
            })
        ]
    },
    plugins: []
};

module.exports = [
    // For the playground
    Object.assign({}, base, {
        devServer: {
            static: {
                directory: path.resolve(__dirname, 'playground')
            },
            host: '0.0.0.0',
            port: process.env.PORT || 8078
        },
        entry: {
            playground: './src/playground/playground.jsx'
        },
        output: {
            path: path.resolve(__dirname, 'playground'),
            filename: '[name].js'
        },
        plugins: base.plugins.concat([
            new rspack.HtmlRspackPlugin({
                template: 'src/playground/index.ejs',
                templateParameters: params => Object.assign({}, params, {
                    htmlWebpackPlugin: {
                        options: {title: 'Scratch 3.0 Paint Editor Playground'}
                    }
                })
            })
        ])
    }),
    // For use as a library
    Object.assign({}, base, {
        // webpack 4 derived the externals type from libraryTarget; Rspack defaults to
        // `var`, which would emit broken global lookups instead of require() calls.
        externalsType: 'commonjs2',
        externals: {
            'prop-types': 'prop-types',
            'react': 'react',
            'react-dom': 'react-dom',
            'react-intl': 'react-intl',
            'react-intl-redux': 'react-intl-redux',
            'react-popover': 'react-popover',
            'react-redux': 'react-redux',
            'react-responsive': 'react-responsive',
            'react-style-proptype': 'react-style-proptype',
            'react-tooltip': 'react-tooltip',
            'redux': 'redux'
        },
        entry: {
            'scratch-paint': './src/index.js'
        },
        output: {
            path: path.resolve(__dirname, 'dist'),
            filename: '[name].js',
            // Unnamed on purpose: webpack 4 emitted a bare `module.exports = ...`.
            library: {
                type: 'commonjs2'
            }
        }
    })
];
