const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const ScriptExtHtmlWebpackPlugin = require('script-ext-html-webpack-plugin')
const path = require('path')
const webpack = require('webpack')
const base64 = require('postcss-base64')

module.exports = {
  entry: {
    app: './src/index.js'
  },
  output: {
    globalObject: 'self',
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist')
  },
  resolveLoader: {
    alias: {
      'blob-url-loader': require.resolve('./loaders/blobUrl'),
      'compile-loader': require.resolve('./loaders/compile')
    }
  },
  module: {
    rules: [{
      test: /\.css$/,
      use: [
        'style-loader',
        'css-loader',
        {
          loader: 'postcss-loader',
          options: {
            plugins: () => [
              base64({
                extensions: ['.svg', '.svg']
              })
            ]
          }
        }
      ]
    }]
  },
  plugins: [
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1
    }),
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      template: './src/index.html',
      cache: false
    }),
    new ScriptExtHtmlWebpackPlugin({
      inline: [
        'app.js'
      ]
    })
  ],
  devServer: {
    port: 4000,
    hot: process.env.NODE_ENV === 'development',
    open: true
  },
  devtool: process.argv.includes('--use-sourcemaps') ? 'inline-source-map' : false
}
