// Origin https://github.com/peterschussheim/monaco-editor/blob/master/loaders/compile.js
// MIT License Copyright (c) 2018 Peter Schussheim
// Адаптировано под webpack 5 и упрощено под единственный use-case:
// компиляция worker'а в отдельную child compilation и возврат source-кода
// для последующей упаковки в blob URL (см. blobUrl loader). Worker никогда
// не записывается в dist.

const WebWorkerTemplatePlugin = require('webpack/lib/webworker/WebWorkerTemplatePlugin')
const EntryPlugin = require('webpack/lib/EntryPlugin')

// Полифилы внутри blob-воркера: у воркера СВОЙ глобальный контекст, polyfills.ts
// из main-бандла туда не доезжает. Движок 1С (~Safari 11.x) лишён этих рантайм-API,
// а monaco ≥0.45 использует их в worker-коде (globalThis/WeakRef/flat и пр.) при
// загрузке/работе → ReferenceError/TypeError убивают воркер (а main-поток виснет,
// ожидая его ответа). Баннер (raw) встаёт раньше webpack-бутстрапа. Только pure-JS
// (DOM-полифилы — matchMedia/ResizeObserver/Clipboard — воркеру не нужны).
const WORKER_POLYFILL = [
  'if(typeof globalThis==="undefined"){self.globalThis=self;}',
  'if(typeof queueMicrotask!=="function"){var __qmt=Promise.resolve();self.queueMicrotask=function(cb){__qmt.then(cb).catch(function(e){setTimeout(function(){throw e},0)})};}',
  'if(typeof WeakRef!=="function"){self.WeakRef=function(t){this._t=t};self.WeakRef.prototype.deref=function(){return this._t};}',
  'if(typeof FinalizationRegistry!=="function"){self.FinalizationRegistry=function(){};self.FinalizationRegistry.prototype.register=function(){};self.FinalizationRegistry.prototype.unregister=function(){return false};}',
  'if(typeof Array.prototype.flat!=="function"){Object.defineProperty(Array.prototype,"flat",{value:function(d){d=d===undefined?1:Number(d);return d<1?Array.prototype.slice.call(this):Array.prototype.reduce.call(this,function(a,v){return a.concat(Array.isArray(v)&&d>1?v.flat(d-1):v)},[])},writable:true,configurable:true});}',
  'if(typeof Array.prototype.flatMap!=="function"){Object.defineProperty(Array.prototype,"flatMap",{value:function(cb,t){return Array.prototype.map.call(this,cb,t).flat()},writable:true,configurable:true});}',
  'if(typeof Object.fromEntries!=="function"){Object.fromEntries=function(it){var o={},a=Array.from(it);for(var i=0;i<a.length;i++){o[a[i][0]]=a[i][1]}return o};}',
  'if(typeof Promise.allSettled!=="function"){Promise.allSettled=function(ps){return Promise.all(Array.from(ps).map(function(p){return Promise.resolve(p).then(function(v){return{status:"fulfilled",value:v}},function(r){return{status:"rejected",reason:r}})}))};}'
].join('')

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
