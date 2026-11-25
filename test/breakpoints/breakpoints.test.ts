import { VanessaEditor } from '../../src/vanessa-editor';
import { VanessaTabs } from '../../src/vanessa-tabs';
import { VanessaEditorEvent } from '../../src/common';
import { content, subcode1 } from '../subcode/example.file.js'
let expect = require('chai').expect;

//@ts-ignore
const tabs = window.VanessaTabs as VanessaTabs;
const url = 'breakpoints/example.feature';
const title = 'Точки останова';

// UPDATE_BREAKPOINTS отправляется в 1С по таймеру (100 мс) после изменения.
// Лишнее событие опасно: на Linux 1С не может обращаться к редактору, пока
// событие ждёт обработки, а ВА в это время ещё выполняет синхронную загрузку фичи.
describe('Событие UPDATE_BREAKPOINTS', function () {
  let editor: VanessaEditor;
  let count = 0;
  const listener = (e: CustomEvent) => {
    if (e.detail && e.detail.name === VanessaEditorEvent.UPDATE_BREAKPOINTS && e.detail.editor === editor) count++;
  };
  const wait = (done: Mocha.Done, check: () => void) => setTimeout(() => {
    try { check(); done(); } catch (e) { done(e); }
  }, 300);

  before((done) => {
    this.timeout(1000);
    editor = tabs.edit(content, url, url, title, 0, false, true) as VanessaEditor;
    setTimeout(() => {
      document.body.addEventListener('click', listener);
      done();
    }, 300);
  });
  after(() => document.body.removeEventListener('click', listener));
  beforeEach(() => { count = 0; });

  it('setContent без вставок кода не отправляет событие', (done) => {
    editor.setContent(content);
    wait(done, () => expect(count).to.equal(0));
  });
  it('clearRuntimeCodes без вставок кода не отправляет событие', (done) => {
    editor.clearRuntimeCodes();
    wait(done, () => expect(count).to.equal(0));
  });
  it('удаление вставки кода отправляет событие', (done) => {
    editor.showRuntimeCode(10, subcode1);
    setTimeout(() => {
      count = 0;
      editor.clearRuntimeCodes();
      wait(done, () => expect(count).to.equal(1));
    }, 300);
  });
  it('переключение точки останова отправляет событие', (done) => {
    editor.toggleBreakpoint(3);
    wait(done, () => expect(count).to.equal(1));
  });
})
