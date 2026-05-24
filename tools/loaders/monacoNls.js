// Origin https://github.com/wang12124468/monaco-editor-esm-webpack-plugin/blob/master/src/loader.js
// MIT License Copyright (c) xiaoyong <454926339@qq.com>

module.exports = function (content, map, meta) {
  if (/monaco-editor[\\/]esm[\\/]vs.+\.js$/.test(this.resourcePath)) {
    const vsPath = this.resourcePath.split(/monaco-editor[\\/]esm[\\/]/).pop()
    if (vsPath) {
      const path = vsPath.replace(/\\/g, '/').replace('.js', '')
      // Avoid patching function declarations like `function localize(` — only patch call-sites
      return content.replace(/(?<!function )localize\(/g, `localize('${path}', `)
    }
  }
  return content
}
