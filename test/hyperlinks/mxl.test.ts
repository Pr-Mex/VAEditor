import { VanessaGherkinProvider } from '../../src/languages/turbo-gherkin/provider';
import { language } from '../../src/languages/turbo-gherkin/configuration';
import { initGherkinProvider } from '../provider';
import * as ruSteps from '../../example/StepList/ru.json';

let expect = require('chai').expect;

// Шаги с params приходят из 1С: params — 0-based индексы параметров-макетов.
const steps = [
  {
    filterText: 'табличный документ "РеквизитТабличныйДокумент" равен макету "ИмяМакета" по шаблону',
    insertText: 'И табличный документ "РеквизитТабличныйДокумент" равен макету "ИмяМакета" по шаблону',
    sortText: 'И табличный документ "РеквизитТабличныйДокумент" равен макету "ИмяМакета" по шаблону',
    documentation: '',
    kind: 0,
    section: '',
    params: [1],
  },
  {
    filterText: 'табличный документ без ссылки "РеквизитТабличныйДокумент" равен макету "ИмяМакета"',
    insertText: 'И табличный документ без ссылки "РеквизитТабличныйДокумент" равен макету "ИмяМакета"',
    sortText: 'И табличный документ без ссылки "РеквизитТабличныйДокумент" равен макету "ИмяМакета"',
    documentation: '',
    kind: 0,
    section: '',
  },
  {
    filterText: 'таблица "ИмяТаблицы" содержит строки из макета "ИмяМакета"',
    insertText: 'И таблица "ИмяТаблицы" содержит строки из макета "ИмяМакета"',
    sortText: 'И таблица "ИмяТаблицы" содержит строки из макета "ИмяМакета"',
    documentation: '',
    kind: 0,
    section: '',
    params: [1],
  },
  {
    filterText: 'в поле "ИмяПоля" я ввожу текст из макета "ИмяМакета"',
    insertText: 'И в поле "ИмяПоля" я ввожу текст из макета "ИмяМакета"',
    sortText: 'И в поле "ИмяПоля" я ввожу текст из макета "ИмяМакета"',
    documentation: '',
    kind: 0,
    section: '',
    params: [1],
  },
  {
    filterText: 'видимость элементов формы равна макету "ИмяМакета"',
    insertText: 'И видимость элементов формы равна макету "ИмяМакета"',
    sortText: 'И видимость элементов формы равна макету "ИмяМакета"',
    documentation: '',
    kind: 0,
    section: '',
    params: [0],
  },
  {
    filterText: 'таблица "ИмяТаблицы" равна макету "ИмяМакета" тогда',
    insertText: 'Если таблица "ИмяТаблицы" равна макету "ИмяМакета" тогда',
    sortText: 'Если таблица "ИмяТаблицы" равна макету "ИмяМакета" тогда',
    documentation: '',
    kind: 0,
    section: '',
    params: [1],
  },
  {
    filterText: 'сравнить "ИмяТаблицы" с макетами "Макет1" и "Макет2"',
    insertText: 'И сравнить "ИмяТаблицы" с макетами "Макет1" и "Макет2"',
    sortText: 'И сравнить "ИмяТаблицы" с макетами "Макет1" и "Макет2"',
    documentation: '',
    kind: 0,
    section: '',
    params: [1, 2],
  },
];

const content = [
  '# language: ru',
  '',
  'Функционал: Гиперссылки на макеты',
  '',
  'Сценарий: Ссылка на эталон',
  '  И табличный документ "ReportSpreadsheetDocument" равен макету "Плановые и фактические затраты переделов" по шаблону',
  '  # И табличный документ "ReportSpreadsheetDocument" равен макету "В комментарии" по шаблону',
  '  И табличный документ без ссылки "ReportSpreadsheetDocument" равен макету "Без ссылки"',
  '  И таблица "ТаблицаМакета" содержит строки из макета "Макет таблицы"',
  '  | ИмяМакета |',
  '  | "Макет в таблице" |',
  '  И в поле "ПолеМакета" я ввожу текст из макета "Макет в тексте"',
  '  И видимость элементов формы равна макету "Макет видимости"',
  '  Если таблица "ТаблицаУсловия" равна макету "Макет условия" тогда',
  '  Если таблица "ТаблицаВУсловии" содержит строки из макета "Макет в условии" тогда',
  '  ИначеЕсли сравнить "ТаблицаВИначеЕсли" с макетами "Макет А" и "Макет Б" тогда',
  '  Если неизвестный шаг "Макет неизвестного шага" тогда',
  '  """',
  '  И табличный документ "ReportSpreadsheetDocument" равен макету "Макет в многострочном тексте" по шаблону',
  '  """',
  '  Дано Я открываю навигационную ссылку "e1cib/data/Catalog.ReportsOptions?ref=..."',
].join('\n');

