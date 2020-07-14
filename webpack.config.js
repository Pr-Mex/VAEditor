const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin')
const path = require('path')
const webpack = require('webpack')
const nls = require.resolve('monaco-editor-nls');

module.exports = {
  entry: {
    app: './src/main'
  },
  resolve: {
    extensions: ['.ts', '.js', '.css']
  },
  output: {
    globalObject: 'self',
    filename: '[name].js',
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
    rules: [{
      test: /\.js/,
      enforce: 'pre',
      include: /node_modules[\\\/]monaco-editor[\\\/]esm/,
      use: 'monaco-nls'
    }, {
      test: /\.ts$/,
      loader: 'ts-loader'
    }, {
      test: /\.css$/,
      use: [
        'style-loader',
        'css-loader',
        'postcss-loader'
      ]
    }]
  },
  plugins: [
    new webpack.NormalModuleReplacementPlugin(/\/(vscode\-)?nls\.js/, function (resource) {
      resource.request = nls;
      resource.resource = nls;
    }),
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1
    }),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      cache: false
    }),
    new ScriptExtHtmlWebpackPlugin({
      inline: [
        'app.js'
      ]
    }),
  ],
  devServer: {
    port: 4000,
    hot: process.env.NODE_ENV === 'development',
    open: true
  }
}
