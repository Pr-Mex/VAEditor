import { VanessaGherkinProvider } from '../../src/languages/turbo-gherkin/provider';
import { content } from './example.file.js'
let expect = require('chai').expect;

describe('Переменные и гиперссылки', function () {
  let result: monaco.languages.ILinksList;
  before(() => {
    const provider = VanessaGherkinProvider.instance;
    const model = monaco.editor.createModel(content, "turbo-gherkin");
    result = provider.provideLinks(model, undefined) as monaco.languages.ILinksList;
  });
  it('Навигационные ссылки', () => {
    expect(result).to.be.an('object').to.have.property('links').to.be.an('array').to.have.lengthOf(13);
    expect(result.links[0]).to.be.an('object').to.have.property('url').to.equal("e1cib/list/Справочник.Номенклатура");
    expect(result.links[8]).to.be.an('object').to.have.property('url').to.equal("e1cib/app/Отчет.КомпоновкаТест");
  });
  it('Простые переменные', () => {
    expect(result.links[3]).to.be.an('object').to.have.property('tooltip').to.have.string('ЗаписатьJSON');
    expect(result.links[3]).to.be.an('object').to.have.property('url').to.equal("link:ТекстМодуля");
    expect(result.links[4]).to.be.an('object').to.have.property('tooltip').to.equal('"Привет, Ванесса!"');
    expect(result.links[5]).to.be.an('object').to.have.property('tooltip').to.equal('31');
    expect(result.links[9]).to.be.an('object').to.have.property('tooltip').to.equal('"23.07.2021"');
  });
  it('Составные переменные', () => {
    expect(result.links[6]).to.be.an('object').to.have.property('tooltip').to.equal('Табуретка');
    expect(result.links[6]).to.be.an('object').to.have.property('url').to.equal('link:Номенклатура.Товар');
    expect(result.links[7]).to.be.an('object').to.have.property('tooltip').to.equal('e1cib/app/Отчет.КомпоновкаТест');
    expect(result.links[7]).to.be.an('object').to.have.property('url').to.equal('link:Номенклатура.Работа.Ссылка');
    expect(result.links[10]).to.be.an('object').to.have.property('tooltip').to.equal('Спасская');
    expect(result.links[10]).to.be.an('object').to.have.property('url').to.equal('link:Вятка');
    expect(result.links[11]).to.be.an('object').to.have.property('tooltip').to.equal('Спасская');
    expect(result.links[11]).to.be.an('object').to.have.property('url').to.equal('link:Вятка.Улица');
    expect(result.links[12]).to.be.an('object').to.have.property('tooltip').to.equal('Металлистов');
    expect(result.links[12]).to.be.an('object').to.have.property('url').to.equal('link:Тула.Улица');
  });
})
