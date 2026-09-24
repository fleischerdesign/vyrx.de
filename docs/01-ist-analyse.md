# 01 — Ist-Analyse

Stand: 2026-09-22, Branch `main`, Repository `github.com/fleischerdesign/vyrx.de`.
Gegenstück für den Betrieb: `fleischerdesign/nixfiles` (Caddy, Outpost, Kollektor).

## 1. Was das Portal heute ist

Eine statisch gebaute Astro-Anwendung mit einem kleinen Node-Prozess, der
ausschließlich die JSON-Endpunkte unter `/api/` bedient (`output: static`,
Adapter `@astrojs/node`; nur die API-Routen setzen `prerender = false`).
Alles andere sind vorgerenderte Dateien — die Seiten bleiben also abrufbar,
auch wenn der Node-Prozess steht.

### Schichten

| Schicht | Ort | Aufgabe |
|---|---|---|
| Hülle (SSR) | `src/components/shell/AppShell.astro`, `src/layouts/Layout.astro`, `src/layouts/AppLayout.astro` | **Ein** Shell für zwei Zustände (`data-auth="in|out"`), Navigation, Sprachumschalter, Sprungmarke `#main`; `AppLayout` setzt Dokument, Hülle und Startskript zusammen |
| Inhalt | `src/components/landing/Landing.astro`, `src/components/view/StaticView.astro` | die Landing für Besucher und die Datei-Fassung jeder Ansicht (was allen gehört) — Inhalt, nicht Hülle |
| Verträge | `src/lib/contract.ts` | die Formen, einmal aufgeschrieben: Katalog, Identität, Status, Ansichtsform — Formen, nie Werte |
| Katalog (Bau) | `src/lib/catalogue.ts` | liest den Katalog beim Bau (`PORTAL_CATALOGUE` oder `./portal.json`) und gibt die Ansicht zurück, die allen gehört |
| Daten | `src/lib/api.ts` | einziger Ort mit `fetch`; Identität, Katalog, Status, Favoriten |
| Darstellung | `src/lib/views.ts` | reine Renderfunktionen; „kennen die Katalogform, nie einen Dienstnamen“ |
| Verhalten | `src/lib/app.ts` | Router (`hashchange`), Ereignisdelegation, Favoriten, Befehlspalette, Offline-Zustand |
| Betrieb | `src/pages/api/*` | `me` (Identität aus Proxy-Headern), `status` (Prometheus), `hosts` (Registry), `[...path]` (JSON-404) |
| Gestaltung | `src/styles/daisy.css` | Tailwind 4 + daisyUI 5, ein dunkles Theme als Vorgabe |

### Routen

- Seiten: `/` (Deutsch, präfixlos) und `/en/`; jede Ansicht ist eine eigene
  Seite mit eigenem Kopf (`/services/`, `/status/`, `/account/`, `/admin/` und
  die englischen Zwillinge), dazu je eine `404`-Seite pro Sprache. Die Adressen
  entstehen aus einer Tabelle: `src/lib/routes.ts`.
- Jeder Dienst hat eine eigene Seite (`/services/<id>/`, englisch
  `/en/services/<id>/`) — erzeugt aus dem Katalog, der beim Bau gelesen wird
  (`src/lib/catalogue.ts`).
- Für Nicht-Administratoren rendert `/admin/` die Verbotsansicht statt der
  Matrix — der Zustand ist also sichtbar, nicht leer.
- Endpunkte: `/api/me`, `/api/status`, `/api/hosts`, plus JSON-404 für alles
  andere unter `/api/`. Katalog: `/portal.json`.

## 2. Was heute trägt

1. **Zwei Publika, ein Bauplan.** Besucher sehen die Landing mit Flotten-
   übersicht, Angemeldete dieselbe Hülle mit den Ansichten. Kein zweiter
   Entwurf, keine zweite Navigation.
