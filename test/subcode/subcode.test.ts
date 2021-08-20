import { VanessaEditor } from '../../src/vanessa-editor';
import { VanessaTabs } from '../../src/vanessa-tabs';
import { content, subcode1 } from './example.file.js'
let expect = require('chai').expect;

//@ts-ignore
const popVanessaMessage = window.popVanessaMessage;
//@ts-ignore
const tabs = window.VanessaTabs as VanessaTabs;
const url = 'subcode/example.feature';
const title = 'Заголовок файла';

describe('Виджеты подсценариев', function () {
  let editor: VanessaEditor;
  before((done) => {
    this.timeout(1000);
    while (popVanessaMessage()) { }
    editor = tabs.edit(content, url, url, title, 0, false, true) as VanessaEditor;
    setTimeout(() => done(), 100);
  });
  it('Вставка кода', (done) => {
    expect(editor.getContent()).to.equal(content);
    editor.showRuntimeCode(10, subcode1);
    setTimeout(() => {
      const selector = "div.vanessa-code-lines>span";
      const node = document.querySelectorAll(selector);
      expect(node).to.have.property("length", 4);
      done();
    }, 100);
  });
})
