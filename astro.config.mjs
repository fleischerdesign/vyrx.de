// Neue App, neuer Aufbau.
//
// `output: 'server'` ist die sichere Vorgabe: jede Seite ist zunächst
// serverseitig und autorisiert. Öffentliche Seiten erklären mit
// `export const prerender = true`, dass sie für alle gleich sind und als Datei
// entstehen dürfen. Damit kann eine private Ansicht nicht versehentlich
// vorgerendert und ausgeliefert werden - man muss Öffentlichkeit ausdrücklich
// sagen, statt sie zu vergessen.
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

export default defineConfig({
  site: 'https://vyrx.de',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  // Astro 7 entfernt Weißraum nach JSX-Regeln; das Verhalten bleibt wie beim
  // bestehenden Auslieferungsstand, damit Inline-Elemente nicht zusammenkleben.
  compressHTML: true,
  i18n: {
    defaultLocale: 'de',
    locales: ['de', 'en'],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
  },
});
