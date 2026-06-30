// Inline-замена string-replace-loader. Используется для патчей monaco
// под совместимость с 1С runtime (см. правила в webpack.config.js).
//
// Self-check: monaco дрейфует между релизами. Если search-паттерн исчез,
// split/join тихо ничего не делает → патч НЕ накладывается, а ломается только в
// реальной 1С (CI зелёный, баг невидим). Копим число замен по каждому паттерну за
// всю сборку; assertApplied() (зовётся плагином на afterEmit) валит сборку, если
// какой-то паттерн ни разу не совпал.

const counts = Object.create(null) // search -> суммарно замен за сборку

module.exports = function (source) {
  const { replacements } = this.getOptions() || {}
  if (!replacements) return source
  let out = source
  for (const { search, replace } of replacements) {
    const parts = out.split(search)
    if (!(search in counts)) counts[search] = 0
    counts[search] += parts.length - 1
    out = parts.join(replace)
  }
  return out
}

module.exports.counts = counts

// Бросает, если какой-либо паттерн за сборку не совпал ни разу (дрейф monaco).
module.exports.assertApplied = function () {
  const missing = Object.keys(counts).filter(function (s) { return counts[s] === 0 })
  if (missing.length) {
    throw new Error(
      'replace-strings: обязательные патчи monaco НЕ наложены (дрейф версии monaco?):\n' +
      missing.map(function (s) { return '  • ' + s }).join('\n') +
      '\nБез них бандл ломается в WebKit 1С. Обновите паттерны под текущую версию monaco.'
    )
  }
}
