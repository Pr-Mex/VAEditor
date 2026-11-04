import { StyleManager } from '../../src/style';
import { applyUiEnvironment, detectPlatformInterface, detectPlatformTheme } from '../../src/ui-interface';
let expect = require('chai').expect;

// Оформление редактора повторяет интерфейс платформы: «Такси» (по умолчанию)
// или «Версия 8.5», светлая или тёмная. Ошибка в определении не ломает сборку —
// редактор просто выглядит чужеродно внутри формы 1С, и заметить это можно
// только глазами. Поэтому вариант интерфейса и тему проверяем тестом.
//
// Эти же тесты крутятся внутри .epf (макет AutoTest), где страница открыта в
// WebKit платформы и сама может быть уже в 8.5 и в тёмной теме. Поэтому
// проверяются только те признаки, которыми управляет тест, а не «состояние по
// умолчанию»: переменная палитры --colorBack10 и классы themeLight/themeDark.
// Параметры URL (?interface=taxi|85, ?theme=light|dark) в загруженной странице
// поменять нельзя — они остаются за пределами теста.

const PALETTE_PROBE = '--colorBack10';

function clearPlatformTraces(): void {
  document.documentElement.classList.remove('themeLight', 'themeDark');
  document.body.classList.remove('themeLight', 'themeDark');
  document.documentElement.style.removeProperty(PALETTE_PROBE);
  document.body.style.removeProperty(PALETTE_PROBE);
}

describe('Оформление под интерфейс платформы', function () {

  afterEach(function () {
    clearPlatformTraces();
    document.body.removeAttribute('data-interface');
  });

  it('Переменная палитры платформы означает интерфейс «Версия 8.5»', function () {
    clearPlatformTraces();
    document.documentElement.style.setProperty(PALETTE_PROBE, '#ffffff');
    expect(detectPlatformInterface()).to.equal('85');
  });

  it('Классы themeLight и themeDark задают тему', function () {
    clearPlatformTraces();
    document.documentElement.classList.add('themeDark');
    expect(detectPlatformTheme()).to.equal('vs-dark');

    document.documentElement.classList.remove('themeDark');
    document.documentElement.classList.add('themeLight');
    expect(detectPlatformTheme()).to.equal('vs');
  });

  it('Класс темы на body тоже учитывается', function () {
    clearPlatformTraces();
    document.body.classList.add('themeDark');
    expect(detectPlatformTheme()).to.equal('vs-dark');
  });

  it('applyUiEnvironment выставляет на body тот же вариант, что и определился', function () {
    clearPlatformTraces();
    document.documentElement.style.setProperty(PALETTE_PROBE, '#ffffff');
    const detected = detectPlatformInterface();
    applyUiEnvironment();
    expect(document.body.getAttribute('data-interface')).to.equal(detected);
  });

  it('Тема, выбранная вручную, автоопределением не перебивается', function () {
    clearPlatformTraces();
    StyleManager.themePinned = false;
    StyleManager.applyPlatformTheme('vs');
    document.documentElement.classList.add('themeDark');
    StyleManager.themePinned = true;

    applyUiEnvironment();

    expect(document.body.getAttribute('data-theme')).to.equal('vs');
    StyleManager.themePinned = false;
  });
});
