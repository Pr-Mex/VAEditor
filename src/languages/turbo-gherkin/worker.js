const w = require('./worker')
self.onmessage = function (e) {
  postMessage(w.process(e))
}
