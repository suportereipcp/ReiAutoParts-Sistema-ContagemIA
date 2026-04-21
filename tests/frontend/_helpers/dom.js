import { Window } from 'happy-dom';

let _window = null;

export function criarDOM(html = '') {
  _window = new Window();
  _window.document.body.innerHTML = html;
  globalThis.window = _window;
  globalThis.document = _window.document;
  globalThis.HTMLElement = _window.HTMLElement;
  globalThis.CustomEvent = _window.CustomEvent;
  globalThis.Event = _window.Event;
}

export function limparDOM() {
  if (_window) { _window.close(); _window = null; }
  delete globalThis.window;
  delete globalThis.document;
  delete globalThis.HTMLElement;
  delete globalThis.CustomEvent;
  delete globalThis.Event;
}
