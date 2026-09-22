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

// daisyUI toast: an `alert` inside the shell's toast region, which the shell owns.
export function toast(message) {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const node = el(`<div class="alert alert-sm alert-info" role="status">${esc(message)}</div>`);
  region.append(node);
  setTimeout(() => node.remove(), 2600);
}
