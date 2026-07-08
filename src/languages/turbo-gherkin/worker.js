const w = require('./worker')
self.onmessage = function (e) {
  try {
    const res = w.process(e.data);
    if (res) postMessage(res)
  } catch (err) {
    // исключение в process() без перехвата → нет postMessage → промис в provider
    // (messageMap) висит вечно и фича молча зависает. Возвращаем ошибку, чтобы
    // провайдер сделал reject (только если сообщение ждало ответ — есть id).
    if (e.data && e.data.id) postMessage({ id: e.data.id, success: false, data: String((err && err.stack) || err) })
  }
}
