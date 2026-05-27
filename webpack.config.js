const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')
const webpack = require('webpack')
const nls = require.resolve('monaco-editor-nls')

module.exports = (env, argv) => {
  return {
    entry: {
      app: './src/main',
      test: './test/autotest.js'
    },
    resolve: {
      extensions: ['.ts', '.js', '.css'],
      fallback: {
        util: require.resolve('util/'),
        stream: require.resolve('stream-browserify'),
        buffer: require.resolve('buffer/'),
        fs: false
      }
    },
    output: {
      globalObject: 'self',
      filename: '[name].js',
      chunkFilename: 'app.worker.js',
      path: path.resolve(__dirname, 'dist'),
      clean: true
    },
    resolveLoader: {
      alias: {
        'blob-url-loader': require.resolve('./tools/loaders/blobUrl'),
        'compile-loader': require.resolve('./tools/loaders/compile'),
        'monaco-nls': require.resolve('./tools/loaders/monacoNls'),
        'replace-strings': require.resolve('./tools/loaders/replaceStrings')
      }
    },
    module: {
      parser: {
        javascript: {
          worker: false,
          url: false
        }
      },
      rules: [
        {
          test: /node_modules[\\/]monaco-editor-nls[\\/].+\.js$/,
          loader: 'replace-strings',
          options: {
            replacements: [
              { search: 'let CURRENT_LOCALE_DATA = null;', replace: 'var CURRENT_LOCALE_DATA = null;' }
            ]
          }
        },
        {
          // Патчи monaco под совместимость с 1С runtime
          test: /node_modules[\\/]monaco-editor[\\/]esm[\\/].+\.js$/,
          loader: 'replace-strings',
          options: {
            replacements: [
              { search: 'let __insane_func;', replace: 'var __insane_func;' },
              { search: 'secondary: [2048 /* CtrlCmd */ | 39 /* KeyI */],', replace: 'secondary: null,' }
            ]
          }
        },
        {
          test: /\.js$/,
          enforce: 'pre',
          include: /node_modules[\\/]monaco-editor[\\/]esm/,
          use: 'monaco-nls'
        },
        {
          test: /\.ts$/,
          use: 'ts-loader'
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader',
            'postcss-loader'
          ]
        },
        {
          test: /\.feature$/,
          type: 'asset/source'
        },
        {
          test: /\.txt$/,
          type: 'asset/source'
        },
        {
          test: /\.(svg|ttf)$/,
          type: 'asset/inline'
        }]
    },
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser'
      }),
      new webpack.NormalModuleReplacementPlugin(/\/(vscode-)?nls\.js$/, function (resource) {
        resource.request = nls
        resource.resource = nls
      }),
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 3
      }),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        title: 'VAEditor',
        cache: false,
        chunks:['app'],
        template: path.resolve(__dirname, 'template.html')
      }),
      new HtmlWebpackPlugin({
        filename: 'test.html',
        title: 'VAEditor',
        cache: false,
        template: path.resolve(__dirname, 'template.html')
      }),
    ],
    optimization: {
      minimize: argv.mode === 'production'
    },
    devServer: {
      port: 4000,
      hot: argv.mode === 'development'
    }
  }
}
