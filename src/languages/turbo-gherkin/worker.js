const w = require('./worker')

// Исключение внутри воркера видно только в его собственной консоли, а страница
// при этом просто не получает ответа и висит до таймаута. Поэтому любую
// ошибку обработки возвращаем вызывающей стороне как обычный ответ.
self.onmessage = function (e) {
  const msg = e.data
  let res
  try {
    res = w.process(msg)
  } catch (error) {
    postMessage({
      id: msg && msg.id,
      success: false,
      data: 'воркер: ' + ((error && error.stack) || error)
    })
    return
  }
  if (res) postMessage(res)
}
