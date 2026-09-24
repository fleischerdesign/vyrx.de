// Small DOM helpers shared by the portal modules. No framework: the app is a few views over a static
// catalogue, and a runtime keeps that honest without shipping one.

const ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Text that goes into markup. Every catalogue value passes through here; nothing else escapes. */
export const esc = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, (character) => ESCAPES[character] ?? character);

/** Markup with exactly one root element, as that element. Fails loudly instead of returning nothing. */
export function el<T extends Element = HTMLElement>(html: string): T {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  const node = template.content.firstElementChild;
  if (!node) throw new Error(`el() was handed markup without a root element: ${html.slice(0, 60)}`);
  return node as T;
}

// One listener on a root instead of one per node: the views replace their own markup, so per-node
// listeners would have to be bound again after every render.
export function delegate(
  root: ParentNode,
  event: string,
  selector: string,
  handler: (event: Event, match: HTMLElement) => void,
): void {
  root.addEventListener(event, (e) => {
    if (!(e.target instanceof Element)) return;
    const match = e.target.closest(selector);
    if (match && root.contains(match)) handler(e, match as HTMLElement);
  });
}

// daisyUI toast: an `alert` inside the shell's toast region, which the shell owns.
export function toast(message: string): void {
  const region = document.getElementById('toast-region');
  if (!region) return;
  const node = el(`<div class="alert alert-info alert-soft" role="status">${esc(message)}</div>`);
  region.append(node);
  setTimeout(() => node.remove(), 2600);
}
