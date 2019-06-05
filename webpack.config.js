const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const UglifyJSPlugin = require('uglifyjs-webpack-plugin')
const path = require('path')

module.exports = {
  entry: {
    app: './src/index.js'
  },
  output: {
    globalObject: 'self',
    filename: 'app.js',
    path: path.resolve(__dirname, 'dist')
  },
  module: {
    rules: [{
      test: /\.css$/,
      use: ['style-loader', 'css-loader']
    }]
  },
  optimization: {
    splitChunks: {
      name: 'common'
    }
  },
  plugins: [
    new CleanWebpackPlugin(),
    new MonacoWebpackPlugin({
      output: '',
      languages: [],
      features: ['format', 'contextmenu']
    }),
    new HtmlWebpackPlugin({
      template: './src/index.html'
    }),
    new UglifyJSPlugin({
      parallel: true
    })
  ],
  devServer: {
    port: 4000,
    hot: process.env.NODE_ENV === 'development',
    open: true
  },
  devtool: process.argv.includes('--use-sourcemaps') ? 'inline-source-map' : false
}
