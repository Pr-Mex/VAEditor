const autoprefixer = require('autoprefixer')

// Удаляет cursor: -webkit-image-set(...) из monaco-editor — старый 1С WebView
// эту форму не поддерживает, иначе курсор не отображается на mouse over.
// monaco пишет такое правило в base/browser/ui/mouseCursor/mouseCursor.css.
const removeWebkitImageSet = () => ({
  postcssPlugin: 'remove-webkit-image-set',
  Declaration: {
    cursor: (decl) => {
      if (decl.value.includes('-webkit-image-set')) decl.remove()
    }
  }
})
removeWebkitImageSet.postcss = true

module.exports = {
  plugins: [
    autoprefixer({
      overrideBrowserslist: ['safari >= 11', 'chrome >= 63', '> 1%'],
      extensions: ['.css']
    }),
    removeWebkitImageSet()
  ]
}
