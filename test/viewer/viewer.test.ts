import { VanessaTabs } from '../../src/vanessa-tabs';
let expect = require('chai').expect;

//@ts-ignore
const tabs = window.VanessaTabs as VanessaTabs;

// renderMarkdown 0.52.2 всем ссылкам ставит href="" (реальный URL — в data-href).
// Клик без preventDefault = переход на пустой href = перезагрузка страницы
// WebView 1С — редактор умирает целиком. Тесты фиксируют и контракт рендера,
// и перехват клика (в т.ч. по вложенному в ссылку элементу).
describe('Markdown-вьюер: клики по ссылкам', function () {
  let eventsData: { name: string, data: any }[];
  function bodyOnClickHandler(ev: Event) {
    if (ev instanceof CustomEvent && !Number.isInteger(ev.detail)) {
      eventsData.push(ev.detail);
    }
  }
  const markdown = '# Урок\n\n[простая ссылка](Глава01/Урок02.md)\n\n[**жирная** ссылка](Глава02/Урок01.md)\n';

  before((done) => {
    document.body.addEventListener('click', bodyOnClickHandler);
    eventsData = [];
    tabs.view('', 'Тест вьюера', 'test-viewer.md', markdown);
    setTimeout(done, 100);
  });
  after(() => {
    document.body.removeEventListener('click', bodyOnClickHandler);
    //@ts-ignore
    tabs.current.domClose.click();
  });

  it('Рендер: href пуст, реальный URL — в data-href', () => {
    const anchors = document.querySelectorAll('.vanessa-markdown a');
    expect(anchors.length).to.be.at.least(2);
    const a = anchors[0] as HTMLAnchorElement;
    expect(a.getAttribute('href')).to.equal('');
    expect(a.dataset.href).to.have.string('Урок02.md');
  });

  it('Клик по ссылке шлёт ON_MARK_CLICK и отменяет навигацию', () => {
    eventsData = [];
    const a = document.querySelector('.vanessa-markdown a') as HTMLAnchorElement;
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    a.dispatchEvent(ev);
    expect(ev.defaultPrevented).to.equal(true); // иначе href="" перезагрузит WebView 1С
    const message = eventsData.find(e => e.name === 'ON_MARK_CLICK');
    expect(message).to.be.an('object');
    expect(message.data).to.equal(a.dataset.href);
  });

  it('Клик по вложенному в ссылку элементу тоже работает', () => {
    eventsData = [];
    const strong = document.querySelector('.vanessa-markdown a strong') as HTMLElement;
    expect(strong).to.not.equal(null);
    const a = strong.closest('a') as HTMLAnchorElement;
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
    strong.dispatchEvent(ev);
    expect(ev.defaultPrevented).to.equal(true);
    const message = eventsData.find(e => e.name === 'ON_MARK_CLICK');
    expect(message).to.be.an('object');
    expect(message.data).to.equal(a.dataset.href);
  });
});
