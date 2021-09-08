import { getLineMaxColumn, getLineMinColumn } from '../../src/languages/turbo-gherkin/common';
import { VanessaGherkinProvider } from '../../src/languages/turbo-gherkin/provider';
import { language } from '../../src/languages/turbo-gherkin/configuration';
import { initGherkinProvider } from '../provider';
import * as steplist from './steplist.json'
let expect = require('chai').expect;

const variables = {
  ИмяКоманды: 'ЗаписатьИЗакрыть',
  ИмяКнопки: 'ФормаЗаписать',
  ИмяТаблицы: 'Номенклатура',
  ИмяКолонки: 'Наименование',
  ИмяРеквизита: 'Количество'
}

describe('Автоподстановка шагов при вводе', function () {
  let model: monaco.editor.ITextModel;
  let provider: VanessaGherkinProvider;
  const position = (lineNumber: number) => new monaco.Position(lineNumber, model.getLineMaxColumn(lineNumber));
  const competitions = (lineNumber: number = 1) => provider.provideCompletionItems(model, position(lineNumber)) as Promise<monaco.languages.CompletionList>;
  before(() => {
    provider = initGherkinProvider();
    provider.setStepList(JSON.stringify(steplist), true);
    provider.setVariables(JSON.stringify(variables));
  });
  it('Подсказка для пустой строки', (done) => {
    const content = " \t\t"
    model = monaco.editor.createModel(content, language.id);
    competitions().then(result => {
      expect(result).to.be.an('object').to.have.property('suggestions').to.be.an('array').to.have.lengthOf(10);
      result.suggestions.sort((a, b) => a.kind - b.kind);
      console.log(result);
      done();
    });
  });
  it('Подсказка для строки с ключевым словом', (done) => {
    const content = " \t\tИ это значит что список"
    model = monaco.editor.createModel(content, language.id);
    competitions().then(result => {
      expect(result).to.be.an('object').to.have.property('suggestions').to.be.an('array').to.have.lengthOf(6);
      result.suggestions.sort((a, b) => a.kind - b.kind);
      console.log(result);
      done();
    });
  });
  /*

        expect(result).to.be.an('object').to.have.property('range').to.deep.equal(range(7));
        expect(result).to.have.property('contents').to.be.an('array').to.have.lengthOf(2);
        expect(result.contents[1].value).to.equal('Условие\\. Проверяет, что появилось окно предупреждения\\.');
        expect(result.contents[0].value).to.include('**UI\\.Всплывающие окна**');
        expect(result.contents[0].value).to.include('(#info:появилось-предупреждение-тогда)');
        expect(result.contents[0].value).to.include('(#sound:7)');
  */
})
