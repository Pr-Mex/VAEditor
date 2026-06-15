// Origin https://github.com/peterschussheim/monaco-editor/blob/master/loaders/compile.js
// MIT License Copyright (c) 2018 Peter Schussheim
// Адаптировано под webpack 5 и упрощено под единственный use-case:
// компиляция worker'а в отдельную child compilation и возврат source-кода
// для последующей упаковки в blob URL (см. blobUrl loader). Worker никогда
// не записывается в dist.

const WebWorkerTemplatePlugin = require('webpack/lib/webworker/WebWorkerTemplatePlugin')
const EntryPlugin = require('webpack/lib/EntryPlugin')

// Полифил queueMicrotask внутри blob-воркера: у воркера свой глобальный контекст,
// полифил из main-бандла (src/polyfills.ts) туда не доезжает. monaco ≥0.32 зовёт
// queueMicrotask при загрузке (AsyncIterableObject.EMPTY, vs/base/common/async.js),
// которая попадает и в worker. Баннер (raw) встаёт раньше webpack-бутстрапа.
const WORKER_POLYFILL = 'if(typeof queueMicrotask!=="function"){var __qmt=Promise.resolve();self.queueMicrotask=function(cb){__qmt.then(cb).catch(function(e){setTimeout(function(){throw e},0)})}}'

module.exports.pitch = function pitch (remainingRequest) {
  this.cacheable(false)

  const currentCompilation = this._compilation
  const childCompiler = currentCompilation.createChildCompiler('worker', {
    filename: 'worker.js',
    publicPath: currentCompilation.outputOptions.publicPath
  }, [
    new WebWorkerTemplatePlugin(),
    new EntryPlugin(this.context, '!!' + remainingRequest, { name: 'main' })
  ])

  // Глушим запись на диск: нам нужен только source-код в памяти
  childCompiler.outputFileSystem = {
    mkdir: (_p, cb) => cb(),
    writeFile: (_p, _c, cb) => cb(),
    stat: (_p, cb) => cb(new Error('ENOENT'))
  }

  const callback = this.async()
  const beforeAssets = new Set(Object.keys(currentCompilation.assets))

  childCompiler.runAsChild((error, entries, compilation) => {
    if (error) { return callback(error) }
    const mainFilename = entries && entries[0] && Array.from(entries[0].files)[0]
    if (!mainFilename) { return callback(null, null) }
    const asset = compilation.assets[mainFilename] || currentCompilation.assets[mainFilename]
    const source = asset ? asset.source() : ''
    // Удаляем все ассеты, которые child compilation добавила в parent
    for (const name of Object.keys(currentCompilation.assets)) {
      if (!beforeAssets.has(name)) currentCompilation.deleteAsset(name)
    }
    // Префиксуем полифил queueMicrotask в исходник воркера (а не через
    // BannerPlugin — тот в child-compilation не доезжает до этого asset'а).
    callback(null, source ? WORKER_POLYFILL + '\n' + source : source)
  })
}
