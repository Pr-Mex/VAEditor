// Встраивает собранные бандлы воркеров в HTML-страницы как base64-строки.
//
// Зачем: страница открывается встроенным WebKit платформы 1С 8.5 по file://,
// и он не отдаёт воркер из соседнего файла ("Script at 'file:///...' cannot be
// accessed from origin 'null'"). Поэтому в поставке нет отдельных js: текст
// каждого воркера лежит в самой странице, а blob-/data-URL собирается на месте
// (см. src/worker-source.ts).
//
// Страница получает window.__VAWorkerSources = { 'gherkin-worker.js': base64 }.

const webpack = require('webpack')

class InlineWorkerSourcePlugin {
  constructor (workerAssets, pages) {
    this.workerAssets = workerAssets
    this.pages = pages
  }

  apply (compiler) {
    compiler.hooks.compilation.tap('InlineWorkerSourcePlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        // После минификации (OPTIMIZE_SIZE), но до удаления ассетов чанков,
        // которое InlineChunksPlugin делает на стадии REPORT.
        { name: 'InlineWorkerSourcePlugin', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE },
        () => {
          // HtmlWebpackPlugin собирает страницу в дочерней компиляции,
          // унаследовав наши плагины. Ассетов воркеров там нет и быть не может.
          if (compilation.compiler.isChild && compilation.compiler.isChild()) return

          const sources = {}
          const missing = []
          for (const name of this.workerAssets) {
            const worker = compilation.getAsset(name)
            if (!worker) {
              missing.push(name)
              continue
            }
            sources[name] = Buffer.from(worker.source.source()).toString('base64')
          }
          if (missing.length) {
            compilation.errors.push(new Error(
              'InlineWorkerSourcePlugin: нет ассетов ' + missing.join(', ')))
            return
          }

          const inject = '<script>window.__VAWorkerSources=' + JSON.stringify(sources) + ';</script>'

          for (const page of this.pages) {
            const asset = compilation.getAsset(page)
            if (!asset) continue
            const html = asset.source.source().toString()
            // Только в начало <head>: бандл редактора читает
            // window.__VAWorkerSources сразу при исполнении, а HtmlWebpackPlugin
            // вместе с InlineChunksPlugin раскладывает скрипты в <body> и в конце
            // документа — искать закрывающие теги там ненадёжно.
            const open = html.search(/<head[^>]*>/i)
            const at = open < 0 ? -1 : open + html.slice(open).indexOf('>') + 1
            const result = at <= 0 ? inject + html : html.slice(0, at) + inject + html.slice(at)
            compilation.updateAsset(page, new webpack.sources.RawSource(result))
          }
        }
      )
    })
  }
}

module.exports = InlineWorkerSourcePlugin
