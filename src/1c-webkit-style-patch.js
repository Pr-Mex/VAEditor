(() => {
  const standardScrollbarStyle = document.getElementById('1C_scrollbar_12704CA4-9C01-461B-8383-F4CD6283CB75')
  if (standardScrollbarStyle !== null) {
    standardScrollbarStyle.remove()
  }

  const fullscreenStyle = document.createElement('style')
  fullscreenStyle.type = 'text/css'
  fullscreenStyle.innerHTML = "\
  html, body { width: 100%; height:100%; margin: 0; padding: 0; }\
  ::-webkit-scrollbar { display: none; }\
  .debug-pending-step { background: lightblue; }\
  .vanessa-error-widget { background: #FFCCCC; padding: 0 0.5em 0 0.5em; overflow: hidden; white-space: nowrap; }\
  ";
  document.head.appendChild(fullscreenStyle)
})()
