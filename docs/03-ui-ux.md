# 03 — Gestaltung und Bedienung (UI/UX)

Grundsätze, die für jede Änderung gelten — und danach konkrete Verbesserungen.

## 1. Grundsätze

1. **Eine Hülle, zwei Zustände.** `data-auth` entscheidet, welche Bedienelemente
   sichtbar sind. Landing und Anwendung sind keine zwei Entwürfe. Neue Ansichten
   fügen sich hier ein, sie bringen keinen eigenen Rahmen mit.
2. **Dienste-agnostisch.** Die Oberfläche kennt Katalogformen (Kategorie, Rolle,
   Sichtbarkeit, Zone), nie einen Produktnamen. Ein Name darf in Daten und
   Übersetzungen stehen, nie in einer Bedingung im Code.
3. **Jede Ansicht beantwortet eine Frage.** Übersicht: „Was gibt es?“ Dienste:
   „Was kann ich benutzen?“ Status: „Läuft es?“ Konto: „Wer bin ich hier?“
   Admin: „Wie ist es eingerichtet?“ Eine Ansicht, die zwei Fragen beantwortet,
   wird geteilt, nicht überladen.
4. **Vier Zustände sind Pflicht.** Für jede datenabhängige Fläche: laden, leer,
   Fehler, gefüllt. Ein Zustand, den niemand gestaltet hat, gestaltet der Zufall.
5. **Farbe trägt Bedeutung, Text trägt die Aussage.** Ein Zustandspunkt steht
   nie allein: Punkt plus Beschriftung, auch für Screenreader.
6. **Ohne Maus, ohne JavaScript.** Wo es nicht geht, wird der Ausfall erklärt.
7. **Konsistenz schlägt Geschmack.** Abstände, Rundungen, Symbole und Wortwahl
   kommen aus dem Bestand (daisyUI und die Übersetzungsdatei), nicht aus dem
   Einzelfall.

## 2. Verbesserungen, nach Wirkung sortiert

### Zuerst (klein, große Wirkung)
- **Hell und dunkel** mit Systemvorgabe plus Wahl (G2, umgesetzt): die Wahl
  schlägt die Systemvorgabe, sie wird vor dem ersten Bild gesetzt und je Gerät
  gemerkt (E-0014); benutzerweise braucht sie den Speicher aus D4.
- **`aria-live` für Zustandswechsel.** Eine Region (`polite`) meldet „Dienst x
  ist ausgefallen“, damit die Aussage nicht nur visuell existiert.
- **Fokusführung in der Palette.** Beim Öffnen Fokus in das Eingabefeld, in der
  Liste gefangen, beim Schließen zurück auf das auslösende Element.
- **Kürzel sichtbar.** `?` für eine Übersicht, die Palette nennt ihre Tasten.
- **Fehler- und Leerzustände vereinheitlichen.** Ein Muster für alle Ansichten:
  Was ist passiert, was bedeutet es, was kann ich tun.
- **Symbole und Manifest.** *(erledigt, G1)* Sieben Dateien aus einer Zeichnung,
  gestaffelt nach Größe: ein Buchstabe bei 16 px, VY/RX zweizeilig ab ~48 px,
  Wortmarke einzeilig für breite Plätze (`src/brand/`).
- **Polling nur bei sichtbarem Tab** (`visibilitychange`), längeres Intervall
  im Hintergrund.

### Danach (mittlere Wirkung)
- **Statusverlauf.** Ein Ausfall ohne Verlauf ist eine Momentaufnahme; mit
  Verlauf wird er eine Auskunft („seit 22:10, vorher stabil“).
- **Gruppierte und filterbare Statusansicht** nach Kategorie und Rolle, mit
  gemerktem Filter.
- **Datenstand sichtbar.** „Stand: vor 12 Sekunden“ neben jeder Live-Fläche,
  statt eines stillen Sprungs.
- **Präferenzen** (Sprache, Dichte, Reihenfolge) statt fester Anordnung.
- **`prefers-reduced-motion`** für Skeletons und Übergänge.
- **Dichte Variante für Techniker.** Mehr Zeilen pro Bildschirm, weniger
  Erklärtext — dieselben Daten, andere Darstellung.

### Später (Vorhaben)
- **Ansichten ohne JavaScript** (siehe Backlog G3).
- **Wiki-Lesefläche** mit Inhaltsverzeichnis, Suchtreffern und „Verwandtes“ —
  Lesbarkeit ist hier das Gestaltungsziel, nicht Bedienung.
