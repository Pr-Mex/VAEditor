import keywords from '../example/Keywords/keywords.json'
import steplist from '../example/StepList/ru.json'

export default function init () {
  const keypairs = { if: ['then'], Если: ['Тогда'] }
  const provider = window.VanessaGherkinProvider
  provider.setKeypairs(JSON.stringify(keypairs))
  provider.setKeywords(JSON.stringify(keywords))
  provider.setStepList(JSON.stringify(steplist))
  return provider
}
