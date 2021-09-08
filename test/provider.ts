import { VanessaGherkinProvider } from '../src/languages/turbo-gherkin/provider';
import * as keywords from '../example/Keywords/keywords.json'
import * as steplist from '../example/StepList/ru.json'

export function initGherkinProvider () {
  const keypairs = { if: ['then'], Если: ['Тогда'] };
  const provider = window["VanessaGherkinProvider"];
  provider.setKeypairs(JSON.stringify(keypairs));
  provider.setKeywords(JSON.stringify(keywords));
  provider.setStepList(JSON.stringify(steplist));
  return provider as VanessaGherkinProvider;
}
