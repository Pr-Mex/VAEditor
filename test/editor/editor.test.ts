import { IVanessaEditor } from '../../src/common';
import { VanessaEditor } from '../../src/vanessa-editor';
import { VanessaTabs } from '../../src/vanessa-tabs';
import { initGherkinProvider } from '../provider'
let emulator = require('./key-emulator');
let expect = require('chai').expect;

//@ts-ignore
const tabs = window.VanessaTabs as VanessaTabs;

const line1 = 'Пример текста';
const line2 = 'Вторая строка';
const content = line1 + '\n' + line2;
const url = 'Браузер.feature';
const title = 'Заголовок файла';

describe('Управление редактором', function () {
  let eventsData: {name:string, data:any, editor:IVanessaEditor}[];
  let editor: VanessaEditor;

  function bodyOnClickHandler(ev:Event){
    if (ev instanceof CustomEvent) {

      if (Number.isInteger(ev.detail)) {
        return;
      }
      eventsData.push(ev.detail)
    }
  }

  before((done) => {
    eventsData = [];
    document.body.addEventListener('click', bodyOnClickHandler)
    initGherkinProvider();
    editor = tabs.edit(content, url, url, title, 0, false, true) as VanessaEditor;
    setTimeout(done, 100);
  });
  after((done)=>{
    document.body.removeEventListener('click', bodyOnClickHandler)
    done()
  })
  it('Событие на открытие вкладки', () => {
    let message = eventsData.shift();
    expect(message.name).to.equal("ON_TAB_SELECT");
    expect(message.data.filename).to.equal(url);
    expect(message.data.title).to.equal(title);
  });
  it('Событие на закрытие вкладки', () => {
    eventsData = []
    //@ts-ignore
    tabs.current.domClose.click()
    let message = eventsData.shift();
    expect(message.name).to.equal("ON_TAB_CLOSING");
    expect(message.data.filename).to.equal(url);
    expect(message.data.title).to.equal(title);
  });
  it('Событие на запись документа', () => {
    eventsData = []
    emulator.keyboard("keydown", { keyCode: 83, ctrlKey: true });
    let message = eventsData.shift();
    expect(message.name).to.equal("PRESS_CTRL_S");
    expect(message.data.filename).to.equal(url);
    expect(message.data.title).to.equal(title);
  });
  it('Содержимое вкладки редактора', () => {
    expect(editor.getContent()).to.equal(content);
    expect(editor.getLineContent(1)).to.equal(line1);
    expect(editor.getLineContent(2)).to.equal(line2);
  });
  it('Показать контекстное меню', () => {
    tabs.showContextMenu();
    expect(document.querySelectorAll('.monaco-menu').length).to.equal(1);
  });
  it('Наличие строк DOM isConnected', () => {
    expect(editor.domNode().getElementsByClassName('view-line').length).to.equal(2);
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
    editor.trigger("", "undo");
    expect(editor.getLineContent(2)).to.equal(line2);
  });
  it('Команды Undo и Redo', () => {
    editor.setPosition(2, 1);
    editor.insertText(line1);
    expect(editor.getLineContent(2)).to.equal(line1 + line2);
    editor.trigger("", "undo");
    expect(editor.getLineContent(2)).to.equal(line2);
    editor.trigger("", "redo");
    expect(editor.getLineContent(2)).to.equal(line1 + line2);
  });
  it('Позиция курсора', () => {
    editor.setPosition(2, 5);
    let pos = editor.getPosition();
    expect(pos).to.be.an("object");
    expect(pos).to.have.property("lineNumber", 2);
    expect(pos).to.have.property("column", 5);
  });
  it('Всплывающее сообщение', () => {
    const selector = "div.monaco-editor-overlaymessage div.message";
    const message = "Пример всплывающего сообщения";
    editor.showMessage(message);
    const node = document.querySelector(selector);
    expect(node).to.have.property("textContent", message);
  });
  it('Переключение вкладок', () => {
    tabs.closeAll();
    expect(tabs.count()).to.equal(0);
    const contents = ["Первый", "Второй", "Третий"];
    const value = () => tabs.current.editor.getModel().getValue();
    const turnPage = (key) => emulator.keyboard("keydown", { keyCode: key, ctrlKey: true });
    contents.forEach(cont => tabs.edit("Текст" + cont, cont, cont, cont, 0, false, true));
    expect(tabs.count()).to.equal(3);
    expect(value()).to.equal("Текст" + contents[2]);
    expect(tabs.current.title).to.equal(contents[2]);
    turnPage(33);
    expect(value()).to.equal("Текст" + contents[1]);
    expect(tabs.current.title).to.equal(contents[1]);
    turnPage(33);
    expect(value()).to.equal("Текст" + contents[0]);
    expect(tabs.current.title).to.equal(contents[0]);
    turnPage(34);
    expect(value()).to.equal("Текст" + contents[1]);
    expect(tabs.current.title).to.equal(contents[1]);
    turnPage(34);
    expect(value()).to.equal("Текст" + contents[2]);
    expect(tabs.current.title).to.equal(contents[2]);
    tabs.closeAll();
    expect(tabs.count()).to.equal(0);
  });
})
