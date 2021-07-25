import '../src/main'
import mocha from 'mocha'
import '../node_modules/mocha/mocha.css'
import * as dom from 'monaco-editor/esm/vs/base/browser/dom'

const $ = dom.$

const send = (url, test, err, status) => {
  var xhr = new XMLHttpRequest()
  xhr.open('POST', url, true)
  xhr.setRequestHeader('Content-Type', 'application/json')
  xhr.send(JSON.stringify({
    outcome: status,
    testName: test.title,
    fileName: test.parent.title,
    ErrorMessage: err.message,
    durationMilliseconds: test.duration
  }))
}

const autotest = (url) => {
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

  const keypairs = { if: ['then'], Если: ['Тогда'] }

  const provider = window.VanessaGherkinProvider
  provider.setKeywords(JSON.stringify(keywords))
  provider.setKeypairs(JSON.stringify(keypairs))

  window.createVanessaTabs()

  mocha.setup('bdd')
  const context = require.context('.', true, /.+\.ts$/)
  context.keys().forEach(context)
  var runner = mocha.run()

  if (url) {
    runner.on('pass', (test) => send(url + 'api/tests', test, {}, 'Passed'))
    runner.on('fail', (test, err) => send(url + 'api/tests', test, err, 'Failed'))
  }

  runner.on('end', () => {
    window.mochaResults = runner.stats
    document.getElementById('VanessaContainer').classList.add('vanessa-hidden')
    const button = $('button.vanessa-hidden', { id: 'AutotestResult' })
    document.body.appendChild(button).click()
    dom.removeClass(domMain, 'vanessa-hidden')
  })

  delete window.VanessaAutotest
}

if (process.argv.mode === 'development') {
  window.onload = () => autotest()
} else {
  window.VanessaAutotest = autotest
}
