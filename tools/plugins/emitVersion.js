// Кладёт версию сборки в dist рядом со страницей.
//
// Зачем: редактор встраивается в чужую обработку (Vanessa Automation), и той
// нужен признак «какой шаблон распакован в кеш». Раньше версия была вписана
// константой в коде обработки и дублировала package.json — при обновлении
// редактора её забывали поднять, и кеш оставался от старой сборки.
//
// Теперь версия лежит в самом архиве шаблона: обработка читает её из zip до
// распаковки и использует как ключ кеша.

const webpack = require('webpack')

class EmitVersionPlugin {
  constructor (version) {
    this.version = version
  }

  apply (compiler) {
    compiler.hooks.thisCompilation.tap('EmitVersionPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        { name: 'EmitVersionPlugin', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL },
        () => {
          const content = JSON.stringify({ version: this.version }, null, 2) + '\n'
          compilation.emitAsset('version.json', new webpack.sources.RawSource(content))
        }
      )
    })
  }
}

module.exports = EmitVersionPlugin
