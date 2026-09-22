// Small DOM helpers shared by the portal modules. No framework: the app is a few views over a static
// catalogue, and a runtime keeps that honest without shipping one.

export const esc = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function el(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

export function delegate(root, event, selector, handler) {
  root.addEventListener(event, (e) => {
    const match = e.target.closest(selector);
    if (match && root.contains(match)) handler(e, match);
  });
}

export function toast(message) {
  const node = el(`<div class="toast" role="status">${esc(message)}</div>`);
  document.body.append(node);
  setTimeout(() => node.remove(), 2600);
}
