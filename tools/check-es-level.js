// Проверка, что в собранной странице нет синтаксиса, который встроенный
// WebKit 1С (8.3.27) не разберёт.
//
// Почему не es2015: проверка на 2015 ругалась на код, который в 1С работает.
// WebKit платформы принимает `2 ** 24` (ES2016, buffer-polyfill) и `\p{L}`
// в unicode-регулярках (ES2018, monaco contextkey и marked) — страница с ними
// открывается в 1С, автотесты проходят. А вот `?.`, `??` (ES2020) и class
// fields (ES2022) роняют разбор всего бандла — их понижает esbuild-loader
// для monaco, и именно их должна ловить проверка. Граница — между 2018 и 2020.
//
// dist содержит только html: скрипты встраиваются в страницу плагином
// inlineChunks, отдельных .js нет. Поэтому блоки <script> без src вырезаются
// во временные файлы и отдаются es-check.
//
// Что не проверяется: воркеры — они лежат внутри страницы как base64
// (inlineWorkerSource), их текст здесь не разбирается.
//
// Использование: node tools/check-es-level.js

const { spawnSync } = require('child_process')
// acorn приезжает вместе с es-check — им же es-check и разбирает код.
const acorn = require('acorn')
const fs = require('fs')
const os = require('os')
const path = require('path')

const root = path.resolve(__dirname, '..')
const dist = path.join(root, 'dist')
const pages = ['index.html', 'test.html']
const version = 'es2018'

// package.json es-check наружу не отдаётся (в exports только "."), поэтому
// require.resolve('es-check/package.json') на Node 20 падает — ищем корень
// пакета от его точки входа.
function packageRoot (entry) {
  let dir = path.dirname(entry)
  for (;;) {
    if (fs.existsSync(path.join(dir, 'package.json'))) return dir
    const parent = path.dirname(dir)
    if (parent === dir) throw new Error('Не найден package.json пакета es-check')
    dir = parent
  }
}

const pkgRoot = packageRoot(require.resolve('es-check'))
const pkg = JSON.parse(fs.readFileSync(path.join(pkgRoot, 'package.json'), 'utf8'))
const cli = path.join(pkgRoot, Object.values(pkg.bin)[0])

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'va-escheck-'))
const files = []

// Тело скрипта ищется не по первому </script>: если такая строка встречается
// внутри кода (шаблон, строка), наивный разбор режет скрипт, и проверка ругается
// на обрыв вместо реальной находки. Перебираем закрывающие теги и берём первый,
// при котором тело разбирается как JS.
function isCode (text) {
  try {
    acorn.parse(text, { ecmaVersion: 'latest' })
    return true
  } catch (error) {
    return false
  }
}

function scriptBodies (html) {
  const bodies = []
  const open = /<script\b(?![^>]*\ssrc=)[^>]*>/gi
  const close = /<\/script>/gi
  let match
  while ((match = open.exec(html)) !== null) {
    const start = match.index + match[0].length
    // Блоки с типом вроде application/json — это данные, а не код.
    const type = match[0].match(/\btype\s*=\s*["']?([^"'\s>]+)/i)
    if (type && !/^(module|text\/javascript|application\/javascript)$/i.test(type[1])) {
      open.lastIndex = start
      continue
    }
    let body = null
    let end = start
    let closing
    close.lastIndex = start
    while ((closing = close.exec(html)) !== null) {
      const candidate = html.slice(start, closing.index)
      end = closing.index + closing[0].length
      if (isCode(candidate)) {
        body = candidate
        break
      }
    }
    if (body === null) continue
    open.lastIndex = end
    if (body.trim()) bodies.push(body)
  }
  return bodies
}

for (const page of pages) {
  const file = path.join(dist, page)
  if (!fs.existsSync(file)) {
    console.error('Нет ' + file + ': сначала выполните npm run buildci')
    process.exit(2)
  }
  const html = fs.readFileSync(file, 'utf8')
  scriptBodies(html).forEach((body, index) => {
    const target = path.join(dir, page.replace('.html', '') + '-' + index + '.js')
    fs.writeFileSync(target, body)
    files.push(target)
  })
}

if (!files.length) {
  console.error('В ' + pages.join(' и ') + ' нет встроенных скриптов — проверять нечего.')
  process.exit(2)
}

// Место находки и её окружение. Сама es-check печатает только
// «Unexpected token (7:14962)», а в минифицированной строке по такому адресу
// ничего не найти.
function parseError (file, ecmaVersion) {
  const code = fs.readFileSync(file, 'utf8')
  try {
    acorn.parse(code, { ecmaVersion })
    return null
  } catch (error) {
    const pos = typeof error.pos === 'number' ? error.pos : 0
    const line = error.loc ? error.loc.line : 1
    const column = error.loc ? error.loc.column + 1 : pos + 1
    const context = code.slice(Math.max(0, pos - 100), pos + 100).replace(/\s+/g, ' ')
    return { line, column, context }
  }
}

function report (title, found) {
  console.error(title)
  for (const item of found) {
    console.error('  ' + path.basename(item.file) + ':' + item.error.line + ':' + item.error.column)
    console.error('    ...' + item.error.context + '...')
  }
}

function cleanup () {
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch (error) {
    // Временный каталог уберёт система, если файл занят.
  }
}

// Разбор всегда печатается, даже если es-check потом пройдёт: иначе по логу
// не понять, отработала ли диагностика.
const latest = files
  .map(file => ({ file, error: parseError(file, 'latest') }))
  .filter(item => item.error)
const target = files
  .map(file => ({ file, error: parseError(file, 2015) }))
  .filter(item => item.error)

console.log('acorn: файлов ' + files.length + ', ошибок разбора: на последней версии ' + latest.length + ', на ' + version + ' ' + target.length)

// Если страницу не разобрать даже как самый свежий JS, виноват не бандл, а
// вырезание <script> из html: об этом надо сказать отдельно, иначе находка
// выглядит как «в коде новый синтаксис».
if (latest.length) {
  report('Не удалось разобрать встроенные скрипты — проверьте вырезание <script> из html:', latest)
}

// es-check ищет файлы через fast-glob: абсолютные виндовые пути она не берёт
// (обратная косая черта — escape), поэтому запускаем из временного каталога
// и передаём только имена файлов.
const names = files.map(f => path.basename(f))
const result = spawnSync(process.execPath, [cli, version, ...names], { stdio: 'inherit', cwd: dir })

cleanup()

// Контекст находок печатается только когда es-check действительно упал:
// иначе зелёный прогон сопровождался бы списком «этот WebKit не разберёт»,
// хотя acorn строже рантайма (см. шапку файла).
if (result.status === 0) {
  console.log('Синтаксис не новее ' + version + ': проверено ' + files.length + ' скриптов.')
} else if (target.length) {
  report('Синтаксис новее ' + version + ' — этот WebKit 1С не разберёт:', target)
}

process.exit(result.status === null ? 2 : result.status)