- **Dienstübergreifende Suche**, deren Ergebnisse nach Herkunft gruppiert sind
  und langsam erreichbare Quellen nachladen dürfen.
- **Dunkle und helle Diagramme**, sobald es Diagramme gibt: Verläufe sollen
  denselben Zustandsfarben folgen wie die Punkte.

## 3. Texte und Sprache

- **Die Übersetzungsdatei ist die Wahrheit.** Kein Text im Markup. Die Parität
  beider Dateien ist derzeit Zufall — sie wird geprüft (Backlog H1).
- **Klartext vor Fachsprache.** „Sichtbarkeit: nur im Netz“ statt „scope: mesh“.
  Die kurze technische Bezeichnung darf daneben stehen, nicht stattdessen.
- **Handlungsorientierte Knöpfe.** Was passiert, steht auf dem Knopf:
  „Anmelden“, „Film beantragen“, nicht „OK“.
- **Fehlermeldungen nennen den nächsten Schritt** und schreiben keine Schuld zu.
- **Anrede.** „Du“ für Privatnutzer, konsequent in beiden Sprachen (im Englischen
  neutral „you“). Ein Portal, das wechselt, wirkt unentschieden.
- **Zahlen, Datum und Zeit** über `Intl` je Sprache formatieren; im Moment gibt
  es keine solche Formatierung (festgehalten in `01-ist-analyse.md`, 3.4).

## 4. Barrierefreiheit

Bereits vorhanden: Sprungmarke `#main`, `aria`-Attribute, `sr-only`-Klassen,
Fokusfarben aus daisyUI, Zustandspunkte mit Beschriftung.

Fehlt: `aria-live` für Live-Daten, Fokusfalle und Fokusausgleich in der Palette,
Kontrastprüfung der Zustandsfarben, Bedienung ohne Zeigegerät im Detailfluss,
Rücksicht auf `prefers-reduced-motion`, Beschriftung von Symbolknöpfen.

Prüfmaßstab: Das Portal ist mit Tastatur vollständig bedienbar, jede Aussage
erscheint auch im Text, und alle Zustände sind ohne Farbwahrnehmung
unterscheidbar.

## 5. Mobil

Der Shell hat Zeichnung und Hafen unten („dock“) und eine Schublade für die
volle Navigation. Zu beachten:

- Zustandsflächen müssen mit einer Hand erreichbar bleiben; die wichtigsten
  Handlungen gehören ins untere Drittel.
- Die Palette ist auf Mobilgeräten die schnellste Bedienung — sie darf nicht
  hinter einem Symbol verschwinden.
- Tabellen (Admin-Matrix) brauchen auf schmalen Geräten eine eigene Darstellung,
  nicht seitliches Scrollen.
## 6. Navigation und Adressen

### 6.1 Zwei Regeln

1. Die Seitenleiste beantwortet Fragen von Nutzern, nicht den Funktionsumfang
   der Betreiber.
2. Was Verwaltung ist, wohnt unter `/admin`, was die eigene Person betrifft
   unter `/account`. Kein Verwaltungsbereich wird ein Haupteintrag.

### 6.2 Einträge

| Eintrag | Zweck | Nimmt auf |
|---|---|---|
| Start `/` | „was ist hier, was mich angeht?“ | Favoriten, Ankündigungen, eigene Dinge |
| Dienste `/services` | der Katalog | Integrationen, Direktaufruf, Kurzaktionen |
| Wissen `/knowledge` | Grund für nicht-technische Nutzer zu kommen | Wissensbasis, Rezepte, Klartext-Hilfe |
| Status `/status` | „läuft es?“ | Klartext-Ausfall statt Host-Zustand |
| Konto `/account` | „was ist mein?“ | Anliegen, Geräte, Rechte, Benachrichtigungen |
| Verwaltung `/admin` | nur für Berechtigte | Geräte, Netz, Contracts, Zugänge, Vorgänge, Protokoll, Ablauf |

Verwaltung und Konto sind **Abschnitte** ihrer Route (`/admin/<bereich>`,
`/account/<bereich>`), keine eigenen Einträge. Das untere Hafen trägt höchstens
fünf Einträge (Start, Dienste, Wissen, Status, Konto); Verwaltung bleibt in der
Schublade.

### 6.3 Adressen

