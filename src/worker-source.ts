// Доставка исходников воркеров в страницу.
//
// Страница редактора открывается встроенным WebKit платформы 1С 8.5 по
// протоколу file://. Такой WebKit не отдаёт воркер из соседнего файла
// ("Script at 'file:///...' cannot be accessed from origin 'null'"), поэтому
// все собранные воркеры вкладываются в HTML как base64-строки
// (tools/plugins/inlineWorkerSource.js) — поставляется один файл страницы,
// без внешних js.
//
// Из этих строк собираются два URL: blob: (быстрее, не раздувает URL) и
// data: (не требует поддержки blob в воркере). Какой из них работает в
// конкретной сборке 1С, выясняется на месте — см. диагностику в provider.ts.

interface WorkerSources {
  [name: string]: string;
}

function sources(): WorkerSources {
  return ((window as any).__VAWorkerSources || {}) as WorkerSources;
}

// Есть ли встроенный исходник: нужно, чтобы отличить «воркер недоступен»
// от «сборка без воркера».
export function hasWorkerSource(name: string): boolean {
  return Boolean(sources()[name]);
}

// Текст воркера. base64 — это UTF-8 в бинарной строке (в коде воркера есть
// кириллица), поэтому binary -> UTF-8 декодируется вручную.
export function workerSource(name: string): string {
  const base64 = sources()[name];
  if (!base64) return '';
  const binary = atob(base64);
  try {
    return decodeURIComponent(escape(binary));
  } catch (e) {
    return binary;
  }
}

export function workerBlobUrl(name: string): string {
  const source = workerSource(name);
  if (!source) return '';
  return URL.createObjectURL(new Blob([source], { type: 'application/javascript' }));
}

// data:URL собирается прямо из base64 — без перекодирования и без blob.
export function workerDataUrl(name: string): string {
  const base64 = sources()[name];
  if (!base64) return '';
  return 'data:application/javascript;base64,' + base64;
}

export type WorkerDelivery = 'blob' | 'data' | 'none'

// Режим общий для всех воркеров: провайдер Gherkin выясняет, что работает
// в текущей сборке 1С (blob может быть запрещён политикой WebView), и Monaco
// должен использовать тот же исправный способ.
let delivery: WorkerDelivery = 'blob'

export function workerDelivery(): WorkerDelivery {
  return delivery
}

export function setWorkerDelivery(mode: WorkerDelivery) {
  delivery = mode
}

export function workerUrl(name: string, mode: WorkerDelivery = delivery): string {
  if (mode === 'blob') return workerBlobUrl(name)
  if (mode === 'data') return workerDataUrl(name)
  return ''
}
