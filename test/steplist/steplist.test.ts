import { getLineMaxColumn, getLineMinColumn } from '../../src/languages/turbo-gherkin/common';
import { VanessaGherkinProvider } from '../../src/languages/turbo-gherkin/provider';
import { language } from '../../src/languages/turbo-gherkin/configuration';
import { initGherkinProvider } from '../provider';
import * as steplist from './steplist.json'
let expect = require('chai').expect;

const elements = {
  ИмяКоманды: 'ЗаписатьИЗакрыть',
  ИмяКнопки: 'ФормаЗаписать',
  ИмяТаблицы: 'Номенклатура',
  ИмяКолонки: 'Наименование',
  ИмяРеквизита: 'Количество'
}

const variables = {
  Отправитель: 'Иванов Николай',
  Получатель: 'Петров Василий',
  Номенклатура: 'Столешница',
}

describe('Автоподстановка шагов при вводе', function () {
  let model: monaco.editor.ITextModel;
  let provider: VanessaGherkinProvider;
  const position = (lineNumber: number) => new monaco.Position(lineNumber, model.getLineMaxColumn(lineNumber));
  const competitions = (lineNumber: number = 1) => provider.provideCompletionItems(model, position(lineNumber)) as Promise<monaco.languages.CompletionList>;
  before(() => {
    provider = initGherkinProvider();
    provider.setStepList(JSON.stringify(steplist), true);
    provider.setElements(JSON.stringify(elements), true);
    provider.setVariables(JSON.stringify(variables), true);
  });
  it('Подсказка для пустой строки', (done) => {
    const content = "\t\t";
    model = monaco.editor.createModel(content, language.id);
    competitions().then(result => {
      expect(result).to.be.an('object').to.have.property('suggestions').to.be.an('array').to.have.lengthOf(10);
      result.suggestions.sort((a, b) => a.kind - b.kind);
      let step = result.suggestions[0];
      expect(step).to.have.property('detail', 'UI.Таблицы.Выбор таблицы');
      expect(step).to.have.property('documentation', 'Выбирает таблицу для работы');
      expect(step).to.have.property('filterText', 'я буду работать с таблицей');
      expect(step).to.have.property('insertText', 'Затем я буду работать с таблицей "ТаблицаФормы"\n');
      expect(step).to.have.property('label', 'я буду работать с таблицей "ТаблицаФормы"');
      expect(step).to.have.property('kind', 1);
      done();
    });
  });
  it('Подсказка для строки с ключевым словом', (done) => {
    const content = "\t\tИ это значит что список";
    model = monaco.editor.createModel(content, language.id);
    competitions().then(result => {
      expect(result).to.be.an('object').to.have.property('suggestions').to.be.an('array').to.have.lengthOf(6);
      result.suggestions.sort((a, b) => a.kind - b.kind);
      let step = result.suggestions[0];
      expect(step).to.have.property('detail', 'UI.Таблицы.Выбор таблицы');
      expect(step).to.have.property('documentation', 'Выбирает таблицу для работы');
      expect(step).to.have.property('filterText', 'И это значит что я буду работать с таблицей');
      expect(step).to.have.property('insertText', 'И это значит что я буду работать с таблицей "ТаблицаФормы"\n');
      expect(step).to.have.property('label', 'я буду работать с таблицей "ТаблицаФормы"');
      expect(step).to.have.property('kind', 1);
      done();
    });
  });
  it('Подсказка с заменой элементов формы', (done) => {
    const content = "\t\tИ список";
    model = monaco.editor.createModel(content, language.id);
    competitions().then(result => {
      expect(result).to.be.an('object').to.have.property('suggestions').to.be.an('array').to.have.lengthOf(6);
      result.suggestions.sort((a, b) => a.kind - b.kind);
      let step = result.suggestions[1];
      expect(step).to.have.property('filterText', 'И в открытой форме в таблице я нажимаю кнопку выбора у реквизита');
      expect(step).to.have.property('insertText', 'И В открытой форме в таблице \"Номенклатура\" я нажимаю кнопку выбора у реквизита \"Наименование\"\n');
      expect(step).to.have.property('label', 'В открытой форме в таблице \"Номенклатура\" я нажимаю кнопку выбора у реквизита \"Наименование\"');
      done();
    });
  });
  it('Подстановка шага с таблицей', (done) => {
    const content = "\t\tИ список";
    model = monaco.editor.createModel(content, language.id);
    competitions().then(result => {
      expect(result).to.be.an('object').to.have.property('suggestions').to.be.an('array').to.have.lengthOf(6);
      result.suggestions.sort((a, b) => a.kind - b.kind);
      let step = result.suggestions[5];
      expect(step).to.have.property('filterText', 'И таблица содержит строки');
      expect(step).to.have.property('insertText', 'И таблица \"Номенклатура\" содержит строки:\n\t| ИмяКолонки1 | ИмяКолонки2 |\n\t| Значение1 | Значение2 |\n');
      expect(step).to.have.property('label', 'таблица \"Номенклатура\" содержит строки:');
      done();
    });
  });
  it('Подстановка переменных', (done) => {
    const content = "\t\tИ поле <Контрагент>";
    model = monaco.editor.createModel(content, language.id);
    const position = new monaco.Position(1, model.getLineMaxColumn(1) - 3);
    (provider.provideCompletionItems(model, position) as Promise<monaco.languages.CompletionList>).then(result => {
      expect(result).to.be.an('object').to.have.property('suggestions').to.be.an('array').to.have.lengthOf(3);
      result.suggestions.sort((a, b) => a.label < b.label ? -1 : (a.label > b.label ? 1 : 0));
      let range = { startLineNumber: 1, startColumn: 10, endLineNumber: 1, endColumn: 22 }
      let step = result.suggestions[0];
      expect(step).to.be.an('object').to.have.property('range').to.deep.equal(range);
      expect(step).to.have.property('label', '"Номенклатура" = Столешница');
      expect(step).to.have.property('filterText', '<Контрагент>Номенклатура');
      expect(step).to.have.property('insertText', '<Номенклатура>');
      expect(step).to.have.property('kind', 4);
      done();
    });
  });
})
