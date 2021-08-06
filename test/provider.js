import keywords from '../example/Keywords/keywords.json'
import steplist from '../example/StepList/ru.json'

export default function init() {
  const matchers = { ru: keywords.ru, en: keywords.en }
  const keypairs = { if: ['then'], Если: ['Тогда'] }
  const provider = window.VanessaGherkinProvider
  provider.setMatchers(JSON.stringify(matchers))
  provider.setKeypairs(JSON.stringify(keypairs))
  provider.setStepList(JSON.stringify(steplist))
  return provider
}
