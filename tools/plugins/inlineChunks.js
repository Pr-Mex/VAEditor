// Встраивает содержимое собранных чанков прямо в HTML-страницу.
//
// Зачем: страница редактора открывается по протоколу file:// (временный каталог
// распакованного шаблона). Chromium/WebView2 считает каждый file:-URL уникальным
// origin'ом, поэтому загрузка внешних ресурсов (скриптов, стилей, чанков)
// блокируется с сообщением "Unsafe attempt to load URL ... 'file:' URLs are
// treated as unique security origins".
//
// После инлайна итоговый index.html не тянет ни одного внешнего файла.

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

        data.headTags = [...lazyTags, ...data.headTags.map(inline)]
        data.bodyTags = data.bodyTags.map(inline)
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
          if (!notInlined.length) return
          const message = 'Асинхронные чанки нельзя встроить в страницу: ' + notInlined.join(', ') +
            '. Их подгрузка по file:// в WebView2 заблокирована.'
          if (compiler.options.mode === 'production') throw new Error(message)
          compilation.warnings.push(new Error(message))
        }
      )
    })
  }
}

module.exports = InlineChunksPlugin
