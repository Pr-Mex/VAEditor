export function patchWebKit1C() {
  var standardScrollbarStyle = document.getElementById('1C_scrollbar_12704CA4-9C01-461B-8383-F4CD6283CB75')
  if (standardScrollbarStyle !== null) standardScrollbarStyle.remove()

  if (!('isConnected' in Node.prototype)) {
    Object.defineProperty(Node.prototype, 'isConnected', {
      configurable: true,
      get: function () { return true }
    })
  }

  // Disabling middle click scrolling
  document.body.onmousedown = function (e) { if (e.button === 1) return false; }

  function dummy(e) {
    e = e || window.event
    if (e.preventDefault) e.preventDefault()
    if (e.stopPropagation) e.stopPropagation()
    return false
  }

  document.addEventListener('keydown', function (e) {
    if (!e.altKey && !e.shiftKey) {
      let tabs = window.VanessaTabs
      if (tabs && e.ctrlKey) {
        if (e.keyCode > 48 && e.keyCode < 58) {
          tabs.onPageNumber(e.keyCode - 49)
          return dummy(e)
        }
        switch (e.keyCode) {
          case 33:
          case 34: {
            tabs.onPageNext(e.keyCode === 34)
            return dummy(e)
          }
          case 83: {
            tabs.onFileSave()
            return dummy(e)
          }
        }
      }
      else {
        switch (e.keyCode) {
          case 27: {
            tabs.onEscapePress()
            return false
          }
        }
      }
      return true
    }
  }, false)
}
