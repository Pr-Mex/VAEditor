import { VanessaGherkinProvider } from '../../src/languages/turbo-gherkin/provider';
import { language } from '../../src/languages/turbo-gherkin/configuration';
import { initGherkinProvider } from '../provider';
import * as content from './example.file.js'
import { IVanessaModel } from '../../src/languages/turbo-gherkin/common';
let expect = require('chai').expect;
let provider;

class SyntaxChecker {
  public model: monaco.editor.ITextModel;
  public markers: monaco.editor.IMarker[];

  constructor(content: string) {
    this.model = monaco.editor.createModel(content, language.id);
  }

  public async check(): Promise<void> {
    return provider.checkSyntax(this.model).then(() => {
      this.markers = monaco.editor.getModelMarkers({ owner: "syntax", resource: this.model.uri });
    });
  }

  public value(n: number) {
    return this.model.getValueInRange(this.markers[n])
  }

  action(n: number): any {
    const m = this.markers[n];
    const context = { markers: [this.markers[n]], readonly: false };
    const range = new monaco.Range(m.startLineNumber, m.startColumn, m.endLineNumber, m.endColumn);
    return provider.provideCodeActions(this.model, range, context, undefined);
  }
}

function range(lineNumber: number) {
  return new monaco.Range(lineNumber, 1, lineNumber, 1);
}

describe('Проверка синтаксиса', function () {
  before(() => {
    provider = initGherkinProvider();
  });
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
  it('Шаги с условными операторами', (done) => {
    const checker = new SyntaxChecker(content.f03);
    checker.check().then(() => {
      expect(checker.markers).to.be.an('array').to.have.lengthOf(2);
      expect(checker.value(0)).to.equal('Если есть картинка "ИмяКартинки"');
      expect(checker.value(1)).to.equal('И я нажимаю ENTER Тогда');
      done();
    });
  });
  it('Декорация групп пиктограммами', (done) => {
    let model = monaco.editor.createModel(content.f04, language.id);
    provider.provideFoldingRanges(model, undefined, undefined).then(() => {
      provider.checkSyntax(model).then(() => {
        let decorations = model.getLinesDecorations(1, model.getLineCount());
        expect(decorations).to.be.an('array').to.have.lengthOf(8);
        expect(decorations[0]).to.have.property('range').to.deep.equal(range(16));
        expect(decorations[0]).to.have.property('options').to.have.property('glyphMarginClassName', 'codicon-triangle-right');
        expect(decorations[0]).to.have.property('options').to.have.property('inlineClassName', null);
        expect(decorations[1]).to.have.property('range').to.deep.equal(range(20));
        expect(decorations[1]).to.have.property('options').to.have.property('glyphMarginClassName', 'codicon-triangle-right');
        expect(decorations[1]).to.have.property('options').to.have.property('inlineClassName', 'vanessa-style-bold');
        expect(decorations[3]).to.have.property('range').to.deep.equal(range(26));
        expect(decorations[3]).to.have.property('options').to.have.property('glyphMarginClassName', 'codicon-triangle-right');
        expect(decorations[3]).to.have.property('options').to.have.property('inlineClassName', 'vanessa-style-bold');
        expect(decorations[7]).to.have.property('range').to.deep.equal(range(40));
        expect(decorations[7]).to.have.property('options').to.have.property('glyphMarginClassName', 'codicon-triangle-right');
        expect(decorations[7]).to.have.property('options').to.have.property('inlineClassName', 'vanessa-style-bold');
        done();
      });
    });
  });
  it('Декорация импортируемых подсценариев', (done) => {
    let model = monaco.editor.createModel(content.f04, language.id);
    provider.provideFoldingRanges(model, undefined, undefined).then(() => {
      provider.checkSyntax(model).then(() => {
        let decorations = model.getLinesDecorations(1, model.getLineCount());
        expect(decorations[2]).to.have.property('range').to.deep.equal({ startLineNumber: 23, startColumn: 2, endLineNumber: 23, endColumn: 74 });
        expect(decorations[2]).to.have.property('options').to.have.property('glyphMarginClassName', null);
        expect(decorations[2]).to.have.property('options').to.have.property('inlineClassName', 'vanessa-style-underline');
        done();
      });
    });
  });
  it('Декорация условных операторов и циклов', (done) => {
    let model = monaco.editor.createModel(content.f04, language.id);
    provider.provideFoldingRanges(model, undefined, undefined).then(() => {
      provider.checkSyntax(model).then(() => {
        let decorations = model.getLinesDecorations(1, model.getLineCount());
        console.log(decorations);
        expect(decorations[4]).to.have.property('range').to.deep.equal(range(28));
        expect(decorations[4]).to.have.property('options').to.have.property('glyphMarginClassName', 'codicon-symbol-class');
        expect(decorations[4]).to.have.property('options').to.have.property('inlineClassName', null);
        expect(decorations[5]).to.have.property('range').to.deep.equal(range(32));
        expect(decorations[5]).to.have.property('options').to.have.property('glyphMarginClassName', 'codicon-git-compare');
        expect(decorations[5]).to.have.property('options').to.have.property('inlineClassName', null);
        expect(decorations[6]).to.have.property('range').to.deep.equal(range(33));
        expect(decorations[6]).to.have.property('options').to.have.property('glyphMarginClassName', 'codicon-symbol-class');
        expect(decorations[6]).to.have.property('options').to.have.property('inlineClassName', null);
        done();
      });
    });
  });
  it('Картинки в тексте сценария', (done) => {
    const checker = new SyntaxChecker(content.f03);
    checker.check().then(() => {
      const model = checker.model as IVanessaModel;
      expect(model.testedImages).to.be.an('array').to.have.lengthOf(1);
      const image = model.testedImages[0];
      expect(image).to.have.property('height').to.equal(10);
      expect(image).to.have.property('src').to.equal('img/logo.png');
      expect(image).to.have.property('lineNumber').to.equal(6);
      expect(image).to.have.property('column').to.equal(3);
      done();
    });
  });
})
