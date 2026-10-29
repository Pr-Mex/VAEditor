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
    const body = block.replace(/^<script\b[^>]*>/i, '').replace(/<\/script>$/i, '')
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

// es-check ищет файлы через fast-glob: абсолютные виндовые пути она не берёт
// (обратная косая черта — escape), поэтому запускаем из временного каталога
// и передаём только имена файлов.
const names = files.map(f => path.basename(f))
const result = spawnSync(process.execPath, [cli, version, ...names], { stdio: 'inherit', cwd: dir })
try {
  fs.rmSync(dir, { recursive: true, force: true })
} catch (error) {
  // Временный каталог уберёт система, если файл занят.
}

if (result.status === 0) {
  console.log('Синтаксис не новее ' + version + ': проверено ' + files.length + ' скриптов.')
}
process.exit(result.status === null ? 2 : result.status)
