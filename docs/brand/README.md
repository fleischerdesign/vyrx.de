# Markensatz

Eine Zeichnung, vier Anordnungen, sieben Dateien. Alles hier ist aus
`vyrx-primary-black.svg` abgeleitet — **keine Buchstabe wird nachgezeichnet**, jede
Datei ist eine Anordnung derselben fünf Pfade (das X besteht aus zwei, weil sein
oberer rechter Arm laut Zeichnung ein eigenes Stück ist).

Die Quelle selbst kam als Markenbogen: vier Buchstaben auf einer Zeile,
Versalhöhe 137, Wortmarke 353…1179 auf dem Zeichenraster.

## Warum vier Anordnungen

Gemessen, echte Kachelgrößen, Motiv auf 80 % (Tinte in Pixeln bei 50 %-Schwelle):

| Anordnung | 16 × 16 | 32 × 32 | Seitenverhältnis |
|---|---|---|---|
| `wordmark` einzeilig | **0** | 27 — unleserlich | 6,0 |
| `two-line` VY/RX | 25 — Striche, keine Buchstaben | 106, **lesbar** | 1,34 |
| `mark-v` / `mark-x` | 30 / 32, **lesbar** | 119 / 159, klar | 1,6 / 1,5 |

Daraus die Rollen:

| Datei | Wo |
|---|---|
| `wordmark.svg` | breite Plätze: Kopfzeile, Landing, Teilen-Karte |
| `two-line.svg` | quadratische Plätze ab ~48 px: App-Symbol, Startbildschirm |
| `mark-v.svg` | 16 px und darunter (Reiter, kleine Listen) |
| `tile-v.svg` | dieselbe Größe als Kachel: schwarzes Quadrat, weißes V |
| `tile-app.svg` | Kachel mit der zweizeiligen Marke (78 % der Fläche) |
| `tile-maskable.svg` | dieselbe Marke auf **56 %**: eine runde Wischmaske zeigt 61 % der Kachel, ein quadratischer Block darüber verliert seine Ecken |

Die Kachel ist keine Kosmetik: ein frei stehendes schwarzes Zeichen verschwindet auf
einem dunklen Reiter, während es auf einem hellen zu hart wirkt. Schwarz-weiß trägt
in beiden Themes (G2).

## Bauen

```sh
cd docs/brand && python3 build.py     # braucht ImageMagick (`magick`) im Pfad
```

Das Skript prüft am Ende sein eigenes Ergebnis: die Tinte muss in jeder Kachel
mittig sitzen (Toleranz 2 %). Diese Prüfung hat einen Fehler gefunden, den keine
Aussage über Rechtecke sehen konnte — die Buchstaben hingen unten aus der Kachel,
weil nur die X-Achse des Zeichenrasters normiert war.

Es schreibt die abgeleiteten SVGs hierher und die Raster nach `public/`:
`favicon.ico` (16/32/48), `favicon.svg`, `apple-touch-icon.png` (180),
`icon-192.png`, `icon-512.png`, `icon-maskable-512.png`.

## Grenzen, ausdrücklich

- **Zwei Buchstaben sind keine Marke.** Der Satz hat kein eigenes Zeichen; wo eines
  gebraucht würde, steht ein Buchstabe der Wortmarke.
- **Die Farben sind nur Schwarz und Weiß.** Ein Farbmarken-Entwurf fehlte; die
  Kachel nimmt deshalb die Schwärze der Zeichnung.
- **Die Maße sind aus der Zeichnung gelesen** (`PATH_LEFT`, `WIDTH`, `CAP_HEIGHT`,
  `PATH_TOP` in `build.py`) und nicht neu vermessen: wer das SVG austauscht, muss
  sie nachziehen — die Prüfung am Ende des Skripts meldet es, wenn die Boxen dann
  nicht mehr stimmen.
