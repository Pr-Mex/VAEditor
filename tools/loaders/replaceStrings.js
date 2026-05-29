// Inline-замена string-replace-loader. Используется для патчей monaco
// под совместимость с 1С runtime (см. правила в webpack.config.js).

module.exports = function (source) {
  const { replacements } = this.getOptions() || {}
  if (!replacements) return source
  let out = source
  for (const { search, replace } of replacements) {
    out = out.split(search).join(replace)
  }
  return out
}
