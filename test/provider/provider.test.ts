import { VanessaGherkinProvider } from '../../src/languages/turbo-gherkin/provider';
import { content } from './example.file.js'
let expect = require('chai').expect;

describe('Vanessa Gherkin Provider', function () {
  const provider = VanessaGherkinProvider.instance;
  let model: monaco.editor.ITextModel;
  before(() => {
    model = monaco.editor.createModel(content, "turbo-gherkin");
  });
  it('Гиперссылки', () => {
    let links = provider.provideLinks(model, undefined) as monaco.languages.ILinksList;
    expect(links)
      .to.be.an('object')
      .to.have.property('links')
      .to.be.an('array')
      .to.have.lengthOf(2);
    expect(links.links.map(e => e.url))
      .to.have.members(['link:ТекстМодуля', 'link:ТекстДиктора'])
  });
})
