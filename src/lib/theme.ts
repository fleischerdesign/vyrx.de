// The appearance: which theme the reader wants, and how the two states are switched.
//
// Three rules, in the order they matter:
//
//   1. **The choice wins, and it is applied before the first paint.** A theme that arrives after the
//      stylesheet has painted is a flash, and a flash is a bug the reader sees on every single
//      navigation - so the head carries one small inline script that sets `data-theme` before anything
//      is drawn (see `layouts/Layout.astro`). This module owns the *key* that script reads.
//   2. **Without a choice, the system decides.** `daisy.css` declares the light theme as the default and
//      dark as `--prefersdark`, so `prefers-color-scheme` answers while nothing is stored.
//   3. **The control exists where it works.** Switched by a script and stored per device, so without
//      scripts it is not shown at all: the system preference is then the whole answer, and nobody gets a
//      button that does nothing.
//
// Where the choice is stored: on the device, not on the account. A preference that belongs to a person
// needs the portal's own storage (D4, E-0009); until then, saying device is honest and saying user would
// not be.

export type Theme = 'light' | 'dark';

export const THEMES: readonly Theme[] = ['light', 'dark'];

/** The storage key the head script reads. Declared here so the script and this module cannot drift. */
export const THEME_KEY = 'vyrx.portal.theme';

/** The theme that is currently in force, from the document - where the head script put it. */
export function currentTheme(): Theme {
  const declared = document.documentElement.dataset.theme;
  if (declared === 'light' || declared === 'dark') return declared;
  // No choice and no theme attribute: the system preference is the answer, and it is the one the CSS is
  // already applying - asking the media query is how the control knows which state to mark.
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Apply a choice: the document first (so it is visible), then the storage (so it survives). */
export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // A browser that refuses storage still gets the theme for this page; it just will not remember it.
  }
}

/**
 * Wire the switch: two buttons that say which state they are, and one document that says whether they
 * are shown at all. Marking the control is the only thing the markup cannot do for itself - everything
 * else (the theme, the storage, the no-flash) is decided before the first paint.
 */
export function wireThemeSwitch(root: ParentNode = document): void {
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-theme-choice]')];
  if (!buttons.length) return;

  const mark = (active: Theme) => {
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(button.dataset.themeChoice === active));
    }
  };

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const choice = button.dataset.themeChoice;
      if (choice !== 'light' && choice !== 'dark') return;
      applyTheme(choice);
      mark(choice);
    });
  }

  mark(currentTheme());
  // A system preference that changes while the page is open: the CSS follows it, and so does the control -
  // but only while no choice is stored, because a stored choice is not up for discussion.
  window.matchMedia?.('(prefers-color-scheme: dark)').addEventListener?.('change', () => {
    if (document.documentElement.dataset.theme) return;
    mark(currentTheme());
  });
}
