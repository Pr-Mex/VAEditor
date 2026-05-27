// Origin https://github.com/peterschussheim/monaco-editor/blob/master/loaders/blobUrl.js
// MIT License Copyright (c) 2018 Peter Schussheim
// Оборачивает source в blob URL с MIME application/javascript для worker'а

module.exports = function blobUrl (source) {
  return `module.exports = URL.createObjectURL(new Blob([${JSON.stringify(source)}], { type: 'application/javascript' }));`
}
