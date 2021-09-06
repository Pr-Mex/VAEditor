import { getLineMaxColumn, getLineMinColumn } from '../../src/languages/turbo-gherkin/common';
import { VanessaGherkinProvider } from '../../src/languages/turbo-gherkin/provider';
import { language } from '../../src/languages/turbo-gherkin/configuration';
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
    model = monaco.editor.createModel(content, language.id);
  });
  it('Подсказка для шага без параметров', (done) => {
    hover(7).then(result => {
      expect(result).to.be.an('object').to.have.property('range').to.deep.equal(range(7));
      expect(result).to.have.property('contents').to.be.an('array').to.have.lengthOf(2);
      expect(result.contents[1].value).to.equal('Условие\\. Проверяет, что появилось окно предупреждения\\.');
      expect(result.contents[0].value).to.include('**UI\\.Всплывающие окна**');
      expect(result.contents[0].value).to.include('(#info:появилось-предупреждение-тогда)');
      expect(result.contents[0].value).to.include('(#sound:7)');
      done();
    })
  });
  it('Подсказка для шага со значением параметра', (done) => {
    hover(9).then(result => {
      expect(result).to.be.an('object').to.have.property('range').to.deep.equal(range(9));
      expect(result).to.have.property('contents').to.be.an('array').to.have.lengthOf(3);
      expect(result.contents[2].value).to.equal('**ИмяКнопки** = ФормаЗаписать');
      done();
    })
  });
  it('Подсказка для шага с ошибкой', (done) => {
    hover(10).then(result => {
      expect(result).to.be.an('object').to.have.property('range').to.deep.equal(range(10));
      expect(result).to.have.property('contents').to.be.an('array').to.be.empty;
      done();
    })
  });
  it('Подсказка для двух одинаковых параметров', (done) => {
    hover(11).then(result => {
      expect(result).to.have.property('contents').to.be.an('array').to.have.lengthOf(3);
      expect(result.contents[2].value).to.equal('**ИмяКоманды** = ЗаписатьИЗакрыть');
      done();
    })
  });
  it('Подсказка для двух разных параметров', (done) => {
    hover(12).then(result => {
      expect(result).to.have.property('contents').to.be.an('array').to.have.lengthOf(4);
      expect(result.contents[2].value).to.equal('**ИмяКоманды** = ЗаписатьИЗакрыть');
      expect(result.contents[3].value).to.equal('**ИмяТаблицы** = Номенклатура');
      done();
    })
  });
  it('Параметры в угловых скобках', (done) => {
    hover(13).then(result => {
      expect(result).to.have.property('contents').to.be.an('array').to.have.lengthOf(4);
      expect(result.contents[2].value).to.equal('**ИмяКоманды** = ЗаписатьИЗакрыть');
      expect(result.contents[3].value).to.equal('**ИмяТаблицы** = Номенклатура');
      done();
    })
  });
  it('Если первый параметр пустой', (done) => {
    hover(14).then(result => {
      expect(result).to.have.property('contents').to.be.an('array').to.have.lengthOf(3);
      expect(result.contents[2].value).to.equal('**ИмяТаблицы** = Номенклатура');
      done();
    })
  });
})
