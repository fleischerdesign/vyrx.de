# VYRX-Logo — Paket und Prüfung (2026-09-24)

Zwei Lieferungen liegen vor: ein Stück **Code** (SVG-Pfade) und ein **Markenbogen
als PNG**. Beide sind vermessen und gerendert. Aus der Code-Geometrie ist ein
vollständiger Satz Zeichen geworden. Alles vektoriell und reproduzierbar:
`build-assets.py` erzeugt die SVGs, ImageMagick rastert sie. Kein Bitmap als
Quelle, keine Schriftart, kein fremder Ursprung.

Belege zum Ansehen: `preview.html` (Portal dieser Sitzung) — Vergleich der
Fassungen, Größenprobe, Maskenprobe, Reiter in hell und dunkel, Teilen-Karte.

## 1. Markenbogen (PNG) gegen Code (SVG)

Gemessen an den gelieferten Dateien (`sheet-wordmark.png` ist der Ausschnitt aus
`brand-sheet.png`):

| Maß | Markenbogen | Code |
|---|---|---|
| Versalhöhe | 137 px | 185 Einheiten |
| Breite V / Y / R / X | 194 / 167 / 149 / 185 px | 280 / 260 / 260 / 240 |
| auf Versalhöhe 185 normiert | 262 / 225 / 201 / 250 | 280 / 260 / 260 / 240 |
| Abstände | 43 / 45 / 37 px → 58 / 61 / 50 normiert | 20 / 20 / **−120** |

Drei Aussagen, mehr steht nicht darin:

1. **Der Code hat einen Fehler.** `translate(-95,0)` schiebt das X auf 755–990,
   das R endet bei 875 — 120 Einheiten Überlappung. Im Bogen sind alle vier
   Buchstaben getrennt (Zeile 1 gegen Zeile 2 in `wordmark-compare-view.png`).
2. **Der Code ist keine maßstäbliche Vorlage des Bogens.** Die Buchstaben des
   Codes sind breiter (Y +16 %, R +29 % nach Normierung auf dieselbe Versalhöhe)
   und enger gesetzt: der Bogen setzt sie etwa dreimal so weit auseinander.
3. **Es gibt für den Bogen keine Vektordatei.** Ein Bild ist keine Vorlage; wer
   seine Buchstaben will, muss sie zeichnen, nicht ableiten.

Deshalb liegen zwei Fassungen der Wortmarke im Paket: `wordmark.svg` (Abstände
20, konsistent im Code) und `wordmark-loose.svg` (Abstände 56/57/50, die
Spurweite des Bogens). **Diese Entscheidung ist nicht meine:**

- `wordmark.svg` — wenn die Geometrie des Codes die Marke ist.
- `wordmark-loose.svg` — wenn der Bogen die Marke ist; die Buchstaben bleiben
  die des Codes, nur der Lauf wird weiter.

## 2. Das Zeichen in vier Rollen

Der Bogen zeigt als App-Symbol die Wortmarke in der Kachel. Das ist für den
Startbildschirm richtig, aber nicht für alles: bei 32 px ist die Wortmarke ein
Fleck (der Bogen beweist es selbst), und ein frei stehendes dunkles Zeichen
verschwindet auf einem dunklen Reiter. Deshalb:

| Rolle | Datei | Warum |
|---|---|---|
| Reiter (Favicon) | `favicon.ico` (16/32/48), `favicon-*.png` | schwarze Kachel, weißes **V** — bei 16 px lesbar, in hell und dunkel sichtbar |
| Startbildschirm, Startmenü | `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Kachel mit Wortmarke, wie im Bogen |
| Android, adaptives Symbol | `icon-maskable-512.png` | volle Fläche, **V** in der Safe-Zone: eine runde Maske schneidet eine Wortmarke an (Probe: `mask-test.png`) |
| Fläche, Druck, heller Grund | `mark.svg`, `wordmark.svg`, `wordmark-white.svg` | Vektor ohne Hintergrund |
| Teilen | `vyrx-og.png` | 1200 × 630, weiß auf `#0a0a0a` |

Weitere Dateien: `mark-white-on-black.svg`, `mark-maskable.svg` (Prüffeld),
`wordmark-white-on-black.svg`, `wordmark-loose-white.svg`, `icon-tile.svg`,
`icon-tile-v.svg`, `icon-maskable.svg`, `site.webmanifest`, `index.html`.

Grenze, ausdrücklich: die Marke ist das V, kein eigenes Zeichen. Der Bogen
liefert keins. Wer ein eigenständiges Symbol will, braucht eine Zeichnung.

## 3. Was der Bogen an Text mitbringt

- `SMARTER CONNECTIONS · A BRIGHTER TOMORROW` — gibt es nur englisch. Die
  Übersetzungsdatei kennt den Satz nicht; die Parität beider Sprachen ist
  Pflicht (Backlog H1), also braucht er ein `de` und ein `en`.
- `NETWORK · SECURITY · SMART HOME · YOU` — „Smart Home“ ist im Katalog **ein**
  Eintrag (`home-assistant`). Sieben Kacheln sind Medien, fünf „AI & Agents“.
  Ein Versprechen, das der Katalog nicht einlöst, ist schlechter als keins.
- Der Entwurf sagt „YOU“, die Landing sagt „Enterprise Architecture & Cloud
  Platform“ und „Zero-Trust Edge“. Das ist gegen die eigene Regel (Klartext vor
  Fachsprache) und gegen den Ton des Bogens.

## 4. Einbau (Vorschlag, noch nicht ausgeführt)

`public/`: `favicon.ico`, `mark.svg`, `apple-touch-icon.png`, `icon-192.png`,
`icon-512.png`, `icon-maskable-512.png`, `site.webmanifest`, `vyrx-og.png`.

`src/layouts/Layout.astro`, im Kopf:

```html
<link rel="icon" href="/favicon.ico" sizes="any" />
<link rel="icon" type="image/svg+xml" href="/mark.svg" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/site.webmanifest" />
<meta name="theme-color" content="#000000" />
<meta property="og:type" content="website" />
<meta property="og:title" content={t.siteTitle} />
<meta property="og:description" content={t.siteDesc} />
<meta property="og:image" content="https://vyrx.de/vyrx-og.png" />
<meta property="og:locale" content={locale === 'en' ? 'en' : 'de'} />
```

Dazu im Ingress (`nixfiles`, siehe Backlog U1): `/favicon.ico`, `/mark.svg`,
`/apple-touch-icon.png`, `/icon-*.png`, `/site.webmanifest`, `/vyrx-og.png` am
Outpost vorbei — sonst zeigt der Reiter nichts, und jedes Symbol erzeugt eine
Anmeldung.
