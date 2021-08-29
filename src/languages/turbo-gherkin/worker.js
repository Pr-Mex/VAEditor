const w = require('./worker')
self.onmessage = function (e) {
  const res = w.process(e);
  if (res) postMessage(res)
}