2. **Zweisprachig mit Parität.** `de.json` und `en.json` haben je 84 Schlüssel,
   Mengendifferenz 0 (geprüft). Deutsch präfixlos, Englisch unter `/en/`,
   `hreflang` inklusive `x-default` gesetzt.
3. **Identität ohne Token im Browser.** Der Outpost schreibt `x-authentik-*`;
   `/api/me` benennt sie in `x-portal-*` um. Caddy entfernt die eingehenden
   Header vorher, der Prozess ist nur über Caddy erreichbar. Der Browser kann
   die Werte nicht fälschen.
4. **Status aus derselben Quelle wie die Alarme.** `/api/status` fragt
   Prometheus mit serverseitig festgelegten Ausdrücken ab; der Browser kann
   keine beliebige Abfrage stellen. Antwort mit `cache-control: public, max-age=10`
   und ein 502 mit sprechender Fehlermeldung, wenn der Kollektor schweigt.
5. **Sauber abgeleitete Struktur statt Doppelpflege.** `NAV` existiert genau
   einmal (`src/lib/nav.ts`); die frühere zweite Tabelle in `app.ts` ist
   entfernt, die Begründung steht als Kommentar dort. Der Icon-Sprite wird
   serverseitig ausgegeben und von Hülle und Client gemeinsam genutzt, damit
   ein Icon nicht auseinanderlaufen kann.
6. **Zustände sind bedacht.** Skeletons beim Laden, Offline-Erkennung über
   `navigator.onLine` und die Ereignisse `online`/`offline`, leere Ansichten,
   Toast-Meldungen (`#toast-region`), Favoriten und Zuletzt-Benutztes.
7. **Randfälle der Rechte.** Rollen, Fähigkeiten (`capRelay`, `capIngress`),
   Sichtbarkeitsbereiche (`public|internal|mesh|isolated`) und Adresszonen
   (`wan|mesh`) sind im Katalogmodell vorgesehen und werden in der Oberfläche
   ausgewiesen.
8. **Hygiene.** `security.txt`, `robots.txt`, Skip-Link, `aria`-Attribute,
   `esc()` für Textinhalte, Favoriten/Zuletzt je Benutzer getrennt in
   `localStorage` (Schlüssel enthalten den Benutzernamen).

## 3. Wo es klemmt

### 3.1 Dokumentation und Übergabe
- **Keine `README.md`.** Weder Einstieg, Architektur, noch die Umgebungs-
  variablen (Kollektor-Adresse, Admin-Gruppen) sind schriftlich.
  *Wirkung:* Jede Änderung beginnt mit Rekonstruktion aus dem Code.
- **Kein Ort für Entscheidungen.** Warum `output: static`, warum Hash-Router,
  warum `localStorage` — nirgends festgehalten. *Abhilfe:* dieser Ordner.
- **Kein Verweis auf die Betriebsseite.** Ingress, Outpost-Routen und
  Kollektor-Konfiguration liegen in `nixfiles`; hier fehlt der Zeiger darauf.

### 3.2 Inhalt und Nutzen
- **Es gibt keine Wissensbasis.** Für nicht-technische Nutzer endet das Portal
  nach der Anmeldung: es gibt nichts zu lesen, nur etwas zu bedienen.
- **Es gibt kein Integrationssystem.** Dienste werden angezeigt, aber nicht
  angesprochen: kein Direktaufruf, keine Kurzaktion, kein Live-Zustand aus dem
  Dienst selbst — nur Prometheus-Serien.
- **Kein Ankündigungskanal.** Wartungsfenster, Ausfälle und Neuigkeiten haben
  keinen Ort. `#toast-region` meldet nur Aktionen der Sitzung.

### 3.3 Betrieb und Sicherheit
- **Keine Sicherheits-Header im Repository sichtbar.** CSP, `X-Content-Type-Options`,
  `Referrer-Policy`, `Permissions-Policy` und HSTS gehören in den Ingress — dort
  nachweisbar machen und im Portal-Dokument dokumentieren.
