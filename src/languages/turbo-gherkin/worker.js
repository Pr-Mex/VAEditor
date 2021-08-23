const w = require('./worker').worker;
self.onmessage = function (e) {
  postMessage(w.process(e));
}
