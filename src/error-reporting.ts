// Ошибки внутри поля HTML 1С видны только в консоли WebView2, куда пользователь
// не заглядывает: он видит лишь пустое место вместо редактора и сообщает «не
// работает». Поэтому дублируем ошибки на саму страницу.
//
// Стили заданы инлайном: баннер должен быть виден, даже если css не применился
// или упал раньше при инициализации страницы.

const BANNER_ID = 'VanessaErrorBanner';

const BANNER_STYLE = [
  'position:fixed',
  'left:0',
  'right:0',
  'bottom:0',
  'z-index:2147483647',
  'max-height:40%',
  'overflow:auto',
  'padding:8px 12px',
  'background:#7f1d1d',
  'color:#fff',
  'font:12px/1.4 monospace',
  'white-space:pre-wrap'
].join(';');

function describe(error: any): string {
  if (!error) return 'неизвестная ошибка';
  if (error.stack) return String(error.stack);
  if (error.message) return String(error.message);
  return String(error);
}

function show(message: string): void {
  if (!document.body) return;

  let banner = document.getElementById(BANNER_ID);
  if (!banner) {
    banner = document.createElement('div');
    banner.id = BANNER_ID;
    banner.setAttribute('style', BANNER_STYLE);
    document.body.appendChild(banner);
  }
  banner.textContent += (banner.textContent ? '\n' : '') + message;
}

export function initErrorReporting(): void {
  window.addEventListener('error', (event: ErrorEvent) => {
    show('Ошибка: ' + describe(event.error || event.message));
  });

  window.addEventListener('unhandledrejection', (event: any) => {
    show('Необработанный промис: ' + describe(event.reason));
  });
}
