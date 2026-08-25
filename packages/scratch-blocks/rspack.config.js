// patch 'fs' to fix EMFILE errors, for example on WSL
var realFs = require('fs');
var gracefulFs = require('graceful-fs');
gracefulFs.gracefulify(realFs);

var path = require('path');
var rspack = require('@rspack/core');

var mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';

module.exports = [{
  mode: mode,
  entry: {
    horizontal: './shim/horizontal.js',
    vertical: './shim/vertical.js'
  },
  output: {
    // NOTE: webpack 4 ignored `library` for commonjs2 targets and emitted a bare
    // `module.exports = ...`. Naming the library here would instead emit
    // `module.exports.ScratchBlocks = ...` and break every consumer, so stay unnamed.
    library: {
      type: 'commonjs2'
    },
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js'
  },
  optimization: {
    minimize: false
  },
  performance: {
    hints: false
  }
}, {
  mode: mode,
  entry: {
    horizontal: './shim/horizontal.js',
    vertical: './shim/vertical.js'
  },
  output: {
    library: {
      name: 'Blockly',
      type: 'umd'
    },
    path: path.resolve(__dirname, 'dist', 'web'),
    filename: '[name].js'
  },
  optimization: {
    minimizer: [
      // Blockly's generated Closure output relies on function/property names, so
      // minify without mangling, matching the old uglifyjs-webpack-plugin config.
      new rspack.SwcJsMinimizerRspackPlugin({
        minimizerOptions: {
          mangle: false
        }
      })
    ]
  },
  plugins: []
},
{
  mode: mode,
  entry: './shim/gh-pages.js',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'gh-pages')
  },
  optimization: {
    minimize: false
  },
  performance: {
    hints: false
  },
  plugins: [
      new rspack.CopyRspackPlugin({
        patterns: [{
          from: 'node_modules/google-closure-library',
          to: 'closure-library'
        }, {
          from: 'blocks_common',
          to: 'playgrounds/blocks_common',
        }, {
          from: 'blocks_horizontal',
          to: 'playgrounds/blocks_horizontal',
        }, {
          from: 'blocks_vertical',
          to: 'playgrounds/blocks_vertical',
        }, {
          from: 'core',
          to: 'playgrounds/core'
        }, {
          from: 'media',
          to: 'playgrounds/media'
        }, {
          from: 'msg',
          to: 'playgrounds/msg'
        }, {
          from: 'tests',
          to: 'playgrounds/tests'
        }, {
          from: '*.js',
          to: 'playgrounds',
          globOptions: {
            ignore: ['**/webpack.config.js', '**/rspack.config.js']
          }
        }]
      })
  ]
}];
