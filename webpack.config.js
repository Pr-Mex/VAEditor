const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin')
const path = require('path')
const webpack = require('webpack')
const nls = require.resolve('monaco-editor-nls')

module.exports = (env, argv) => {
  const entry = {
    app: './src/main',
    test: './test/autotest.js'
  }

  return {
    entry,
    resolve: {
      extensions: ['.ts', '.js', '.css']
    },
    output: {
      globalObject: 'self',
      filename: '[name].js',
      chunkFilename: 'worker.js',
      path: path.resolve(__dirname, 'dist')
    },
    resolveLoader: {
      alias: {
        'blob-url-loader': require.resolve('./tools/loaders/blobUrl'),
        'compile-loader': require.resolve('./tools/loaders/compile'),
        'monaco-nls': require.resolve('./tools/loaders/monacoNls')
      }
    },
    module: {
      rules: [
        {
          test: /node_modules[\\/]monaco-editor-nls[\\/].+\.js$/,
          loader: 'string-replace-loader',
          options: {
            multiple: [{
              search: 'let CURRENT_LOCALE_DATA = null;',
              replace: 'var CURRENT_LOCALE_DATA = null;'
            }]
          }
        },
        {
          test: /node_modules[\\/]monaco-editor[\\/]esm[\\/].+\.js$/,
          loader: 'string-replace-loader',
          options: {
            multiple: [{
              search: 'let __insane_func;',
              replace: 'var __insane_func;'
            }]
          }
        },
        {
          test: /node_modules[\\/]monaco-editor[\\/]esm[\\/].+\.js$/,
          loader: 'string-replace-loader',
          options: {
            multiple: [{
              search: 'secondary: [2048 /* CtrlCmd */ | 39 /* KeyI */],',
              replace: 'secondary: null,'
            }]
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
          use: [
            'babel-loader',
            'ts-loader'
          ]
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
          use: 'raw-loader'
        },
        {
          test: /\.txt$/,
          use: 'raw-loader'
        }]
    },
    plugins: [
      new webpack.DefinePlugin({
        'process.env': JSON.stringify(process.env),
        'process.argv': JSON.stringify(argv)
      }),
      new webpack.NormalModuleReplacementPlugin(/\/(vscode-)?nls\.js$/, function (resource) {
        resource.request = nls
        resource.resource = nls
      }),
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 3
      }),
      new CleanWebpackPlugin(),
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
      hot: argv.mode === 'development',
      open: true
    }
  }
}
