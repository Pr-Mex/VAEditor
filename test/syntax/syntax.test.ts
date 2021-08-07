import { VanessaGherkinProvider } from '../../src/languages/turbo-gherkin/provider';
import { content01 } from './example.file.js'
let expect = require('chai').expect;

describe('Проверка синтаксиса', function () {
  const provider = VanessaGherkinProvider.instance;
  it('Ключевые слова в описании фичи', () => {
    const model = monaco.editor.createModel(content01, "turbo-gherkin");
    provider.checkSyntax(model);
    const result = monaco.editor.getModelMarkers({owner: "syntax", resource: model.uri});
    expect(result).to.be.an('array').to.have.lengthOf(1);
    expect(model.getValueInRange(result[0])).to.equal("Когда есть шаг с ошибкой ситнаксиса");
  });
})
