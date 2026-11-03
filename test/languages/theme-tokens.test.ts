import { vs, vs_dark, hc_black, hc_light } from 'monaco-editor/esm/vs/editor/standalone/common/themes.js';
import { BSL_LANGUAGE_ID, language as bslLanguage } from '../../src/languages/bsl/configuration';
import { XBSL_LANGUAGE_ID, language as xbslLanguage } from '../../src/languages/xbsl/configuration';
import { BSL_THEME, CANONICAL_1C_THEME, XBSL_THEME } from '../../src/themes';
let expect = require('chai').expect;

// Цвет токена задаёт тема, а не грамматика: Monarch отдаёт имя токена
// ('keyword'), тема ищет правило по префиксу имени с учётом языка
// ('keyword.xbsl' → правило 'keyword'). Если имя разойдётся с правилами
// темы, ошибки не будет — просто текст останется цветом обычного текста, и
// заметить это можно только глазами. Поэтому свойство проверяется тестом.
//
// Список токенов ниже — из src/languages/{bsl,xbsl}/configuration.ts.
const BUILTIN_THEMES: { [name: string]: any } = {
  'vs': vs,
  'vs-dark': vs_dark,
  'hc-black': hc_black,
  'hc-light': hc_light,
};

// Токены, которым встроенная тема обязана дать свой цвет.
const COLORED = ['comment', 'keyword', 'number', 'string', 'regexp', 'delimiter', 'type'];


// Токены, которые по стандарту Monaco остаются цветом текста: правил для
// идентификаторов и операторов в темах нет, это не ошибка грамматики.
// function/variable/annotation встроенные темы тоже не красят — цвета для них
// задаёт только тема xBSL (см. src/themes.ts).
const DEFAULT_COLORED = ['', 'identifier', 'operator', 'function', 'variable', 'annotation'];

function rootType(type: string): string {
  return (type || '').split('.')[0];
}

function themeCovers(rules: any[], token: string): boolean {
  return rules.some(rule => rule.token === token || token.indexOf(rule.token + '.') === 0);
}

function tokenRoots(languageId: string, text: string): string[] {
  const roots: string[] = [];
  monaco.editor.tokenize(text, languageId).forEach(line => {
    line.forEach(token => roots.push(rootType(token.type)));
  });
  return roots;
}

// ИТС описывает цвета встроенного языка качественно, без палитры
// (its-pub1celementarno-13): синим выделены обязательные слова, чёрным —
// известные среде имена, бордовым — литералы, дальше «слова могут быть даже
// зелёные и фиолетовые». Точных значений в документации нет, поэтому сверяем
// смысл: ключевое слово — синее, строка — бордовая, комментарий — зелёный,
// идентификатор — цветом текста (правила в теме нет). Значения ниже взяты из
// встроенных тем Monaco; если Monaco сменит палитру, тест упадёт, и решение
// о новом цвете принимается осознанно, а не молча.
const CANONICAL: { [theme: string]: { [token: string]: string } } = {
  'vs': { keyword: '0000FF', string: 'A31515', comment: '008000', number: '098658', type: '008080' },
  'vs-dark': { keyword: '569CD6', string: 'CE9178', comment: '608B4E', number: 'B5CEA8', type: '3DC9B0' },
};

function ruleForeground(rules: any[], token: string): string {
  const rule = rules.filter(item => item.token === token)[0];
  return rule && rule.foreground ? String(rule.foreground).toUpperCase() : '';
}

