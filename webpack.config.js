const HtmlWebpackPlugin = require('html-webpack-plugin')
const TerserPlugin = require('terser-webpack-plugin')
const path = require('path')
const webpack = require('webpack')
const nls = path.resolve(__dirname, 'src/nls/nls.js') // свой NLS-шим (заменяет monaco-editor-nls)
const replaceStrings = require('./tools/loaders/replaceStrings') // counts + assertApplied (#10)

module.exports = (env, argv) => {
  return {
    entry: {
      app: './src/main',
      test: './test/autotest.js'
    },
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
        apply(compiler) {
          compiler.hooks.afterEmit.tapAsync('AssertMonacoPatches', (compilation, cb) => {
            try { replaceStrings.assertApplied(); cb(); }
            catch (e) { cb(e); }
          });
        },
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
      minimize: argv.mode === 'production',
      minimizer: [
        new TerserPlugin({
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
