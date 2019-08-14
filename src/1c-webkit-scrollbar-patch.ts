(() => {
  const standardScrollbarStyle: HTMLStyleElement =
    document.getElementById("1C_scrollbar_12704CA4-9C01-461B-8383-F4CD6283CB75") as HTMLStyleElement;
  if (standardScrollbarStyle !== null) {
    standardScrollbarStyle.remove();
  }

  const nonDisplayScrollbarStyle: HTMLStyleElement = document.createElement("style") as HTMLStyleElement;
  nonDisplayScrollbarStyle.type = "text/css";
  nonDisplayScrollbarStyle.innerHTML = "::-webkit-scrollbar { display: none; }";
  document.head.appendChild(nonDisplayScrollbarStyle);
})();
