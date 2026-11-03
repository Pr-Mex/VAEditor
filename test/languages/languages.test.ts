import { createModel } from '../../src/common';
import { BSL_LANGUAGE_ID, language as bslLanguage } from '../../src/languages/bsl/configuration';
import { XBSL_LANGUAGE_ID, language as xbslLanguage } from '../../src/languages/xbsl/configuration';
import '../../src/languages/bsl/contribution';
import '../../src/languages/xbsl/contribution';
let expect = require('chai').expect;

// Monarch добавляет к области имя языка ("keyword.bsl"), поэтому сравниваем
// только корень области.
function rootType(type: string): string {
  return (type || '').split('.')[0];
}

function typeAt(languageId: string, text: string, column: number, line: number = 1): string {
  const lines = monaco.editor.tokenize(text, languageId);
  const tokens = lines[line - 1] || [];
  let result = '';
  tokens.forEach(token => { if (token.offset < column) result = rootType(token.type); });
  return result;
}

function extensionOf(languageId: string): string[] {
  const found = monaco.languages.getLanguages().filter(item => item.id === languageId)[0];
  return found ? found.extensions || [] : [];
}

describe('Подсветка BSL', function () {

  before(() => {
    // Не полагаемся на порядок активации языка: регистрируем токенизатор явно.
    monaco.languages.setMonarchTokensProvider(BSL_LANGUAGE_ID, bslLanguage);
  });

  it('Язык зарегистрирован для .bsl и .os', () => {
    expect(extensionOf(BSL_LANGUAGE_ID)).to.include('.bsl');
    expect(extensionOf(BSL_LANGUAGE_ID)).to.include('.os');
  });

  it('Файл .bsl открывается в отдельной вкладке с языком bsl', () => {
    const model = createModel('', 'test.bsl');
    expect(model.getLanguageId()).to.equal(BSL_LANGUAGE_ID);
    model.dispose();
  });

  it('Ключевые слова подсвечиваются как keyword', () => {
    expect(typeAt(BSL_LANGUAGE_ID, 'Если Истина Тогда', 1)).to.equal('keyword');
    expect(typeAt(BSL_LANGUAGE_ID, 'Если Истина Тогда', 6)).to.equal('keyword');
  });

  it('Идентификатор не путается с ключевым словом', () => {
    expect(typeAt(BSL_LANGUAGE_ID, 'Счетчик = 1;', 1)).to.equal('identifier');
  });

  it('Однострочный комментарий', () => {
    expect(typeAt(BSL_LANGUAGE_ID, '// комментарий', 1)).to.equal('comment');
  });

  it('Блочный комментарий', () => {
    expect(typeAt(BSL_LANGUAGE_ID, '/* комментарий */', 1)).to.equal('comment');
  });

  it('Строковый литерал', () => {
    expect(typeAt(BSL_LANGUAGE_ID, 'Сообщить("текст");', 10)).to.equal('string');
  });

  it('Многострочная строка запроса продолжается на следующих строках', () => {
    const lines = monaco.editor.tokenize('Текст = "ВЫБРАТЬ\n|Ссылка\n|ИЗ Т;', BSL_LANGUAGE_ID);
    expect(rootType(lines[1][0].type)).to.equal('string');
    expect(rootType(lines[2][0].type)).to.equal('string');
  });

  it('Вертикальная черта не открывает строку', () => {
    expect(typeAt(BSL_LANGUAGE_ID, '|Ссылка', 1)).to.not.equal('string');
  });

  it('Литерал даты — число, а не строка', () => {
    expect(typeAt(BSL_LANGUAGE_ID, "Дата = '20240101';", 8)).to.equal('number');
  });

  it('Директива компиляции и препроцессора', () => {
    expect(typeAt(BSL_LANGUAGE_ID, '&НаСервере', 1)).to.equal('keyword');
    expect(typeAt(BSL_LANGUAGE_ID, '#Если Сервер Тогда', 1)).to.equal('keyword');
  });

  it('Число', () => {
    expect(typeAt(BSL_LANGUAGE_ID, 'А = 42;', 5)).to.equal('number');
  });
});

