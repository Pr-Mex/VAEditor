import { VanessaGherkinProvider } from '../../src/languages/turbo-gherkin/provider';
import { content } from './example.file.js'
let expect = require('chai').expect;

describe('Проверка синтаксиса', function () {
  let result: monaco.editor.IMarker[];
  before(() => {
    const provider = VanessaGherkinProvider.instance;
    const model = monaco.editor.createModel(content, "turbo-gherkin");
    provider.checkSyntax(model);
    result = monaco.editor.getModelMarkers({owner: "syntax", resource: model.uri});
    console.log(result);
  });
  it('Расстановка маркеров', () => {
    expect(result).to.be.an('array');
  });
})
