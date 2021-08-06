import steplist from '../example/StepList/ru.json'
import kws from '../example/Keywords/keywords.json'

export default function init() {

  const matchers = { ru: kws.ru, en: kws.en }

  const keywords = [
    'функционал', 'контекст', 'сценарий', 'структура сценария',
    'и', 'и это значит что', 'к тому же', 'и вот почему',
    'когда', 'тогда', 'затем', 'дано', 'если', 'тогда', 'импорт'
  ]

  const keypairs = { if: ['then'], Если: ['Тогда'] }

  const provider = window.VanessaGherkinProvider
  provider.setMatchers(JSON.stringify(matchers))
  provider.setKeywords(JSON.stringify(keywords))
  provider.setKeypairs(JSON.stringify(keypairs))
  provider.setStepList(JSON.stringify(steplist))
  return provider
}
