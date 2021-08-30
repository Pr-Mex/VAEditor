const w = require('./worker')
self.onmessage = function (e) {
  const res = w.process(e.data);
  if (res) postMessage(res)
}
