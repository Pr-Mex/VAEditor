const base64 = require('./tools/postcss/postcss-base64')
const alter = require('postcss-alter-property-value')
const autoprefixer = require('autoprefixer')

module.exports = {
  plugins: [
    autoprefixer({
      overrideBrowserslist: ['ie >= 8', 'last 4 version'],
      extensions: ['.css']
    }),
    base64({
      extensions: ['.svg']
    }),
    base64({
      extensions: ['.ttf'],
      excludeAtFontFace: false,
      root: 'node_modules/monaco-editor/esm/vs/base/browser/ui/codiconLabel/codicon'
    }),
    alter({
      declarations: {
        // exclude unsupported 1c webkit css modifier
        // to fix non-displayed cursor on mouse over at line numbers
        cursor: {
          task: 'remove',
          whenRegex: {
            value: '-webkit-image-set'
          }
        }
      }
    })
  ]
}
