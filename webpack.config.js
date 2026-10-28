const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const path = require('path')
const webpack = require('webpack')
const nls = require.resolve('monaco-editor-nls')
const InlineChunksPlugin = require('./tools/plugins/inlineChunks')
const RuntimeCompatPlugin = require('./tools/plugins/checkRuntimeCompat')
const EmitVersionPlugin = require('./tools/plugins/emitVersion')

const packageVersion = require('./package.json').version

// Полная версия сборки. В CI version.json перезаписывается перед сборкой и
// содержит ещё и номер сборки — он и нужен как ключ кеша у потребителя шаблона.
// Локальный version.json может быть устаревшим, поэтому берём его, только если
// он продолжает версию из package.json.
function editorVersion () {
  try {
    const full = require('./version.json')
    if (full && typeof full.version === 'string' && full.version.startsWith(packageVersion)) {
      return full.version
    }
  } catch (error) {
    // version.json появляется только после сборки в CI.
  }
  return packageVersion
}

const version = editorVersion()

module.exports = (env, argv) => {
  // test.html нужен только автотестам и демо-режиму. Обычная сборка редактора
  // собирает один вход: второй бандл — это ещё столько же времени и мегабайт.
  const withTest = Boolean(env && env.test)
  const entry = { app: './src/main' }
  if (withTest) entry.test = './test/autotest.js'

  return {
    entry,
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
      // Все ресурсы встроены в страницу, внешних запросов нет. Автоопределение
      // publicPath по <script src> в такой сборке невозможно и падает с ошибкой
      // "Automatic publicPath is not supported in this browser".
      publicPath: '',
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
          worker: false
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
        // Один вход = один чанк. Асинхронные чанки грузятся отдельными файлами
        // по file:// и в WebView2 блокируются, поэтому их быть не должно.
        maxChunks: Object.keys(entry).length
      }),
      // Версия сборки попадает и в страницу (window.VAEditorVersion), и в
      // dist/version.json — его читает обработка, встраивающая редактор.
      new webpack.DefinePlugin({
        __VA_EDITOR_VERSION__: JSON.stringify(version)
      }),
      new EmitVersionPlugin(version),
      new InlineChunksPlugin(),
      new RuntimeCompatPlugin(),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        title: 'VAEditor',
        cache: false,
        chunks:['app'],
        template: path.resolve(__dirname, 'template.html')
      }),
      ...(withTest ? [new HtmlWebpackPlugin({
        filename: 'test.html',
        title: 'VAEditor',
        cache: false,
        // Без фильтра сюда попадут чанки обоих входов: src/main исполнится
        // дважды, а он определяет неконфигурируемые свойства на window.
        chunks: ['test'],
        template: path.resolve(__dirname, 'template.html')
      })] : []),
    ],
    // mocha ищет тесты через require с выражением — это норма для него, но шум
    // в выводе мешает замечать настоящие предупреждения.
    ignoreWarnings: [
      { module: /[\\/]node_modules[\\/]mocha[\\/]/, message: /Critical dependency/ }
    ],
    // Всё встраивается в HTML, поэтому предупреждение про размер ассета
    // бессмысленно: страница по определению больше 244 КБ.
    performance: { hints: false },
    optimization: {
      minimize: argv.mode === 'production',
      minimizer: [
        new TerserPlugin({
          // app.js.LICENSE.txt в поставке не нужен: страница самодостаточна,
          // а лишний файл рядом с ней только путает.
          extractComments: false,
          terserOptions: {
            // Встроенный WebKit в 1С не понимает ES2020: иначе terser генерирует
            // `a ?? b` из `null==a?b:a` и раскавычивает ключ U+2118 (`℘:"wp"`).
            // ecma 2015 + закавыченные ASCII-ключи = вывод как в webpack 4.
            ecma: 2015,
            format: {
              quote_keys: true,
              ascii_only: true
            }
          }
        })
      ]
    },
    devServer: {
      port: 4000,
      hot: argv.mode === 'development'
    }
  }
}
