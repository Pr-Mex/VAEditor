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
  .vanessa-peekview-action { background: url(data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiIgdmlld0JveD0iMyAzIDE2IDE2IiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDMgMyAxNiAxNiI+PHBvbHlnb24gZmlsbD0iIzQyNDI0MiIgcG9pbnRzPSIxMi41OTcsMTEuMDQyIDE1LjQsMTMuODQ1IDEzLjg0NCwxNS40IDExLjA0MiwxMi41OTggOC4yMzksMTUuNCA2LjY4MywxMy44NDUgOS40ODUsMTEuMDQyIDYuNjgzLDguMjM5IDguMjM4LDYuNjgzIDExLjA0Miw5LjQ4NiAxMy44NDUsNi42ODMgMTUuNCw4LjIzOSIvPjwvc3ZnPg==) center center no-repeat;}\
  ";
  document.head.appendChild(fullscreenStyle)
})()
