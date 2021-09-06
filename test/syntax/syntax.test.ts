import { VanessaGherkinProvider } from '../../src/languages/turbo-gherkin/provider';
import { language } from '../../src/languages/turbo-gherkin/configuration';
import * as content from './example.file.js'
let expect = require('chai').expect;

class SyntaxChecker {
  public model: monaco.editor.ITextModel;
  public markers: monaco.editor.IMarker[];

  constructor(content: string) {
    this.model = monaco.editor.createModel(content, language.id);
  }

  public async check(): Promise<void> {
    const provider = VanessaGherkinProvider.instance;
    await provider.checkSyntax(this.model);
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
  it('Ключевые слова в описании фичи', (done) => {
    const checker = new SyntaxChecker(content.f01);
    checker.check().then(() => {
      expect(checker.markers).to.be.an('array').to.have.lengthOf(1);
      expect(checker.value(0)).to.equal("Когда есть шаг с ошибкой ситнаксиса");
      done();
    });
  });
  it('Быстрые исправления: параметры в кавычках', (done) => {
    const checker = new SyntaxChecker(content.f02);
    checker.check().then(() => {
      expect(checker.markers).to.be.an('array').to.have.lengthOf(4);
      checker.action(0).then((act: monaco.languages.CodeActionList) => {
        expect(act).to.be.an('object').to.have.property('actions');
        expect(act.actions).to.be.an('array').to.have.lengthOf(7);
        expect(act.actions[0]).to.have.property("title", "в таблице 'ИмяКнопки' есть колонка с именем \"ИмяКоманды\" Тогда");
        done();
      });
    });
  });
  it('Быстрые исправления: параметры в угловых скобках', (done) => {
    const checker = new SyntaxChecker(content.f02);
    checker.check().then(() => {
      checker.action(1).then((act: monaco.languages.CodeActionList) => {
        expect(act).to.be.an('object').to.have.property('actions');
        expect(act.actions[0]).to.have.property("title", "поле с именем <Фамилия> не существует");
        done();
      });
    });
  });
  it('Быстрые исправления: числовые параметры', (done) => {
    const checker = new SyntaxChecker(content.f02);
    checker.check().then(() => {
      checker.action(2).then((act: monaco.languages.CodeActionList) => {
        expect(act).to.be.an('object').to.have.property('actions');
        expect(act.actions[0]).to.have.property("title", "в течение 30 секунд я выполняю");
        done();
      });
    });
  });
})
