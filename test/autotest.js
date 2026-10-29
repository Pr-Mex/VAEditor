import '../src/polyfills' // ПЕРВЫМ: queueMicrotask/ResizeObserver до загрузки monaco

// Страница автотестов — та же страница редактора: разметку, провайдер и
// публичный API создаёт src/main. Без этого импорта test.html остаётся пустым.
import '../src/main'
import mocha from 'mocha'
import '../node_modules/mocha/mocha.css'
import * as demo from './demo/editor-demo'
import * as dom from 'monaco-editor/esm/vs/base/browser/dom'
import { initGherkinProvider } from './provider'

const $ = dom.$

const autotest = () => {
  const domMain = $(
    'div.vanessa-hidden',
    { id: 'mocha-container' },
    $('div', { id: 'mocha' })
  )
  document.body.appendChild(domMain)

  window.createVanessaTabs()
  initGherkinProvider()

  mocha.setup('bdd')
  const context = require.context('.', true, /.+\.test\.ts$/)
  context.keys().forEach(context)

  const failures = []

  // Диагностика: без этого причина молчаливого зависания не видна в отчёте —
  // тест просто падает по таймауту, а ошибка промиса теряется.
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason
    failures.push('Необработанный промис: ' + ((reason && reason.message) || reason))
  })
  window.addEventListener('error', (event) => {
    failures.push('Ошибка страницы: ' + (event.message || event.error))
  })

  var runner = mocha.run()

  runner.on('fail', (test, err) => {
    failures.push(test.fullTitle() + ' — ' + (err && err.message ? err.message : ''))
  })

  runner.on('end', () => {
    window.mochaResults = runner.stats
    // Видно, работал воркер или страница перешла на главный поток.
    const diag = window.VAWorkerDiagnostics
    if (diag && diag.length) {
      failures.push('Диагностика воркера: ' + Array.from(new Set(diag)).join('; '))
    }
    // Строкой, а не массивом: из поля HTML в 1С так надёжнее.
    window.mochaFailures = failures.join('\n')
    // Заголовок и <pre> нужны headless-прогону: --dump-dom отдаёт только DOM.
    document.title = 'passes=' + runner.stats.passes + ' failures=' + runner.stats.failures
    const report = document.createElement('pre')
    report.id = 'headless-report'
    report.textContent = window.mochaFailures
    document.body.appendChild(report)
    document.getElementById('VanessaContainer').classList.add('vanessa-hidden')
    const button = $('button.vanessa-hidden', { id: 'AutotestResult' })
    document.body.appendChild(button).click()
    domMain.classList.remove('vanessa-hidden')
  })

  delete window.VanessaAutotest
}

const parseQueryString = function () {
  const str = window.location.search
  const objURL = {}
  str.replace(
    new RegExp('([^?=&]+)(=([^&]*))?', 'g'),
    function ($0, $1, $2, $3) {
      objURL[$1] = $3
    }
  )
  return objURL
}

const params = parseQueryString()
Object.keys(params).forEach(key => params[key] = true)
if (params.grep || params.test) {
  window.onload = () => autotest()
} else if (params.demo) {
  window.onload = () => demo.show()
} else {
  window.VanessaAutotest = autotest
  window.VanessaDemo = demo.show
}
