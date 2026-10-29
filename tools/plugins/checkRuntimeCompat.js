// Проверяет, что собранный бандл не содержит синтаксиса, который не разбирает
// встроенный в 1С:Предприятие WebKit.
//
// Зачем: готовая страница исполняется не в современном браузере, а в старом
// WebKit внутри поля HTML. Уже ловили регресс: terser с настройками по умолчанию
// генерировал `a ?? b` — отсюда ecma: 2015 и ascii_only в настройках
// минификатора. Эта проверка ловит такой регресс на сборке, а не через полчаса
// прогона автотеста в 1С.
//
// Разбор настоящим парсером (acorn), а не регулярками: бандл минифицирован и
// весит мегабайты, любые эвристики на нём дают ложные срабатывания.

const webpack = require('webpack')

// acorn приходит вместе с webpack: разбирать JS самим нечем и незачем.
const acorn = require('acorn')

// Уровень синтаксиса, который понимает рантайм 1С. Проверено на практике:
// `**` (ES2016) работает — monaco использует его и редактор запускается.
// Всё, что новее ES2020, парсер не примет вовсе, а `??` и `?.` запрещены
// отдельно: именно они ломали страницу.
const ECMA_VERSION = 2020

const FORBIDDEN_TOKENS = new Map([
  [acorn.tokTypes.coalesce, 'оператор ?? — ломает WebKit 1С'],
  [acorn.tokTypes.questionDot, 'оператор ?. — ломает WebKit 1С']
])

// При ascii_only не-ASCII символов в коде быть не должно: их экранирует terser.
const NON_ASCII = /[^\x00-\x7F]/

const PARSE_OPTIONS = {
  ecmaVersion: ECMA_VERSION,
  sourceType: 'script',
  allowHashBang: true
}

// Проверка идёт по продакшн-сборке: dev-сборка исполняется в браузере, где
// ограничений нет.
function enabled (compiler) {
  return compiler.options.mode === 'production'
}

function position (source, index) {
  const before = source.slice(0, index)
  const line = before.split('\n').length
  const column = index - before.lastIndexOf('\n')
  return line + ':' + column
}

// Минифицированный код — одна строка на мегабайт, поэтому показываем не начало
// строки, а окно вокруг проблемного места.
function context (source, index) {
  const from = Math.max(0, index - 60)
  const to = Math.min(source.length, index + 60)
  return (from > 0 ? '…' : '') +
    source.slice(from, to).replace(/\s+/g, ' ') +
    (to < source.length ? '…' : '')
}

function describe (source, index, text) {
  return text + ' (' + position(source, index) + '): ' + context(source, index)
}

function syntaxProblems (source) {
  try {
    acorn.parse(source, PARSE_OPTIONS)
  } catch (error) {
    const index = typeof error.pos === 'number' ? error.pos : 0
    return [describe(source, index, 'синтаксис новее ES' + ECMA_VERSION + ': ' + error.message)]
  }

  const problems = []
  const tokenizer = acorn.tokenizer(source, PARSE_OPTIONS)
  for (let token = tokenizer.getToken(); token.type !== acorn.tokTypes.eof; token = tokenizer.getToken()) {
    const name = FORBIDDEN_TOKENS.get(token.type)
    if (name) problems.push(describe(source, token.start, name))
  }
  return problems
}

class RuntimeCompatPlugin {
  apply (compiler) {
    if (!enabled(compiler)) return

    compiler.hooks.compilation.tap('RuntimeCompatPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        { name: 'RuntimeCompatPlugin', stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ANALYSE },
        () => {
          const problems = []

          for (const asset of compilation.getAssets()) {
            if (!asset.name.endsWith('.js')) continue
            const source = asset.source.source().toString()

            for (const problem of syntaxProblems(source)) problems.push(asset.name + ' — ' + problem)

            const nonAscii = NON_ASCII.exec(source)
            if (nonAscii) {
              problems.push(asset.name + ' — ' + describe(source, nonAscii.index, 'не-ASCII символ в коде'))
            }
          }

          if (!problems.length) return

          throw new Error(
            'Бандл не совместим со встроенным WebKit 1С:Предприятия:\n  ' + problems.join('\n  ')
          )
        }
      )
    })
  }
}

module.exports = RuntimeCompatPlugin
