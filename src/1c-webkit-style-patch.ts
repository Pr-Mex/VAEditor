export function patchWebKit1C() {

  const standardScrollbarStyle = document.getElementById('1C_scrollbar_12704CA4-9C01-461B-8383-F4CD6283CB75');
  if (standardScrollbarStyle !== null) {
    standardScrollbarStyle.remove();
  }
  const fullscreenStyle = document.createElement('style');
  fullscreenStyle.setAttribute("type", "text/css");
  fullscreenStyle.innerHTML = 'html, body { width: 100%; height:100%; margin: 0; padding: 0; } ::-webkit-scrollbar { display: none; }';
  document.head.appendChild(fullscreenStyle);

  document.addEventListener('keydown', e => {
    const stop = e => {
      if (e.preventDefault) e.preventDefault()
      if (e.stopPropagation) e.stopPropagation()
      return false
    }
    if (e.ctrlKey) {
      switch (e.keyCode) {
        case 33:
        case 34: {
          const tabs = window["VanessaTabs"]
          if (tabs) tabs.onPageNext(e.keyCode === 34)
          return stop(e)
        }
        case 83: {
          const editor = window["VanessaEditor"] || window["VanessaDiffEditor"] || window["VanessaTabs"]
          if (editor) editor.onFileSave()
          return stop(e)
        }
      }
    }
    return true
  }, false)
}