Alle Pfade sind englische Bezeichner; Deutsch präfixlos, Englisch unter `/en/`.
Die Raute entfällt.

| Absicht | Deutsch | Englisch |
|---|---|---|
| Start | `/` | `/en/` |
| Katalog | `/services` | `/en/services` |
| Dienst | `/services/<id>` | `/en/services/<id>` |
| Wissen | `/knowledge` | `/en/knowledge` |
| Status | `/status` | `/en/status` |
| Konto | `/account` | `/en/account` |
| Verwaltung | `/admin` | `/en/admin` |

Regel: Ein Pfad ist ein Bezeichner, ein Text ist eine Übersetzung. Der Pfad
wechselt nie mit der Sprache, die Beschriftung schon.

Die Adressen tragen den abschließenden Schrägstrich, den der Bau erzeugt
(`/services/`, `/en/services/`) — dieselbe Schreibweise, die `canonical` und
`hreflang` nennen. Jeder Dienst hat eine eigene Seite (`/services/<id>/`); wer
die Sprache wechselt, bleibt auf demselben Dienst. Eine Dienstseite, die nur
bestimmten Gruppen gehört, sagt ohne Identität „Diesen Dienst gibt es nicht“
(A4) und zeigt sich dem Browser, der die Gruppen kennt.

### 6.4 Was keinen Eintrag bekommt

Kein Eintrag je Integration (sie gehören in den Katalog), keiner für die Suche
(die Palette genügt), kein zweites „Hilfe“ neben „Wissen“, kein „Dashboard“
neben „Start“. Ein Ort je Absicht.
## 7. Komponenten

**Regel:** Wo eine daisyUI-Komponente existiert, wird sie benutzt — daneben
entsteht kein eigenes Markup. Wo keine existiert, entsteht **eine** eigene
Komponente, die dokumentiert und überall wiederverwendet wird; nichts wird an
zwei Stellen von Hand gebaut. Wer eine Ansicht baut, findet die Komponente in
der Zuordnung unten statt sie zu erfinden.

**Farben und Abstände** kommen aus den Theme-Werten (`base-100`,
`base-content`, `primary`, …), nie aus rohen Farbwerten. Hell und dunkel ist
deshalb kein eigenes CSS, sondern ein Theme — geschaltet über
`theme-controller` (G2).

Zwei Grenzen, die ausdrücklich nicht von daisyUI kommen:

- **Symbole** — der Sprite im Projekt bleibt die einzige Quelle. daisyUI liefert
  keine Symbole; ein zweiter Satz wäre der Anfang der Uneinheitlichkeit.
- **Diagramme** — Kurven bleiben bei Grafana oder genau einer Bibliothek.
  daisyUI hat keine Diagramme; ein selbstgebautes wäre ein eigenes Thema.

### Zuordnung: Vorhaben zu Komponenten

Bestätigt gegen die Komponentenliste von daisyui.com (2026-09-23); im
Repository ist `node_modules` nicht installiert, die Prüfung lief also gegen die
Dokumentation, nicht gegen die lokale Fassung.

| Vorhaben | Komponente |
|---|---|
| Zeichnung, Hafen, Kopfzeile | `drawer`, `dock`, `navbar`, `menu` |
| Sprung zwischen Ansichten und Abschnitten | `breadcrumbs`, `tab` |
| Wissensbasis mit Lesetiefe | `collapse` (Abschnitt „Technisch“), `menu`, `card` |
| Statusverlauf | `timeline` |
| Onboarding-Reise | `steps` |
| Geräte, Leases, Ablaufregister | `table`, `badge`, `status`, `tooltip`, `progress`, `radial-progress` |
| Filtern und Auswählen | `filter`, `select`, `checkbox`, `toggle` |
| Vorgänge | `list`, `badge`, `timeline`, `modal` (Bestätigung) |
| Suche und Palette | `modal`, `menu`, `kbd` (Kürzel) |
| Trockenlauf und Änderung | `diff` |
| Meldungen | `alert`, `toast` |
| Ladezustände | `skeleton`, `loading` |
| Zahlen und Anteile | `stat`, `radial-progress` |
| Wartungsfenster und Zeiträume | `calendar` (Fassung prüfen, sobald gebraucht) |
| Flächen teilen und verbinden | `divider`, `join`, `stack` |
| Leerzustände | `card` mit genau einer Handlung — es gibt keine „leer“-Komponente, also **eine** eigene, eine einzige |


