import { VanessaTabs } from '../../src/vanessa-tabs';
let expect = require('chai').expect;

//@ts-ignore
const tabs = window.VanessaTabs as VanessaTabs;

// 0.52.2: DiffEditorWidget монтирует свой корень прямо в переданный элемент,
// а getContainerDomNode() возвращает сам переданный элемент (в 0.30 виджет
// создавал собственный div и отдавал его). Если domNode() diff-редактора —
// общий #VanessaEditorContainer, закрытие diff-вкладки вешает на него
// vanessa-hidden и прячет все редакторы: вместо редактора остаётся пустое
// поле. Тесты фиксируют контракт: у diff-редактора собственный узел, после
// закрытия diff-вкладки предыдущий редактор снова видим.
describe('Diff-вкладка: закрытие возвращает предыдущий редактор', function () {
  this.timeout(15000); // создание diff-редактора + таймеры showEditor: WebKit 1С медленный
  const container = () => document.getElementById('VanessaEditorContainer');

  before((done) => {
    tabs.edit('Функционал: тест вкладок', 'tabs-close.feature', 'tabs-close.feature', 'Тест вкладок', 0, false, true);
    tabs.diff('старый текст', 'diff-old.json', 'diff-old.json', 'новый текст', 'diff-new.json', 'diff-new.json', 'Сравнение', 0, true, true);
    setTimeout(done, 400); // дать отработать таймерам showEditor (100/300 мс)
  });

  after(() => {
    //@ts-ignore
    tabs.findTab(t => t.title === 'Сравнение')?.close();
    //@ts-ignore
    tabs.findTab(t => t.title === 'Тест вкладок')?.close();
  });

  it('domNode() diff-редактора — собственный узел внутри контейнера', () => {
    expect(tabs.isDiffEditor).to.equal(true);
    const node = tabs.diffEditor.domNode();
    expect(node).to.not.equal(container());
    expect(node.parentElement).to.equal(container());
  });

  it('закрытие diff-вкладки не прячет общий контейнер', (done) => {
    //@ts-ignore
    tabs.current.close();
    expect(container().classList.contains('vanessa-hidden')).to.equal(false);
    setTimeout(() => {
      expect(tabs.isCodeEditor).to.equal(true);
      const node = tabs.editor.domNode();
      expect(node.parentElement).to.equal(container());
      expect(getComputedStyle(node).display).to.not.equal('none');
      expect(getComputedStyle(container()).display).to.not.equal('none');
      done();
    }, 400);
  });
});
