// Origin https://github.com/wang12124468/monaco-editor-esm-webpack-plugin/blob/master/src/loader.js
// MIT License Copyright (c) xiaoyong <454926339@qq.com>

module.exports = function (content, map, meta) {
  if (/monaco-editor[\\/]esm[\\/]vs.+\.js$/.test(this.resourcePath)) {
    const vsPath = this.resourcePath.split(/monaco-editor[\\/]esm[\\/]/).pop()
    if (vsPath) {
      const path = vsPath.replace(/\\/g, '/').replace('.js', '')
      // Дописываем путь модуля первым аргументом в call-sites localize( и localize2(
      // (0.45: добавился localize2 -> ILocalizedString). Lookbehind исключает
      // объявления `function localize(` / `function localize2(`.
      return content.replace(/(?<!function )(localize2?)\(/g, `$1('${path}', `)
    }
  }
  return content
}
