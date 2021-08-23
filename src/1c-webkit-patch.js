export function patchWebKit1C() {
  var standardScrollbarStyle = document.getElementById('1C_scrollbar_12704CA4-9C01-461B-8383-F4CD6283CB75')
  if (standardScrollbarStyle !== null) standardScrollbarStyle.remove()

  if (!('isConnected' in Node.prototype))
    Object.defineProperty(Node.prototype, 'isConnected', {
      configurable: true,
      get: function () { return true }
    })

  Object.defineProperty(Object.prototype, 'useShadowDOM', {
    configurable: true,
    get: () => false,
    set: function (value) { }
  })

  function dummy(e) {
    e = e || window.event
    if (e.preventDefault) e.preventDefault()
    if (e.stopPropagation) e.stopPropagation()
    return false
  }

  document.addEventListener('keydown', function (e) {
    if (e.ctrlKey) {
      switch (e.keyCode) {
        case 33:
        case 34: {
          var tabs = window.VanessaTabs
          if (tabs) tabs.onPageNext(e.keyCode === 34)
          return dummy(e)
        }
        case 83: {
          var editor = window.VanessaEditor || window.VanessaDiffEditor || window.VanessaTabs
          if (editor) editor.onFileSave()
          return dummy(e)
        }
      }
    }
    return true
  }, false)
}
