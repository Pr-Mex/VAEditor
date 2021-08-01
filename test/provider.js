import steplist from '../example/StepList/ru.json'

export default function init () {
  const keywords = [
    'функционал', 'контекст', 'сценарий', 'структура сценария',
    'и', 'и это значит что', 'к тому же', 'и вот почему',
    'когда', 'тогда', 'затем', 'дано', 'если', 'тогда', 'импорт'
  ]

  const keypairs = { if: ['then'], Если: ['Тогда'] }

  const provider = window.VanessaGherkinProvider
  provider.setKeywords(JSON.stringify(keywords))
  provider.setKeypairs(JSON.stringify(keypairs))
  provider.setStepList(JSON.stringify(steplist))
  return provider
}
