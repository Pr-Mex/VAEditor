export const keyboard = (type, params) => {
  document.dispatchEvent(new KeyboardEvent(type, params));
}
