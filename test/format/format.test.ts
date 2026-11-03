import { KeywordMatcher } from '../../src/languages/turbo-gherkin/matcher';
import { DEFAULT_FORMAT_OPTIONS, formatLines, VAFormatOptions } from '../../src/languages/turbo-gherkin/format';
import { getStepContext } from '../../src/languages/turbo-gherkin/step-context';
import * as keywords from '../../example/Keywords/keywords.json';
let expect = require('chai').expect;

const matcher = new KeywordMatcher(JSON.stringify(keywords));

function format(text: string, options: Partial<VAFormatOptions> = {}): string[] {
  const merged = Object.assign({}, DEFAULT_FORMAT_OPTIONS, options);
  return formatLines(matcher, text.split('\n'), merged);
}

function formatText(text: string, options: Partial<VAFormatOptions> = {}): string {
  return format(text, options).join('\n');
}

describe('Форматирование фичи', function () {

  describe('Таблицы Gherkin', function () {
    it('Выравнивает колонки по самой широкой ячейке', () => {
      const source = [
        'Сценарий: Таблица',
        '\t| "Город" | "Улица" |',
        '\t| "Вятка" | "Спасская" |',
        '\t| "Тверь" | "Трёхсвятская" |',
      ].join('\n');
      expect(format(source)).to.deep.equal([
        'Сценарий: Таблица',
        '\t| "Город" | "Улица"        |',
        '\t| "Вятка" | "Спасская"     |',
        '\t| "Тверь" | "Трёхсвятская" |',
      ]);
    });

    it('Кириллица считается по символам, а не по байтам', () => {
      const result = format('Сценарий: Т\n\t| "Я" |\n\t| "Молоко" |');
      expect(result[1]).to.equal('\t| "Я"      |');
      expect(result[2]).to.equal('\t| "Молоко" |');
    });

    it('Дополняет строки с меньшим числом ячеек', () => {
      const result = format('Сценарий: Т\n\t| "А" | "Б" | "В" |\n\t| "Г" |');
      expect(result[2]).to.equal('\t| "Г" |     |     |');
    });

    it('Не режет ячейку по вертикальной черте внутри кавычек', () => {
      const result = format('Сценарий: Т\n\t| "a|b" | "c" |\n\t| "dd" | "e" |');
      expect(result[1]).to.equal('\t| "a|b" | "c" |');
      expect(result[2]).to.equal('\t| "dd"  | "e" |');
    });

    it('Оставляет разделитель || без изменений', () => {
      const result = format('Сценарий: Т\n\t||');
      expect(result[1]).to.equal('\t||');
    });

    it('Выравнивает таблицу вплотную к левому краю внутри секции', () => {
      const result = format('Сценарий: Т\n| "Ключ" |\n| "Товар" |');
      expect(result[1]).to.equal('\t| "Ключ"  |');
      expect(result[2]).to.equal('\t| "Товар" |');
    });

    it('Сохраняет пустую ячейку как выровненный пробел', () => {
      const result = format('Сценарий: Т\n\t| "А" | "" |\n\t| "Б" | "Значение" |');
      expect(result[1]).to.equal('\t| "А" | ""        |');
    });

    it('Не выравнивает таблицу при выключенной настройке', () => {
      const source = 'Сценарий: Т\n\t| "А" | "Б" |\n\t| "Длинная" | "В" |';
      expect(format(source, { alignTables: false })[1]).to.equal('\t| "А" | "Б" |');
    });
  });

  describe('Отступы', function () {
    it('Секции и метатеги всегда с левого края', () => {
      const result = format('\t\t@tag\n\t\tФункционал: Название');
      expect(result[0]).to.equal('@tag');
      expect(result[1]).to.equal('Функционал: Название');
    });

    it('Шаг вплотную к левому краю внутри секции получает отступ', () => {
      const result = format('Сценарий: Т\nИ я делаю что-то');
      expect(result[1]).to.equal('\tИ я делаю что-то');
    });

    it('Пробельные отступы превращаются в табуляцию', () => {
      const result = format('Сценарий: Т\n    И шаг', { tabSize: 4 });
      expect(result[1]).to.equal('\tИ шаг');
    });

    it('Вложенность подсценариев сохраняется', () => {
      const result = format('Сценарий: Т\n\tЕсли условие\n\t\tТогда шаг\n\t\t\tИ вложенный');
      expect(result.slice(1)).to.deep.equal([
        '\tЕсли условие',
        '\t\tТогда шаг',
        '\t\t\tИ вложенный',
      ]);
    });

    it('Вложенность пересчитывается из пробелов в табы', () => {
      const result = format('Сценарий: Т\n  Если условие\n      Тогда шаг', { tabSize: 2 });
      expect(result.slice(1)).to.deep.equal(['\tЕсли условие', '\t\t\tТогда шаг']);
    });

    it('Отступы можно оставить пробельными', () => {
      const result = format('Сценарий: Т\n\tИ шаг', { tabSize: 2, insertSpaces: true });
      expect(result[1]).to.equal('  И шаг');
    });

    it('Убирает хвостовые пробелы', () => {
      expect(format('Сценарий: Т   \n\tИ шаг\t')[0]).to.equal('Сценарий: Т');
    });

    it('Пустые строки остаются пустыми', () => {
      expect(format('Сценарий: Т\n\t\n\tИ шаг')[1]).to.equal('');
    });

    it('Содержимое многострочного параметра не трогается', () => {
      const source = [
        'Сценарий: Т',
        '\tИ параметр',
        '\t\t"""',
        '    Кривой   отступ внутри',
        '\t\t"""',
      ].join('\n');
      expect(format(source)).to.deep.equal([
        'Сценарий: Т',
        '\tИ параметр',
        '\t\t"""',
        '    Кривой   отступ внутри',
        '\t\t"""',
      ]);
    });

    it('Многострочный параметр с языком сохраняет маркер', () => {
      const result = format('Сценарий: Т\n\t"""bsl\n\tКод = 1;\n\t"""');
      expect(result[1]).to.equal('\t"""bsl');
      expect(result[2]).to.equal('\tКод = 1;');
    });
  });

  describe('Символ комментария', function () {
    it('Переводит // в # по умолчанию', () => {
      expect(format('Сценарий: Т\n\t// комментарий')[1]).to.equal('\t# комментарий');
    });

    it('# остаётся #', () => {
      expect(format('Сценарий: Т\n\t# комментарий')[1]).to.equal('\t# комментарий');
    });

    it('Переводит # в // при настройке //', () => {
      const result = format('Сценарий: Т\n\t# комментарий', { commentCharacter: '//' });
      expect(result[1]).to.equal('\t// комментарий');
    });

    it('Заголовок # language: ru не меняется при #', () => {
      expect(format('# language: ru')[0]).to.equal('# language: ru');
    });

    it('Комментарий не теряет текст после маркера', () => {
      expect(format('Сценарий: Т\n\t//a  b   c')[1]).to.equal('\t#a  b   c');
    });
  });

  describe('Идемпотентность', function () {
    it('Повторное форматирование ничего не меняет', () => {
      const source = [
        '# language: ru',
        '@tag',
        '',
        'Функционал: Проверка',
        '\tОписание фичи',
        '',
        'Сценарий: Таблица',
        '| "А" | "Б" |',
        '| "Длинное" | "В" |',
        '\t// комментарий',
        '\tИ многострочный параметр',
        '\t\t"""',
        '\t\t\tстрока',
        '\t\t"""',
      ].join('\n');
      const once = formatText(source);
      const twice = formatText(once);
      expect(twice).to.equal(once);
    });

    it('Форматирование уже выровненной таблицы не добавляет пробелов', () => {
      const source = 'Сценарий: Т\n\t| "А"    | "Б" |\n\t| "Длина" | "В" |';
      const once = formatText(source);
      expect(formatText(once)).to.equal(once);
    });

    it('Число строк не меняется', () => {
      const source = 'Сценарий: Т\n\n\t| "А" |\n\n\tИ шаг';
      expect(format(source).length).to.equal(source.split('\n').length);
    });
  });

  describe('Контекст шага для навигации по библиотеке', function () {
    it('Определяет ключевое слово и сниппет', () => {
      const context = getStepContext(matcher, '\tИ я нажимаю "ENTER"', 12);
      expect(context).to.have.property('lineNumber', 12);
      expect(context).to.have.property('keyword', 'И');
      expect(context).to.have.property('step', 'я нажимаю');
      expect(context).to.have.property('text', 'я нажимаю "ENTER"');
    });

    it('Работает для английских ключевых слов', () => {
      const context = getStepContext(matcher, 'Given I open the form');
      expect(context).to.have.property('keyword', 'Given');
      expect(context).to.have.property('step', 'i open the form');
    });

    it('Возвращает undefined для комментария', () => {
      expect(getStepContext(matcher, '\t# комментарий')).to.equal(undefined);
    });

    it('Возвращает undefined для описания фичи', () => {
      expect(getStepContext(matcher, '\tПросто текст описания')).to.equal(undefined);
    });
  });
});
