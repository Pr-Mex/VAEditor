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
    provider.setStepList(JSON.stringify(steps));
    model = monaco.editor.createModel(content, language.id);
    const promise = provider.provideLinks(model, undefined) as Promise<ILinksList>;
    promise.then(res => { result = res; done(); }).catch(done);
  });

  after(() => {
    // Возвращаем общий список шагов: тест не должен влиять на соседние файлы.
    if (provider) provider.setStepList(JSON.stringify(ruSteps), true);
  });

  it('Ссылка стоит на параметрах-макетах', () => {
    const mxl = result.links.filter(l => String(l.url || '').indexOf('vamxl:') === 0);
    expect(mxl.map(l => String(l.url || ''))).to.have.members([
      'vamxl:Плановые и фактические затраты переделов',
      'vamxl:Макет таблицы',
      'vamxl:Макет в тексте',
      'vamxl:Макет видимости',
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
