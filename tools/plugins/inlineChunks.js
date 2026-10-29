// Встраивает содержимое собранных чанков прямо в HTML-страницу.
//
// Зачем: страница редактора открывается по протоколу file:// (временный каталог
// распакованного шаблона). Chromium/WebView2 считает каждый file:-URL уникальным
// origin'ом, поэтому загрузка внешних ресурсов (скриптов, стилей, чанков)
// блокируется с сообщением "Unsafe attempt to load URL ... 'file:' URLs are
// treated as unique security origins".
//
// После инлайна итоговый index.html не тянет ни одного внешнего файла:
// бандлы воркеров тоже лежат в странице как base64 (InlineWorkerSourcePlugin).

const HtmlWebpackPlugin = require('html-webpack-plugin')
const webpack = require('webpack')

function assetName (url) {
  return url.split('?')[0].split('#')[0].replace(/^\.?\//, '')
}

// Закрывающий тег скрипта/стиля внутри инлайна обрывает разбор HTML,
// а "<!--" переводит парсер в режим escaped-скрипта.
function escapeInline (source) {
  return source
    .replace(/<\/script/gi, '<\\/script')
    .replace(/<\/style/gi, '<\\/style')
    .replace(/<!--/g, '<\\!--')
}

class InlineChunksPlugin {
  apply (compiler) {
    compiler.hooks.compilation.tap('InlineChunksPlugin', (compilation) => {
      // Дочерние компиляции (compile-loader собирает в них воркеры) наследуют
      // этот tap через Compiler.createChildCompiler. У них нет ни страниц, ни
      // задачи инлайна, а в production ниже удаляются .js-ассеты чанков —
      // то есть дочерняя компиляция вычищала собственный результат, и
      // runAsChild отдавал пустоту.
      if (compilation.compiler.isChild && compilation.compiler.isChild()) return

      HtmlWebpackPlugin.getHooks(compilation).alterAssetTagGroups.tap('InlineChunksPlugin', (data) => {
        const inline = (tag) => {
          const attributes = tag.attributes || {}
          const isScript = tag.tagName === 'script' && attributes.src
          const isStyle = tag.tagName === 'link' && attributes.href && attributes.rel === 'stylesheet'
          if (!isScript && !isStyle) return tag

          const asset = compilation.getAsset(assetName(isScript ? attributes.src : attributes.href))
          // Чужие скрипты (например, клиент webpack-dev-server) оставляем как есть.
          if (!asset) return tag

          const source = escapeInline(asset.source.source().toString())
          return isScript
            ? { tagName: 'script', voidTag: false, meta: { plugin: 'InlineChunksPlugin' }, innerHTML: source }
            : { tagName: 'style', voidTag: false, meta: { plugin: 'InlineChunksPlugin' }, innerHTML: source }
        }

        // Встроенный скрипт в <head> исполнился бы до появления document.body,
        // а бандл на старте обращается к document.body (initPage). Поэтому
        // встроенные скрипты переносим в конец <body> — туда, где тег стоял
        // с атрибутом defer.
        const movedToBody = []
        const inlineOrMove = (tag) => {
          const result = inline(tag)
          if (result !== tag && result.tagName === 'script') {
            movedToBody.push(result)
            return undefined
          }
          return result
        }

        // Асинхронные чанки (ленивые import() из monaco) исполняем в странице
        // до основного бандла: чанк кладёт свои модули в chunkLoadingGlobal,
        // рантайм webpack при старте проигрывает очередь и помечает чанк
        // загруженным (installedChunks[chunkId] = 0). После этого import()
        // резолвится сразу, без запроса файла по file://.
        const lazyTags = []
        for (const chunk of compilation.chunks) {
          if (chunk.canBeInitial()) continue
          for (const file of chunk.files) {
            const asset = file.endsWith('.js') ? compilation.getAsset(file) : undefined
            if (!asset) continue
            lazyTags.push({
              tagName: 'script',
              voidTag: false,
              meta: { plugin: 'InlineChunksPlugin' },
              innerHTML: escapeInline(asset.source.source().toString())
            })
          }
        }

        const compact = (tags) => tags.map(inlineOrMove).filter(Boolean)
        data.headTags = [...lazyTags, ...compact(data.headTags)]
        data.bodyTags = [...compact(data.bodyTags), ...movedToBody]
        return data
      })

      // Не-JS асинхронный чанк исполнить в странице нельзя, а загрузить по
      // file:// в WebView2 не получится. Лучше упасть на сборке, чем отгрузить
      // нерабочий редактор.
      compilation.hooks.processAssets.tap(
        { name: 'InlineChunksPlugin', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_REPORT },
        () => {
          const notInlined = []
          for (const chunk of compilation.chunks) {
            if (chunk.canBeInitial()) continue
            for (const file of chunk.files) {
              if (!file.endsWith('.js')) notInlined.push(file)
            }
          }
          if (notInlined.length) {
            const message = 'Асинхронные чанки нельзя встроить в страницу: ' + notInlined.join(', ') +
              '. Их подгрузка по file:// в WebView2 заблокирована.'
            if (compiler.options.mode === 'production') throw new Error(message)
            compilation.warnings.push(new Error(message))
          }

          // Содержимое всех чанков уже внутри страницы, отдельные файлы в
          // поставке не нужны: иначе dist выглядит так, будто внешние ресурсы
          // всё ещё грузятся, и их легко случайно положить в архив.
          // Воркеры к этому моменту вложены в страницу как base64
          // (InlineWorkerSourcePlugin, стадия OPTIMIZE_INLINE идёт раньше).
          if (compiler.options.mode !== 'production') return
          for (const chunk of compilation.chunks) {
            for (const file of chunk.files) {
              if (/\.(js|css)$/.test(file)) compilation.deleteAsset(file)
            }
          }
        }
      )
    })
  }
}

module.exports = InlineChunksPlugin
