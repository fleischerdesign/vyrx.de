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

/*
 * Der Server wird **gebündelt**, und das ist die Vorgabe.
 *
 * Das Artefakt wird ohne `node_modules` ausgeliefert. Wird eine Abhängigkeit
 * externalisiert, fehlt sie beim Start und der Prozess stirbt mit
 * `ERR_MODULE_NOT_FOUND` - im Store, also in der Produktion, während lokal
 * alles lief.
 *
 * Der Entwicklungsserver darf **nicht** bündeln: er zieht dann CJS-Pakete in
 * ein ESM-Modul und stirbt mit „require is not defined". Damit die sichere
 * Vorgabe nicht durch die Ausnahme verdreht wird, sagt nur der Dev-Befehl sie
 * ausdrücklich ab (`npm run dev` setzt `PORTAL_DEV_SERVER=1`), und
 * `scripts/verify-server.mjs` belegt nach jedem Bau, dass im Serverbaum keine
 * fremde Abhängigkeit mehr steht.
 */
const devServer = process.env.PORTAL_DEV_SERVER === '1';

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
  // Im Bau wird gebündelt; im Dev-Server steht die Vorgabe (nichts externalisieren
  // heißt umgekehrt: nichts bündeln), deshalb fehlt der Schlüssel dort ganz -
  // `noExternal: false` ist in diesem Vite kein gültiger Wert.
  vite: devServer ? {} : { ssr: { noExternal: true } },
});
