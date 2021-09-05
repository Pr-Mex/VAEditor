import { getLineMaxColumn, getLineMinColumn } from '../../src/languages/turbo-gherkin/common';
import { VanessaGherkinProvider } from '../../src/languages/turbo-gherkin/provider';
import { content } from './example.file.js'
let expect = require('chai').expect;

const variables = {
  ИмяКоманды: 'ЗаписатьИЗакрыть',
  ИмяКнопки: 'ФормаЗаписать',
  ИмяТаблицы: 'Номенклатура',
  ИмяРеквизита: 'Количество'
}

describe('Всплывающие подсказки', function () {
  let model: monaco.editor.ITextModel;
  let provider: VanessaGherkinProvider;

  const position = (lineNumber: number) => new monaco.Position(lineNumber, model.getLineMaxColumn(lineNumber) - 1);
  const hover = (lineNumber: number) => provider.provideHover(model, position(lineNumber)) as Promise<monaco.languages.Hover>;

  const range = (lineNumber: number) => {
    const line = model.getLineContent(lineNumber);
    return new monaco.Range(lineNumber, getLineMinColumn(line), lineNumber, getLineMaxColumn(line));
  }

  before(() => {
    provider = VanessaGherkinProvider.instance;
    provider.setVariables(JSON.stringify(variables))
    model = monaco.editor.createModel(content, "turbo-gherkin");
  });
  it('Подсказка для простого шага', (done) => {
    hover(7).then(result => {
      console.log(result)
      expect(result).to.be.an('object').to.have.property('range').to.deep.equal(range(7));
      expect(result.contents[1].value).to.equal('Условие\\. Проверяет, что появилось окно предупреждения\.');
      expect(result.contents[0].value).to.include('**UI\\.Всплывающие окна**');
      expect(result.contents[0].value).to.include('(#info:появилось-предупреждение-тогда)');
      expect(result.contents[0].value).to.include('(#sound:7)');
      done();
    })
  });
})
