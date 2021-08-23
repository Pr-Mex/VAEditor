import { script } from "./worker.file"

//const blob1 = require("blob-url-loader?type=application/javascript!compile-loader?target=worker&emit=false!monaco-editor/esm/vs/editor/editor.worker");
const blob = new Blob([script], { type: 'application/javascript' });
const worker = new Worker((window.URL || window.webkitURL).createObjectURL(blob));

// Handle messages from web worker
let id = 0;
/** @type {Map<string, {resolve: ()=>void, reject: ()=>void}>} */
const messageMap = new Map();
worker.onmessage = function (e) {
  console.log("Main: Receiving message", e.data);
  const promise = messageMap.get(e.data.id);
  if (promise) {
    messageMap.delete(e.data.id);
    if (e.data.success) promise.resolve(e.data.data);
    else promise.reject(e.data.data);
  }
}

// Register a completion item provider that queries the web worker
monaco.languages.registerCompletionItemProvider("bsl", {
  provideCompletionItems(model, position, context, token) {
    const textUntilPosition = model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: position.lineNumber, endColumn: position.column });
    const currentId = ++id;
    const promise = new Promise<monaco.languages.CompletionList>((resolve, reject) => {
      messageMap.set(currentId, { resolve, reject });
    });
    worker.postMessage({ id: currentId, data: textUntilPosition });
    return promise;
  },
  resolveCompletionItem(item, token) {
    return item;
  }
})