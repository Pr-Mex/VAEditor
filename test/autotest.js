import mocha from 'mocha'
import '../node_modules/mocha/mocha.css'
import * as demo from './demo/editor-demo'
import * as dom from 'monaco-editor/esm/vs/base/browser/dom'
import initGherkinProvider from './provider.js'

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

  window.createVanessaTabs()
  initGherkinProvider()

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
    domMain.classList.remove('vanessa-hidden')
  })

  delete window.VanessaAutotest
}

const parseQueryString = function () {
  let str = window.location.search;
  let objURL = {};
  str.replace(
    new RegExp("([^?=&]+)(=([^&]*))?", "g"),
    function ($0, $1, $2, $3) {
      objURL[$1] = $3;
    }
  );
  return objURL;
};

let params = parseQueryString()
Object.keys(params).forEach(key => params[key] = true)
if (params.grep || process.argv.env.test) {
  window.onload = () => autotest()
} else if (params.demo || (process.argv.env.demo)) {
  window.onload = () => demo.show()
} else {
  window.VanessaAutotest = autotest
  window.VanessaDemo = demo.show
}
