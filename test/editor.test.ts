let assert = require('assert');
let expect = require('chai').expect;
import * as monaco from 'monaco-editor';
import { } from '../src/main';

//@ts-ignore
const tabs = window.VanessaTabs;
const line1 = 'Пример текста';
const line2 = 'Вторая строка';
const content = line1 + '\n' + line2;
const url = 'Браузер.feature';
const title = 'Заголовок файла';

describe('Vanessa Automation Editor', function () {
  it('Открытие вкладки редактора', () => {
    //@ts-ignore
    while (window.popVanessaMessage()) {}
    tabs.edit(content, url, url, title, 0, false, true);
    this.timeout(100);
  });
  it('Событие на открытие вкладки', () => {
    //@ts-ignore
    let message = window.popVanessaMessage()
    expect(message.type).equal("ON_TAB_SELECT");
    expect(message.data.filename).equal(url);
    expect(message.data.title).equal(title);
  });
  it('Содержимое вкладки редактора', () => {
    const editor = tabs.current.editor;
    expect(editor.getContent()).equal(content);
    expect(editor.getLineContent(1)).equal(line1);
    expect(editor.getLineContent(2)).equal(line2);
  });
  it('Выделение текста', () => {
    const editor = tabs.current.editor;
    editor.setSelection(1, 1, 3, 1);
    expect(editor.getSelectedContent()).equal(content);
    editor.setSelection(1, 1, 1, 100);
    expect(editor.getSelectedContent()).equal(line1);
    editor.setSelection(2, 1, 2, 100);
    expect(editor.getSelectedContent()).equal(line2);
  });
  it('Вставка текста', () => {
    const editor = tabs.current.editor;
    editor.setPosition(2, 1);
    editor.insertText(line1);
    expect(editor.getLineContent(2)).equal(line1 + line2);
    editor.undo();
    expect(editor.getLineContent(2)).equal(line2);
  });
  it('Позиция курсора', () => {
    const editor = tabs.current.editor;
    editor.setPosition(2, 5);
    let pos = editor.getPosition();
    expect(pos).an("object");
    expect(pos).property("lineNumber").equal(2);
    expect(pos).property("column").equal(5);
  });
})
