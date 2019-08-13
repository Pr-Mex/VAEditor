const base64 = require('postcss-base64')
const alter = require('postcss-alter-property-value')

module.exports = {
  plugins: [
    base64({
      extensions: ['.svg', '.svg']
    }),
    alter({
      declarations: {
        'cursor': {
          task: 'remove',
          whenRegex: {
            value: '-webkit-image-set'
          }
        }
      }
    })
  ]
}
