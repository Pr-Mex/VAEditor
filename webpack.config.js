const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const path = require('path')
const webpack = require('webpack')
const nls = path.resolve(__dirname, 'src/nls/nls.js') // свой NLS-шим (заменяет monaco-editor-nls)
const replaceStrings = require('./tools/loaders/replaceStrings') // counts + assertApplied (#10)
const InlineChunksPlugin = require('./tools/plugins/inlineChunks')
const InlineWorkerSourcePlugin = require('./tools/plugins/inlineWorkerSource')
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
  // Все воркеры собираются отдельными входами и вкладываются в страницу как
  // base64 (InlineWorkerSourcePlugin): встроенный WebKit 1С открывает страницу
  // по file:// и соседние js-файлы не загружает.
  // Первым в каждом входе идёт src/polyfills.ts: воркер — отдельный бандл,
  // полифилы страницы в него не попадают, а движок 1С лишён globalThis,
  // queueMicrotask и прочего, что код monaco зовёт при загрузке.
  const workerPolyfills = './src/polyfills.ts'
  const workerEntry = {
    'gherkin-worker': [workerPolyfills, './src/languages/turbo-gherkin/worker.js'],
    'editor-worker': [workerPolyfills, 'monaco-editor/esm/vs/editor/editor.worker.js'],
    'css-worker': [workerPolyfills, 'monaco-editor/esm/vs/language/css/css.worker.js'],
    'json-worker': [workerPolyfills, 'monaco-editor/esm/vs/language/json/json.worker.js'],
    'html-worker': [workerPolyfills, 'monaco-editor/esm/vs/language/html/html.worker.js']
  }
  const entry = { app: './src/main', ...workerEntry }
  if (withTest) entry.test = './test/autotest.js'

  return {
    entry,
    resolve: {
      extensions: ['.ts', '.js', '.css'],
      alias: {
        // 0.52.2: поля "exports" в пакете нет (module → тот же esm-файл), алиас —
        // инертная страховка. ОБЯЗАТЕЛЕН при апгрейде на 0.53+: там "exports"
        // мапит require→min/vs/editor/editor.main.js (AMD, webpack не парсит), и
        // bare `import * as monaco from "monaco-editor"` из нашего commonjs-TS
        // тянул бы AMD-min. `$` — точное совпадение, deep-import не задет.
        'monaco-editor$': path.resolve(__dirname, 'node_modules/monaco-editor/esm/vs/editor/editor.main.js')
      },
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
          // Патчи monaco под совместимость с 1С runtime + транспиляция в es2015.
          // esbuild понижает ?. (ES2020) и class fields (ES2022) из esbuild-сборки
          // monaco ≥0.31 — WebKit 1С их не парсит (SyntaxError всего бандла).
          // Порядок use справа налево: replace-strings (строковый патч на сыром
          // коде, до того как esbuild свернёт `2048 | 39` и срежет комментарии) →
          // esbuild (финальная транспиляция). monaco-nls (enforce:pre) идёт раньше.
          test: /node_modules[\\/]monaco-editor[\\/]esm[\\/].+\.js$/,
          use: [
            {
              loader: 'esbuild-loader',
              options: { target: 'es2015' }
            },
            {
              loader: 'replace-strings',
              options: {
                replacements: [
                  // Формат комментариев KeyMod./KeyCode.-квалифицированный — литерал
                  // дословно совпадает в 0.52.2 (suggestController.js ×3, Windows-ветки)
                  // и 0.55 (#10). mac-ветки (хвост `] }` → в dist "secondary":[2087])
                  // намеренно НЕ патчим — в 1С/Windows mac-набор не активируется.
                  { search: 'secondary: [2048 /* KeyMod.CtrlCmd */ | 39 /* KeyCode.KeyI */],', replace: 'secondary: null,' },
                  // RegExp-флаг 'd' (hasIndices, Safari 15) → "Invalid flags" в WebKit 1С.
                  // 0.52.2: findSectionHeaders.js — top-level
                  // new RegExp('\\bMARK:\\s*(.*)$', 'd') бросает ПРИ ЗАГРУЗКЕ модуля →
                  // мёртв весь бандл. Срезаем флаг. Глобальную обёртку RegExp не
                  // делаем — ломает именованные группы (?<name>) в 1С.
                  { search: "(.*)$', 'd'", replace: "(.*)$', ''" }
                ]
              }
            }
          ]
        },
        {
          // Buffer-polyfill (ProvidePlugin → npm `buffer`) содержит `2 ** 24`
          // (ES2016) в readBigUInt64LE/BE. Terser с ecma 2015 его не понижает,
          // а WebKit 1С на `**` роняет разбор всего бандла. esbuild заменяет
          // на Math.pow(2, 24); сам `BigInt(...)` — обычный вызов функции,
          // синтаксически это ES5 (в 1С не исполняется: defineBigIntMethod
          // подменяет метод заглушкой).
          test: /node_modules[\\/]buffer[\\/].+\.js$/,
          use: {
            loader: 'esbuild-loader',
            options: { target: 'es2015' }
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
      // #10: валим сборку, если строковый патч monaco не наложился (дрейф версии)
      {
        apply (compiler) {
          compiler.hooks.afterEmit.tapAsync('AssertMonacoPatches', (compilation, cb) => {
            try {
              replaceStrings.assertApplied()
              cb()
            } catch (e) {
              cb(e)
            }
          })
        }
      },
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
        chunks: ['app'],
        template: path.resolve(__dirname, 'template.html')
      }),
      ...(withTest
        ? [new HtmlWebpackPlugin({
            filename: 'test.html',
            title: 'VAEditor',
            cache: false,
            // Без фильтра сюда попадут чанки обоих входов: src/main исполнится
            // дважды, а он определяет неконфигурируемые свойства на window.
            chunks: ['test'],
            template: path.resolve(__dirname, 'template.html')
          })]
        : []),
      // Последним: страницы уже собраны, остаётся вложить в них исходники
      // воркеров — по file:// WebKit 1С соседние файлы не отдаёт.
      new InlineWorkerSourcePlugin(Object.keys(workerEntry).map(name => name + '.js'),
        withTest ? ['index.html', 'test.html'] : ['index.html']),
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
