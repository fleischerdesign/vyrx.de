import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://vyrx.de',
  // Everything is still prerendered. The adapter only allows individual routes to opt out with
  // `export const prerender = false`, which the API routes do - so the pages stay static files and the
  // Node process exists for the API alone.
  output: 'static',
  adapter: node({ mode: 'standalone' }),
  // Astro 7 strips whitespace by JSX rules by default (`'jsx'`), which glues inline elements together
  // (`<span>a</span><em>b</em>` becomes `ab`). That is a rendering change no structural check can see,
  // so the upgrade keeps the behaviour that was deployed and verified; moving to `'jsx'` is a separate
  // decision with a rendered page to look at.
  compressHTML: true,
  vite: {
    plugins: [tailwindcss()],
  },
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en'],
    routing: {
      prefixDefaultLocale: false,
      // Explicit since Astro 6: the default flipped to `false`, and it may only be `true` together with
      // `prefixDefaultLocale: true`. Stated rather than inherited, because it decides where `/` goes.
      redirectToDefaultLocale: false,
    },
  },
});
