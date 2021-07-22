let expect = require('chai').expect;

import { VanessaGherkinProvider } from '../src/languages/turbo-gherkin/provider';

describe('Vanessa Gherkin Provider', function () {
  const provider = VanessaGherkinProvider.instance;
  let model: monaco.editor.ITextModel;
  before(() => {
    //@ts-ignore
    const content = window.testfile;
    model = monaco.editor.createModel(content, "turbo-gherkin");
  });
  it('Гиперссылки', () => {
    let links = provider.provideLinks(model, undefined);
    console.log(links);
  });
})