- **Kein Health-Endpunkt des Portals selbst.** `/api/status` misst die Flotte,
  nicht das Portal.
- **Polling statt Bedarf.** Ein `setInterval` von 20 s läuft immer, auch wenn
  der Tab im Hintergrund ist oder niemand hinsieht.
- **Kein Timeout, kein Abbruch.** `fetch` in `api.ts` hat weder `AbortController`
  noch Zeitlimit; ein hängender Kollektor bleibt ein hängender Skeleton.
- **Kein `favicon`, kein `manifest`, kein Vorschaubild.** `public/` enthält nur
  `.well-known/security.txt` und `robots.txt`; Lesezeichen und Teilen sehen
  dadurch beliebig aus.

### 3.4 Zugänglichkeit und Randfälle der Darstellung
- **Der Browser baut die Ansicht des Lesers.** Die Datei trägt, was allen gehört
  (Katalog, Knoten); was dem Leser gehört — Favoriten, seine Dienste, der lebende
  Zustand — rendert der Browser nach der Anmeldung und ersetzt dabei die Ansicht.
  Ohne Skripte bleiben Konto und Verwaltung bei einem erklärenden Satz; die
  übrigen Ansichten zeigen Inhalt. Nicht-technische Nutzer auf fremden Geräten
  mit Blockern verlieren also nichts mehr, außer den zwei Ansichten über sie
  selbst.
- **Nur ein Theme.** `themes: dark --default`; kein heller Modus, keine
  Nutzerpräferenz, kein `prefers-color-scheme` (im Client nicht verwendet).
- **Statuswechsel sind nicht hörbar.** Änderungen an Zustands-Punkten werden
  nicht über `aria-live` gemeldet; für Screenreader passiert nichts.
- **Doppelte Bedienwege, aber keine Tastenkürzel-Anzeige.** Es gibt eine
  Befehlspalette; `Cmd/Ctrl+K` und die weiteren Tasten stehen nirgends, ebenso
  fehlen Fokusfalle und Rückgabe des Fokus beim Schließen.

### 3.5 Qualitätssicherung
- **Keine Formatierung, kein Prüflauf im Änderungsvorschlag.** Seit H1 gibt es
  einen Läufer (`test/`, E-0010) und `npm run check` fährt Typen und Prüfungen;
  es fehlen weiterhin Linter, Formatregeln und ein Lauf je Änderungsvorschlag
  (H3).
- **Parität der Übersetzungen ist geprüft** (H1): die Mengen beider Tabellen
  müssen gleich sein, sonst bricht der Bau.
- **Die Datenverträge stehen geschrieben** (`src/lib/contract.ts`): Katalogform,
  Identität und Statusform sind Typen, nicht nur Kommentare. Die
  Prometheus-Ausdrücke leben weiterhin in den Routen.

## 4. Reifegrad

| Bereich | Stand | Anmerkung |
|---|---|---|
| Struktur und Lesbarkeit | stark | kleine Dateien, klare Schichten, Kommentare mit Begründung |
| Internationalisierung | stark | volle Parität, saubere Umschaltung |
| Authentifizierung | stark | Token bleibt aus dem Browser |
| Beobachtbarkeit | mittel | nur Prometheus-Serien, kein Portal-Health, kein Verlauf |
| Zugänglichkeit | mittel | Skip-Link und `aria` vorhanden, Fokusführung und `aria-live` fehlen |
| Randfall ohne JavaScript | schwach | Ansichten sind ausschließlich client-gerendert |
| Inhalt | schwach | keine Wissensbasis, kein Ankündigungsweg |
| Qualitätssicherung | schwach | eine Prüfung und `npm run check` (H1, E-0010); kein Lauf je Änderungsvorschlag, keine Formatregeln |
| Dokumentation | schwach | dieser Ordner ist der Anfang |
