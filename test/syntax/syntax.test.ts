import { VanessaGherkinProvider } from '../../src/languages/turbo-gherkin/provider';
import * as content from './example.file.js'
let expect = require('chai').expect;

function check(content: string) {
  const model = monaco.editor.createModel(content, "turbo-gherkin");
  VanessaGherkinProvider.instance.checkSyntax(model);
  const markers = monaco.editor.getModelMarkers({ owner: "syntax", resource: model.uri });
  return { markers: markers, value: (n: number) => model.getValueInRange(markers[n]) }
}

describe('Проверка синтаксиса', function () {
  const provider = VanessaGherkinProvider.instance;
  it('Ключевые слова в описании фичи', () => {
    const result = check(content.f01);
    expect(result.markers).to.be.an('array').to.have.lengthOf(1);
    expect(result.value(0)).to.equal("Когда есть шаг с ошибкой ситнаксиса");
  });
})
