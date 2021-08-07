import { VanessaEditor } from '../../src/vanessa-editor';
import { VanessaTabs } from '../../src/vanessa-tabs';
let emulator = require('./key-emulator');
let expect = require('chai').expect;

//@ts-ignore
const popVanessaMessage = window.popVanessaMessage;
//@ts-ignore
const tabs = window.VanessaTabs as VanessaTabs;

const line1 = 'Пример текста';
const line2 = 'Вторая строка';
const content = line1 + '\n' + line2;
const url = 'Браузер.feature';
const title = 'Заголовок файла';

describe('Vanessa Automation Editor', function () {
  let editor: VanessaEditor;
  before(() => {
    while (popVanessaMessage()) { }
    editor = tabs.edit(content, url, url, title, 0, false, true) as VanessaEditor;
    this.timeout(100);
  });
  it('Событие на открытие вкладки', () => {
    let message = popVanessaMessage();
    expect(message.type).to.equal("ON_TAB_SELECT");
    expect(message.data.filename).to.equal(url);
    expect(message.data.title).to.equal(title);
  });
  it('Событие на закрытие вкладки', () => {
    while (popVanessaMessage()) { }
    //@ts-ignore
    tabs.current.domClose.click()
    let message = popVanessaMessage();
    expect(message.type).to.equal("ON_TAB_CLOSING");
    expect(message.data.filename).to.equal(url);
    expect(message.data.title).to.equal(title);
  });
  it('Событие на запись документа', () => {
    while (popVanessaMessage()) { }
    emulator.keyboard("keydown", { keyCode: 83, ctrlKey: true });
    let message = popVanessaMessage();
    expect(message.type).to.equal("PRESS_CTRL_S");
    expect(message.data.filename).to.equal(url);
    expect(message.data.title).to.equal(title);
  });
  it('Содержимое вкладки редактора', () => {
    expect(editor.getContent()).to.equal(content);
    expect(editor.getLineContent(1)).to.equal(line1);
    expect(editor.getLineContent(2)).to.equal(line2);
  });
  it('Выделение текста', () => {
    editor.setSelection(1, 1, 3, 1);
    expect(editor.getSelectedContent()).to.equal(content);
    editor.setSelection(1, 1, 1, 100);
    expect(editor.getSelectedContent()).to.equal(line1);
    editor.setSelection(2, 1, 2, 100);
    expect(editor.getSelectedContent()).to.equal(line2);
  });
  it('Вставка текста', () => {
    editor.setPosition(2, 1);
    editor.insertText(line1);
    expect(editor.getLineContent(2)).to.equal(line1 + line2);
    editor.undo();
    expect(editor.getLineContent(2)).to.equal(line2);
  });
  it('Позиция курсора', () => {
    editor.setPosition(2, 5);
    let pos = editor.getPosition();
    expect(pos).to.be.an("object");
    expect(pos).to.have.property("lineNumber", 2);
    expect(pos).to.have.property("column", 5);
  });
})
