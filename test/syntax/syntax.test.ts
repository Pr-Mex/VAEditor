import { VanessaGherkinProvider } from '../../src/languages/turbo-gherkin/provider';
import * as content from './example.file.js'
let expect = require('chai').expect;

class SyntaxChecker {
  public model: monaco.editor.ITextModel;
  public markers: monaco.editor.IMarker[];

  constructor(content: string) {
    this.model = monaco.editor.createModel(content, "turbo-gherkin");
    const provider = VanessaGherkinProvider.instance;
    provider.checkSyntax(this.model);
    this.markers = monaco.editor.getModelMarkers({ owner: "syntax", resource: this.model.uri });
  }

  public value(n: number) {
    return this.model.getValueInRange(this.markers[n])
  }

  action(n: number): any {
    const m = this.markers[n];
    const provider = VanessaGherkinProvider.instance;
    const context = { markers: [this.markers[n]], readonly: false };
    const range = new monaco.Range(m.startLineNumber, m.startColumn, m.endLineNumber, m.endColumn);
    return provider.provideCodeActions(this.model, range, context, undefined);
  }
}

describe('Проверка синтаксиса', function () {
  const provider = VanessaGherkinProvider.instance;
  it('Ключевые слова в описании фичи', () => {
    const checker = new SyntaxChecker(content.f01);
    expect(checker.markers).to.be.an('array').to.have.lengthOf(1);
    expect(checker.value(0)).to.equal("Когда есть шаг с ошибкой ситнаксиса");
  });
  it('Быстрые исправления ошибок 1', (done) => {
    const checker = new SyntaxChecker(content.f02);
    expect(checker.markers).to.be.an('array').to.have.lengthOf(4);
    checker.action(0).then((act: monaco.languages.CodeActionList) => {
      expect(act).to.be.an('object').to.have.property('actions');
      expect(act.actions).to.be.an('array').to.have.lengthOf(1);
      expect(act.actions[0]).to.have.property("title", "имя текущей формы \"ФормаСписка\" Тогда");
      done();
    });
  });
  it('Быстрые исправления ошибок 2', (done) => {
    const checker = new SyntaxChecker(content.f02);
    checker.action(1).then((act: monaco.languages.CodeActionList) => {
      expect(act).to.be.an('object').to.have.property('actions');
      expect(act.actions[0]).to.have.property("title", "поле с именем <Фамилия> не существует");
      //    expect(checker.action(2).actions[0]).to.have.property("title", "в течение 30 секунд я выполняю");
      done();
    });
  });
})