describe('Подсветка xBSL', function () {

  before(() => {
    monaco.languages.setMonarchTokensProvider(XBSL_LANGUAGE_ID, xbslLanguage);
  });

  it('Язык зарегистрирован для .sbsl и .xbsl', () => {
    expect(extensionOf(XBSL_LANGUAGE_ID)).to.include('.sbsl');
    expect(extensionOf(XBSL_LANGUAGE_ID)).to.include('.xbsl');
  });

  it('Файл .sbsl открывается в отдельной вкладке с языком xbsl', () => {
    const model = createModel('', 'скрипт.sbsl');
    expect(model.getLanguageId()).to.equal(XBSL_LANGUAGE_ID);
    model.dispose();
  });

  it('Файл .xbsl открывается в отдельной вкладке с языком xbsl', () => {
    const model = createModel('', 'test.xbsl');
    expect(model.getLanguageId()).to.equal(XBSL_LANGUAGE_ID);
    model.dispose();
  });

  it('Ключевые слова языка пишутся строчными буквами', () => {
    expect(typeAt(XBSL_LANGUAGE_ID, 'метод Скрипт()', 1)).to.equal('keyword');
    expect(typeAt(XBSL_LANGUAGE_ID, 'пер МойВозраст: Число', 1)).to.equal('keyword');
    expect(typeAt(XBSL_LANGUAGE_ID, 'исключение МояОшибка', 1)).to.equal('keyword');
  });

  it('Ключевое слово с прописной буквы — это не ключевое слово', () => {
    expect(typeAt(XBSL_LANGUAGE_ID, 'Если Счетчик', 1)).to.equal('identifier');
  });

  it('Имя переменной после объявления — идентификатор', () => {
    expect(typeAt(XBSL_LANGUAGE_ID, 'пер МойВозраст: Число', 5)).to.equal('identifier');
  });

  it('Пространство имён стандартной библиотеки', () => {
    expect(typeAt(XBSL_LANGUAGE_ID, 'Стд::Строка.Соединить(а, б)', 1)).to.equal('type');
  });

  it('Комментарий и строка', () => {
    expect(typeAt(XBSL_LANGUAGE_ID, '// комментарий', 1)).to.equal('comment');
    expect(typeAt(XBSL_LANGUAGE_ID, 'Консоль.Записать("В " + День)', 18)).to.equal('string');
  });

  it('Многострочная строка продолжается на следующих строках', () => {
    const lines = monaco.editor.tokenize('знч Текст =\n"<note>\n<body>\n</note>"\nпер а = 1', XBSL_LANGUAGE_ID);
    expect(rootType(lines[1][0].type)).to.equal('string');
    expect(rootType(lines[2][0].type)).to.equal('string');
    expect(rootType(lines[3][0].type)).to.equal('string');
    expect(rootType(lines[4][0].type)).to.equal('keyword');
  });

  it('Интерполяция: короткая форма и выражение в фигурных скобках', () => {
    const text = 'пер Площадь = "равна ${Длина * Ширина} м2"';
    // Внутри ${...} подсвечивается код, а не строка.
    expect(typeAt(XBSL_LANGUAGE_ID, text, 24)).to.equal('identifier');
    expect(typeAt(XBSL_LANGUAGE_ID, text, 16)).to.equal('string');
    expect(typeAt(XBSL_LANGUAGE_ID, 'пер С = "Скачано $Процент%"', 20)).to.equal('string');
  });

  it('Тернарная операция и настойчивая операция — операторы', () => {
    expect(typeAt(XBSL_LANGUAGE_ID, 'х = а ? б : в', 5)).to.equal('operator');
  });

  it('Аннотация и директива импорта — keyword, как директивы в BSL', () => {
    expect(typeAt(XBSL_LANGUAGE_ID, '@Наименование', 1)).to.equal('keyword');
    expect(typeAt(XBSL_LANGUAGE_ID, '#требуется модуль.sbsl', 1)).to.equal('keyword');
  });

  it('Литерал Неопределено', () => {
    expect(typeAt(XBSL_LANGUAGE_ID, 'х = Неопределено', 5)).to.equal('keyword');
  });
});
