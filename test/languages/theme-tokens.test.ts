import { vs, vs_dark, hc_black, hc_light } from 'monaco-editor/esm/vs/editor/standalone/common/themes.js';
import { BSL_LANGUAGE_ID, language as bslLanguage } from '../../src/languages/bsl/configuration';
import { XBSL_LANGUAGE_ID, language as xbslLanguage } from '../../src/languages/xbsl/configuration';
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
const DEFAULT_COLORED = ['', 'identifier', 'operator'];

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

  it('xBSL: аннотация идёт как keyword, пространство имён — как type', () => {
    const roots = tokenRoots(XBSL_LANGUAGE_ID,
      '@Глобально\nметод Тест()\nзнч с: Стд::Строка\n// комментарий\nзнч н = 1\nзнч т = "текст"');
    expect(roots).to.include('keyword');
    expect(roots).to.include('type');
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