describe('Цвета токенов берутся из встроенных тем', function () {

  before(() => {
    // Не полагаемся на порядок активации языков: регистрируем токенизаторы явно.
    monaco.languages.setMonarchTokensProvider(BSL_LANGUAGE_ID, bslLanguage);
    monaco.languages.setMonarchTokensProvider(XBSL_LANGUAGE_ID, xbslLanguage);
  });

  it('У каждой встроенной темы есть правило для наших токенов', () => {
    Object.keys(BUILTIN_THEMES).forEach(name => {
      const rules = BUILTIN_THEMES[name].rules;
      COLORED.forEach(token => {
        expect(themeCovers(rules, token), name + ': нет правила для токена ' + token).to.equal(true);
      });
    });
  });

  it('Смысл цветов совпадает с описанием в ИТС: ключевые слова синие, литералы бордовые, комментарии зелёные', () => {
    Object.keys(CANONICAL).forEach(themeName => {
      const rules = BUILTIN_THEMES[themeName].rules;
      const expected = CANONICAL[themeName];
      Object.keys(expected).forEach(token => {
        expect(ruleForeground(rules, token), themeName + ': цвет токена ' + token).to.equal(expected[token]);
      });
      // Идентификатор цветом текста: правила для него в теме быть не должно.
      expect(ruleForeground(rules, 'identifier')).to.equal('');
    });
  });


  it('Тема 1c задаёт каноническую палитру встроенного языка', () => {
    // Цвета Конфигуратора и EDT: ключевые слова красные, числа синие, строки
    // тёмно-коричневые, комментарии зелёные. Токены те же, что у BSL и xBSL,
    // поэтому палитра применяется к обоим языкам без отдельных правил.
    const rules = CANONICAL_1C_THEME.rules;
    expect(ruleForeground(rules, 'keyword')).to.equal('FF0000');
    expect(ruleForeground(rules, 'number')).to.equal('0000FF');
    expect(ruleForeground(rules, 'string')).to.equal('963200');
    expect(ruleForeground(rules, 'comment')).to.equal('007F00');
  });

  it('Тема 1c наследует встроенную, поэтому остальные наши токены тоже получают цвет', () => {
    expect(CANONICAL_1C_THEME.base).to.equal('vs');
    expect(CANONICAL_1C_THEME.inherit).to.equal(true);
    // Всё, для чего правила нет (delimiter, regexp, type), берётся из 'vs'.
    COLORED.forEach(token => {
      const defined = ruleForeground(CANONICAL_1C_THEME.rules, token) !== '';
      const inherited = themeCovers(vs.rules, token);
      expect(defined || inherited, 'токен без цвета в теме 1c: ' + token).to.equal(true);
    });
  });


  it('xBSL: аннотация идёт как annotation, пространство имён — как type', () => {
    const roots = tokenRoots(XBSL_LANGUAGE_ID,
      '@Глобально\nметод Тест()\nзнч с: Стд::Строка\n// комментарий\nзнч н = 1\nзнч т = "текст"');
    expect(roots).to.include('annotation');
    expect(roots).to.include('type');
  });

  it('xBSL: имя метода, параметр и его тип получают свои токены', () => {
    const roots = tokenRoots(XBSL_LANGUAGE_ID,
      'метод Обработать(Изображение: ДвоичныйОбъект.Ссылка): ДвоичныйОбъект.Ссылка\nзнч с = 1');
    expect(roots).to.include('function');
    expect(roots).to.include('variable');
    expect(roots).to.include('type');
  });

  it('Тема bsl задаёт классическую раскраску кода 1С', () => {
    // Как в онлайн-раскрасках кода 1С: идентификаторы синие, ключевые слова и
    // знаки операций красные, директивы коричневые, комментарии зелёные,
    // строки и числа чёрные.
    const rules = BSL_THEME.rules;
    expect(ruleForeground(rules, '')).to.equal('0000FF');
    expect(ruleForeground(rules, 'identifier')).to.equal('0000FF');
    expect(ruleForeground(rules, 'keyword')).to.equal('FF0000');
    expect(ruleForeground(rules, 'annotation')).to.equal('A52A2A');
    expect(ruleForeground(rules, 'operator')).to.equal('FF0000');
    expect(ruleForeground(rules, 'delimiter')).to.equal('FF0000');
    expect(ruleForeground(rules, 'comment')).to.equal('008000');
    expect(ruleForeground(rules, 'string')).to.equal('000000');
    expect(ruleForeground(rules, 'number')).to.equal('000000');
  });

  it('BSL: директивы & и # отдаются как annotation', () => {
    const roots = tokenRoots(BSL_LANGUAGE_ID, '&НаСервере\n#Область Тест\nПроцедура А()');
    expect(roots).to.include('annotation');
    expect(roots).to.include('keyword');
  });

  it('Тема xbsl задаёт палитру 1С:Элемент', () => {
    // Цвета из примеров языка: ключевые слова синие, аннотации фиолетовые,
    // типы бирюзовые, методы коричневые, переменные тёмно-синие.
    const rules = XBSL_THEME.rules;
    expect(ruleForeground(rules, 'keyword')).to.equal('0000FF');
    expect(ruleForeground(rules, 'annotation')).to.equal('AF00DB');
    expect(ruleForeground(rules, 'type')).to.equal('267F99');
    expect(ruleForeground(rules, 'function')).to.equal('795E26');
    expect(ruleForeground(rules, 'variable')).to.equal('001080');
    expect(ruleForeground(rules, 'number')).to.equal('098658');
    expect(ruleForeground(rules, 'string')).to.equal('A31515');
    expect(ruleForeground(rules, 'comment')).to.equal('008000');
  });

  it('Тема xbsl покрывает все токены грамматики xBSL', () => {
    const roots = tokenRoots(XBSL_LANGUAGE_ID,
      '// комментарий\n@Глобально\nметод Тест(а: Строка)\nзнч с: Стд::Строка\nзнч н = 1.5\nзнч т = "текст"\nзнч р = \'\\\\d+\'\nзнч х = а ? 1 : 2');
    roots.forEach(root => {
      const defined = ruleForeground(XBSL_THEME.rules, root) !== '';
      const inherited = themeCovers(vs.rules, root);
      expect(defined || inherited || DEFAULT_COLORED.indexOf(root) >= 0,
        'токен без цвета в теме xbsl: ' + root).to.equal(true);
    });
  });

  it('xBSL: посторонних токенов нет', () => {
    const roots = tokenRoots(XBSL_LANGUAGE_ID,
      'пер а = 1 + 2\n@Локально\nзнч с: Стд::Строка\nзнч т = "площадь ${а * 2}"\nзнч р = \'\\d+\'\n// комментарий');
    roots.forEach(root => {
      expect(COLORED.concat(DEFAULT_COLORED), 'неизвестный токен: ' + root).to.include(root);
    });
  });

  it('BSL: ключевые слова и строки отдают токены с цветом темы', () => {
    const roots = tokenRoots(BSL_LANGUAGE_ID,
      'Процедура Тест()\n\tЕсли Истина Тогда\n\t\tСообщить("текст");\n\tКонецЕсли;\nКонецПроцедуры');
    expect(roots).to.include('keyword');
    expect(roots).to.include('string');
  });

  it('BSL: посторонних токенов нет', () => {
    const roots = tokenRoots(BSL_LANGUAGE_ID,
      '&НаСервере\n#Если Сервер Тогда\nТекст = "ВЫБРАТЬ\n|Ссылка\n|ИЗ Т";\nДата = \'20240101\';\n/* блок */');
    roots.forEach(root => {
      expect(COLORED.concat(DEFAULT_COLORED), 'неизвестный токен: ' + root).to.include(root);
    });
  });
});
