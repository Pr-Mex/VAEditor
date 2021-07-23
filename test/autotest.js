import '../src/main'
import mocha from 'mocha'
import '../node_modules/mocha/mocha.css'
import * as dom from 'monaco-editor/esm/vs/base/browser/dom'

const $ = dom.$

const autotest = () => {
  const domMain = $(
    'div.vanessa-hidden',
    { id: 'mocha-container' },
    $('div', { id: 'mocha' })
  )
  document.body.appendChild(domMain)

  const keywords = [
    'функционал', 'контекст', 'сценарий', 'структура сценария',
    'и', 'и это значит что', 'к тому же', 'и вот почему',
    'когда', 'тогда', 'затем', 'дано', 'если', 'тогда'
  ]

  const provider = window.VanessaGherkinProvider
  provider.setKeywords(JSON.stringify(keywords))

  const keypairs = { if: ['then'], Если: ['Тогда'] }
  provider.setKeypairs(JSON.stringify(keypairs))

  window.createVanessaTabs()
  mocha.setup('bdd')
  const context = require.context('.', true, /.+\.ts$/)
  context.keys().forEach(context)
  var runner = mocha.run()
  var failedTests = []

  runner.on('end', () => {
    window.mochaResults = runner.stats
    window.mochaResults.reports = failedTests
    document.getElementById('VanessaContainer').classList.add('vanessa-hidden')
    dom.removeClass(domMain, 'vanessa-hidden')
  })

  runner.on('fail', (test, err) => {
    var flattenTitles = function (test) {
      var titles = []
      while (test.parent.title) {
        titles.push(test.parent.title)
        test = test.parent
      }
      return titles.reverse()
    }
    failedTests.push({
      name: test.title,
      result: false,
      message: err.message,
      stack: err.stack,
      titles: flattenTitles(test)
    })
  })

  delete window.VanessaAutotest
}

if (process.argv.mode === 'development') {
  window.onload = autotest
} else {
  window.VanessaAutotest = autotest
}