describe('Гиперссылки на макеты mxl', function () {
  type ILinksList = monaco.languages.ILinksList;
  let provider: VanessaGherkinProvider;
  let model: monaco.editor.ITextModel;
  let result: ILinksList;

  before((done) => {
    provider = initGherkinProvider();
    provider.setKeypairs(JSON.stringify({ if: ['then'], 'Если': ['Тогда'], 'ИначеЕсли': ['Тогда'] }));
    provider.setStepList(JSON.stringify(steps));
    model = monaco.editor.createModel(content, language.id);
    const promise = provider.provideLinks(model, undefined) as Promise<ILinksList>;
    promise.then(res => { result = res; done(); }).catch(done);
  });

  after(() => {
    // Возвращаем общий список шагов и пары условий: тест не должен влиять на соседние файлы.
    if (provider) {
      provider.setKeypairs(JSON.stringify({ if: ['then'], 'Если': ['Тогда'] }));
      provider.setStepList(JSON.stringify(ruSteps), true);
    }
  });

  it('Ссылка стоит на параметрах-макетах', () => {
    const mxl = result.links.filter(l => String(l.url || '').indexOf('vamxl:') === 0);
    expect(mxl.map(l => String(l.url || ''))).to.have.members([
      'vamxl:Плановые и фактические затраты переделов',
      'vamxl:Макет таблицы',
      'vamxl:Макет в тексте',
      'vamxl:Макет видимости',
      'vamxl:Макет условия',
      'vamxl:Макет в условии',
      'vamxl:Макет А',
      'vamxl:Макет Б',
    ]);
  });

  it('Диапазон ссылки — значение в кавычках без кавычек', () => {
    const mxl = result.links.filter(l => String(l.url || '') === 'vamxl:Плановые и фактические затраты переделов')[0];
    const line = content.split('\n')[5];
    const start = line.indexOf('"Плановые');
    expect(mxl.range.startLineNumber).to.equal(6);
    expect(mxl.range.startColumn).to.equal(start + 2);
    expect(mxl.range.endColumn).to.equal(start + 'Плановые и фактические затраты переделов'.length + 2);
  });

  function expectMxlLink(url: string, value: string) {
    const link = result.links.filter(l => String(l.url || '') === url)[0];
    expect(link).to.not.equal(undefined);
    const lines = content.split('\n');
    const lineIndex = lines.findIndex(line => line.indexOf(value) >= 0);
    const line = lines[lineIndex];
    const start = line.indexOf('"' + value + '"');
    expect(link.range.startLineNumber).to.equal(lineIndex + 1);
    expect(link.range.startColumn).to.equal(start + 2);
    expect(link.range.endColumn).to.equal(start + value.length + 2);
  }

  it('Ссылка в зарегистрированном шаге условия', () => {
    expectMxlLink('vamxl:Макет условия', 'Макет условия');
    const urls = result.links.map(l => String(l.url || ''));
    expect(urls.some(url => url === 'vamxl:ТаблицаУсловия')).to.equal(false);
  });

  it('Ссылка в обычном шаге внутри условия', () => {
    expectMxlLink('vamxl:Макет в условии', 'Макет в условии');
    const urls = result.links.map(l => String(l.url || ''));
    expect(urls.some(url => url === 'vamxl:ТаблицаВУсловии')).to.equal(false);
  });

  it('Ссылки в ИначеЕсли и несколько параметров-макетов', () => {
    expectMxlLink('vamxl:Макет А', 'Макет А');
    expectMxlLink('vamxl:Макет Б', 'Макет Б');
    const urls = result.links.map(l => String(l.url || ''));
    expect(urls.some(url => url === 'vamxl:ТаблицаВИначеЕсли')).to.equal(false);
  });

  it('Незарегистрированный шаг в условии не получает ссылку', () => {
    const urls = result.links.map(l => String(l.url || ''));
    expect(urls.some(url => url === 'vamxl:Макет неизвестного шага')).to.equal(false);
  });

  it('Первый параметр и шаг без params ссылкой не становятся', () => {
    const urls = result.links.map(l => String(l.url || ''));
    expect(urls.some(url => url.indexOf('ReportSpreadsheetDocument') >= 0)).to.equal(false);
    expect(urls.some(url => url === 'vamxl:Без ссылки')).to.equal(false);
  });

  it('Комментарий не получает ссылку', () => {
    const urls = result.links.map(l => String(l.url || ''));
    expect(urls.some(url => url === 'vamxl:В комментарии')).to.equal(false);
  });

  it('Строка таблицы и doc string не получают vamxl-ссылку', () => {
    const mxlUrls = result.links
      .filter(l => String(l.url || '').indexOf('vamxl:') === 0)
      .map(l => String(l.url || ''));
    expect(mxlUrls.some(url => url.indexOf('Макет в таблице') >= 0)).to.equal(false);
    expect(mxlUrls.some(url => url.indexOf('Макет в многострочном тексте') >= 0)).to.equal(false);
  });

  it('Навигационные ссылки не сломаны', () => {
    const urls = result.links.map(l => String(l.url || ''));
    expect(urls.some(url => url === 'e1cib/data/Catalog.ReportsOptions?ref=...')).to.equal(true);
  });
});
