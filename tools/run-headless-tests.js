// Прогон собранных автотестов в headless-браузере, без 1С.
//
// Зачем: цикл «собрать epf -> поднять 1С -> дождаться отчёта» занимает минуты,
// а этот прогон — секунды. Он не заменяет проверку в 1С (там свой WebView и
// свои ограничения), но ловит ошибки логики и сборки почти сразу.
//
// Использование: node tools/run-headless-tests.js [страница.html] [таймаут, с]

/* global fetch */
//
// Важно: раньше здесь использовался `--dump-dom --virtual-time-budget`.
// Виртуальное время проматывает setTimeout мгновенно, поэтому провайдер
// Gherkin успевал «не дождаться» воркера и уходил в главный поток: тесты
// зеленели за счёт аварийной ветки, а воркер вообще не проверялся. Поэтому
// браузер запускается с настоящим временем, а результат забирается через
// DevTools Protocol, пока страница не выставит заголовок passes=/failures=.

const { spawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const WebSocket = require('ws')

const root = path.resolve(__dirname, '..')
const page = path.resolve(root, 'dist', process.argv[2] || 'test.html')
const timeout = Number(process.argv[3] || 180) * 1000
const pollInterval = 250

if (!fs.existsSync(page)) {
  console.error('Нет ' + page + ': сначала выполните npm run build:test')
  process.exit(2)
}

const browsers = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'
]
const browser = browsers.find(file => fs.existsSync(file))
if (!browser) {
  console.error('Не найден Edge или Chrome в стандартных путях.')
  process.exit(2)
}

const url = 'file:///' + page.replace(/\\/g, '/') + '?test'
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'va-headless-'))

// Без --allow-file-access-from-files: Chrome, как и WebView 1С, не пускает
// воркер из соседнего файла, поэтому проверяется и запасной путь через blob.
const args = [
  '--headless=new',
  '--disable-gpu',
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-extensions',
  '--remote-debugging-port=0',
  '--user-data-dir=' + profile,
  url
]

const child = spawn(browser, args, { stdio: ['ignore', 'pipe', 'pipe'] })

let closed = false
function cleanup (code, message) {
  if (closed) return
  closed = true
  try { child.kill() } catch (error) { /* процесс уже мог завершиться */ }
  // Chrome держит файлы профиля ещё мгновение после kill.
  setTimeout(() => {
    try { fs.rmSync(profile, { recursive: true, force: true }) } catch (error) { /* не критично */ }
    if (message) console.error(message)
    process.exit(code)
  }, 200)
}

const deadline = setTimeout(
  () => cleanup(1, 'Автотесты не закончились за ' + timeout / 1000 + ' с.'),
  timeout
)

// Порт заранее неизвестен: Chrome печатает адрес отладки в stderr.
let port = 0
let buffered = ''
child.stderr.on('data', chunk => {
  buffered += chunk.toString()
  const match = buffered.match(/DevTools listening on ws:\/\/[^\s]*?[:/](\d+)\//)
  if (match && !port) {
    port = Number(match[1])
    main()
  }
})
child.on('exit', code => {
  if (!closed && !port) cleanup(2, 'Браузер завершился с кодом ' + code + ', порт отладки не получен.')
})

async function main () {
  try {
    const target = await pageTarget(port)
    const ws = new WebSocket(target.webSocketDebuggerUrl, { maxPayload: 256 * 1024 * 1024 })
    await new Promise((resolve, reject) => {
      ws.once('open', resolve)
      ws.once('error', reject)
    })

    let nextId = 0
    const pending = new Map()
    ws.on('message', data => {
      let message
      try { message = JSON.parse(data.toString()) } catch (error) { return }
      const item = pending.get(message.id)
      if (!item) return
      pending.delete(message.id)
      item(message)
    })

    const call = (method, params) => new Promise(resolve => {
      const id = ++nextId
      pending.set(id, resolve)
      ws.send(JSON.stringify({ id, method, params }))
    })

    const evaluate = expression => call('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: false
    })

    const polling = setInterval(async () => {
      const result = await evaluate(`JSON.stringify({
        title: document.title,
        report: (document.getElementById('headless-report') || {}).textContent || '',
        stats: window.mochaResults || null,
        diagnostics: (window.VAWorkerDiagnostics || []).slice()
      })`)

      const raw = result && result.result && result.result.result && result.result.result.value
      if (!raw) return
      const state = JSON.parse(raw)
      if (!/passes=\d+\s+failures=\d+/.test(state.title || '')) return

      clearInterval(polling)
      clearTimeout(deadline)
      ws.close()

      const summary = state.title.match(/passes=(\d+)\s+failures=(\d+)/)
      const passes = Number(summary[1])
      const failures = Number(summary[2])
      console.log('passes=' + passes + ' failures=' + failures)
      if (state.report) console.log(state.report.trim())
      const diagnostics = Array.from(new Set(state.diagnostics || []))
      if (diagnostics.length) console.log('Диагностика воркера: ' + diagnostics.join('; '))
      cleanup(failures === 0 ? 0 : 1)
    }, pollInterval)
  } catch (error) {
    cleanup(2, 'Не удалось подключиться к браузеру: ' + error.message)
  }
}

async function pageTarget (debugPort) {
  const endpoint = 'http://127.0.0.1:' + debugPort + '/json/list'
  const limit = Date.now() + 20000
  let lastError = null
  while (Date.now() < limit) {
    try {
      const response = await fetch(endpoint)
      const targets = await response.json()
      const found = targets.find(item => item.type === 'page' && item.webSocketDebuggerUrl)
      if (found) return found
    } catch (error) {
      lastError = error
    }
    await new Promise(resolve => setTimeout(resolve, 200))
  }
  throw lastError || new Error('страница не появилась в списке целей')
}
