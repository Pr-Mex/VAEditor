import { VanessaGherkinProvider } from '../../src/languages/turbo-gherkin/provider';
import { content } from './example.file.js'
import * as vars from './example.json';
let expect = require('chai').expect;

describe('Переменные и гиперссылки', function () {
  type ILinksList = monaco.languages.ILinksList;
  let model: monaco.editor.ITextModel;
  let result: ILinksList;
  before((done) => {
    const provider = VanessaGherkinProvider.instance;
    model = monaco.editor.createModel(content, "turbo-gherkin");
    const promise = provider.provideLinks(model, undefined) as Promise<ILinksList>;
    promise.then(res => { result = res; done(); })
  });
  it('Навигационные ссылки', () => {
    expect(result).to.be.an('object').to.have.property('links').to.be.an('array').to.have.lengthOf(13);
    expect(result.links[0]).to.have.property('url', "e1cib/list/Справочник.Номенклатура");
    expect(result.links[8]).to.have.property('url', "e1cib/app/Отчет.КомпоновкаТест");
  });
  it('Простые переменные', () => {
    expect(result.links[3]).to.have.property('tooltip').to.have.string('ЗаписатьJSON');
    expect(result.links[3]).to.have.property('url', "link:ТекстМодуля");
    expect(result.links[4]).to.have.property('tooltip', '"Привет, Ванесса!"');
    expect(result.links[5]).to.have.property('tooltip', '31');
    expect(result.links[9]).to.have.property('tooltip', '"23.07.2021"');
  });
  it('Составные переменные', () => {
    expect(result.links[6]).to.have.property('tooltip', 'Табуретка');
    expect(result.links[6]).to.have.property('url', 'link:Номенклатура.Товар');
    expect(result.links[7]).to.have.property('tooltip', 'e1cib/app/Отчет.КомпоновкаТест');
    expect(result.links[7]).to.have.property('url', 'link:Номенклатура.Работа.Ссылка');
    expect(result.links[10]).to.have.property('tooltip', 'Спасская');
    expect(result.links[10]).to.have.property('url', 'link:Вятка');
    expect(result.links[11]).to.have.property('tooltip', 'Спасская');
    expect(result.links[11]).to.have.property('url', 'link:Вятка.Улица');
    expect(result.links[12]).to.have.property('tooltip', 'Металлистов');
    expect(result.links[12]).to.have.property('url', 'link:Тула.Улица');
  });
  it('Импорт файлов', (done) => {
    const provider = VanessaGherkinProvider.instance;
    provider.setImports(JSON.stringify(vars));
    setTimeout(() => {
      const promise = provider.provideLinks(model, undefined) as Promise<ILinksList>;
      promise.then(result => {
        console.log('Импорт файлов', result);
        expect(result.links[13]).to.have.property('tooltip', 'Василёк');
        expect(result.links[13]).to.have.property('url', 'link:Контрагенты.Продавец');
        expect(result.links[14]).to.have.property('tooltip', 'Василёк');
        expect(result.links[14]).to.have.property('url', 'link:Контрагенты.Продавец.Код');
        expect(result.links[15]).to.have.property('tooltip', 'Табуретка');
        expect(result.links[15]).to.have.property('url', 'link:товар');
        expect(result.links[16]).to.have.property('tooltip', 'Доставка');
        expect(result.links[16]).to.have.property('url', 'link:услуга');
        done();
      })
    }, 100);
  });
})
