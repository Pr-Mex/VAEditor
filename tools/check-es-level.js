// Проверка, что в собранной странице нет синтаксиса новее ES2015.
//
// Зачем: webpack собирает с target es2015, а esbuild понижает ?. и class fields
// из esbuild-сборки monaco — встроенный WebKit 1С (8.3.27) их не парсит, и тогда
// падает не одна строка, а весь бандл. Проверка ловит это до запуска в 1С.
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
const version = 'es2015'

// package.json es-check наружу не отдаётся (в exports только "."), поэтому
// require.resolve('es-check/package.json') на Node 20 падает — ищем корень
// пакета от его точки входа.
function packageRoot(entry) {
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

for (const page of pages) {
  const file = path.join(dist, page)
  if (!fs.existsSync(file)) {
    console.error('Нет ' + file + ': сначала выполните npm run buildci')
    process.exit(2)
  }
  const html = fs.readFileSync(file, 'utf8')
  // Только встроенные скрипты: у внешних есть src, их текст здесь ни при чём.
  const scripts = html.match(/<script\b(?![^>]*\ssrc=)[^>]*>[\s\S]*?<\/script>/gi) || []
  scripts.forEach((block, index) => {
    const open = block.match(/^<script\b[^>]*>/i)[0]
    // Блоки с типом вроде application/json — это данные, а не код.
    const type = open.match(/\btype\s*=\s*["']?([^"'\s>]+)/i)
    if (type && !/^(module|text\/javascript|application\/javascript)$/i.test(type[1])) return
    const body = block.slice(open.length).replace(/<\/script>$/i, '')
    if (!body.trim()) return
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
function parseError(file, ecmaVersion) {
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

function report(title, found) {
  console.error(title)
  for (const item of found) {
    console.error('  ' + path.basename(item.file) + ':' + item.error.line + ':' + item.error.column)
    console.error('    ...' + item.error.context + '...')
  }
}

function cleanup() {
  try {
    fs.rmSync(dir, { recursive: true, force: true })
  } catch (error) {
    // Временный каталог уберёт система, если файл занят.
  }
}

// Если страницу не разобрать даже как самый свежий JS, виноват не бандл, а
// вырезание <script> из html: об этом надо сказать отдельно, иначе находка
// выглядит как «в коде новый синтаксис».
const broken = files
  .map(file => ({ file, error: parseError(file, 'latest') }))
  .filter(item => item.error)

if (broken.length) {
  report('Не удалось разобрать встроенные скрипты — проверьте вырезание <script> из html:', broken)
  cleanup()
  process.exit(2)
}

// es-check ищет файлы через fast-glob: абсолютные виндовые пути она не берёт
// (обратная косая черта — escape), поэтому запускаем из временного каталога
// и передаём только имена файлов.
const names = files.map(f => path.basename(f))
const result = spawnSync(process.execPath, [cli, version, ...names], { stdio: 'inherit', cwd: dir })

if (result.status !== 0) {
  const found = files
    .map(file => ({ file, error: parseError(file, 2015) }))
    .filter(item => item.error)
  if (found.length) {
    report('Синтаксис новее ' + version + ' — этот WebKit 1С не разберёт:', found)
  }
}

cleanup()

if (result.status === 0) {
  console.log('Синтаксис не новее ' + version + ': проверено ' + files.length + ' скриптов.')
}
process.exit(result.status === null ? 2 : result.status)
