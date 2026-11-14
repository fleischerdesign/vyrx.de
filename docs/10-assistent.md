# 10 — Assistent

Stand: 2026-11-14. Der erste Stand ist ausgeliefert: ein read-only Assistent im
Workspace mit Kontext aus sichtbaren Diensten, Status, Historie,
Ankündigungen, Wartungsfenstern und lesbaren Artikeln.

**Umgesetzt am 2026-11-14:** A, B und E in einer ersten Fassung. C (Tool
Calling) und D (AG-UI) sind die nächsten Pakete. Der Einstieg ist ein runder
Knopf unten rechts; die Kopfzeile trägt keinen Assistenten mehr.

## Zielbild

Der Assistent ist kein Chat-Fenster neben dem Portal, sondern ein Weg durch den
Workspace: Er erklärt, findet, führt und öffnet. Er kennt nur, was die
angemeldete Person sehen darf, antwortet in der Sprache der Seite und endet mit
einem Weg — einem Link, einer Karte oder dem nächsten Schritt.

## Grundsätze

- **Kein Kontext-Editor.** Keine Chips zum Hinzufügen oder Entfernen, keine
  Scope-Auswahl. Der Assistent nimmt den Kontext, den die Seite hergibt.
- **Kein Admin-Cockpit.** Der Assistent ist für Nutzer. Betriebsdaten bleiben
  in der Verwaltung.
- **Keine externen Dienst-Readouts.** Kein MCP-Server, keine Adapter-Ausweitung.
  Tool Calling liest ausschließlich interne Portal-Daten (Katalog, Status,
  Historie, Wissen, Wartung).
- **Jede Antwort endet mit einem Weg.** Ein Link, eine Dienst-Karte, ein
  nächster Schritt — nicht nur ein Absatz.
- **Ruhige Oberfläche.** Rich Blocks statt Sprechblasen; keine schwebende
  Chat-Blase. Der Assistent bleibt eine ruhige Schublade.
- **Ohne JavaScript bleibt der Einstieg aus.** Die Seiten funktionieren weiter;
  der Assistent ist eine Zugabe.

## A — Auffindbarkeit (P0)

Ziel: Wer den Assistenten sucht, findet ihn in höchstens zehn Sekunden. Wer
ihn nicht sucht, stolpert nicht darüber.

- [x] **A1 Runder FAB unten rechts.** Auf dem Desktop 56 px, mobil 52 px über
  dem Dock; öffnet das Panel, zeigt beim Hover „Fragen“ und hat ein
  `aria-label`. Ohne JavaScript bleibt er verborgen.
- [x] **A2 Mobiler Einstieg.** Derselbe FAB oberhalb des Docks, mit
  Safe-Area-Abstand; kein sechster Dock-Eintrag.
- [x] **A3 Übersicht: „Frag VYRX“.** Eine Karte unter der Begrüßung mit zwei
  Beispielen; ein Klick öffnet das Panel mit der Frage.
- [x] **A4 Befehlspalette.** „Assistent fragen: <Begriff>“ erscheint als
  erster Treffer; bei leerer Eingabe bleibt „Übersicht“ aktiv, bei einer
  Frage der Assistent. Enter öffnet das Panel.
- [x] **A5 Kontextuelle Einstiege.** Dienstseite: „Frag zu diesem Dienst“.
  Artikel: „Frag zu diesem Artikel“. Status: „Was ist gerade los?“.
- [x] **A6 Header-Button entfernt.** `⌘J` / `Ctrl+J` bleibt.
- [ ] **A7 Optional:** ein kleines „Neu“-Badge am FAB für die ersten Wochen;
  danach entfernen.

**Akzeptanz:** Der FAB ist auf 320, 390, 768, 1024 und 1440 px sichtbar und
innerhalb des Viewports; die Übersichtskarte und die kontextuellen Einstiege
sind auf 320 px ohne horizontalen Scroll bedienbar. Belegt am 2026-11-14 mit
headless Chromium.

## B — Kontext (P0/P1)

Ziel: Der Assistent beantwortet die Fragen, die im Alltag wirklich kommen.

- [x] **B1 Status-Historie.** `loadHistory` in den Kontext; Antworten auf
  „Was ist seit gestern passiert?“ und „Seit wann ist X down?“. Die Historie
  wird nur geladen, wenn die Seite oder die Frage sie braucht.
- [x] **B2 Freigaben erklären.** Die Gruppen der Person und die
  `accessGroups` der sichtbaren Dienste in den Kontext. „Warum sehe ich X
  nicht?“ erklärt die Regel, ohne versteckte Dienste zu nennen; Verweis auf
  `/account` und `zugriff-verstehen`.
- [x] **B3 Dienstabhängigkeiten.** `dependsOn` mit sichtbaren Referenzen;
  `dependsOnHidden` sagt, dass eine Abhängigkeit nicht freigegeben ist, ohne
  ihren Namen zu nennen.
- [x] **B4 Favoriten.** `favorite` je sichtbarem Dienst; „Was sind meine
  Favoriten?“.
- [ ] **B4b Zuletzt besuchte Seiten.** Leichtgewichtig, clientseitig; noch
  nicht gebaut.
- [x] **B5 Wartungsfenster und Ankündigungen** mit Datum in der Antwort.
- [x] **B6 Den Vorschlag „Wann war der letzte Zustandswechsel?“ erst nach B1
  ausliefern.** Die Historie ist jetzt im Kontext.

**Akzeptanz:** Die zwölf goldenen Fragen (unten) werden mit korrekten Quellen
beantwortet. Keine Antwort nennt einen Dienst, den die Person nicht sehen darf.
Jeder Zustand trägt seinen Messzeitpunkt.

## C — Funktionen (P1)

Ziel: Der Assistent findet und öffnet, statt nur zu beschreiben.

- [ ] **C1 Interne Tools:** `search_knowledge`, `get_service`, `get_status`,
  `get_history`, `get_maintenance`, `open_page`.
- [ ] **C2 Navigation.** Eine Antwort kann eine `navigate`-Aktion zurückgeben;
  der Client öffnet die Seite.
- [ ] **C3 Mehrschritt.** Rückfragen und „und der andere?“ über den Verlauf.
- [ ] **C4 Grenze.** Keine externen Dienst-Readouts, kein MCP, keine
  Admin-Tools.

**Akzeptanz:** „Öffne Medienwünsche“ öffnet die Dienstseite. „Was ist seit
gestern passiert?“ nutzt die Historie. „Wo finde ich eine Anleitung?“ liefert
einen Link. Keine zusätzliche Netzwerkabhängigkeit außer dem Modell.

## D — Interaktive Antworten / AG-UI (P2)

Ziel: Antworten sehen aus wie das Portal, nicht wie ein Chat.

- [ ] **D1 Block-Schema:** `text`, `service`, `status`, `article`,
  `maintenance`, `suggestions`, `step`.
- [ ] **D2 Client rendert native Komponenten.** Der Server validiert IDs und
  Links; der Client rendert kein fremdes HTML.
- [ ] **D3 Geführte Problemlösung.** `step` mit Frage, Optionen
  (Ja/Nein/Weiter) und Fortschritt; nutzt die Abschnitte der Artikel.
- [ ] **D4 Follow-up-Chips:** „Warum?“, „Kürzer“, „Mehr Details“, „Anleitung“.
- [ ] **D5 Fallback:** reiner Text, wenn das Modell keine Blöcke liefert.

**Erster Schritt umgesetzt:** Die Statusleiste auf Dienstseiten ist bereits ein
nativer Block — sie liest `/api/status`, zeigt Zustand und Messzeitpunkt und
widerspricht dem Modell, wenn nötig. Das allgemeine Block-Schema bleibt offen.

**Akzeptanz:** Eine Statusantwort zeigt eine Status-Karte mit Messzeitpunkt.
Eine Dienstantwort zeigt eine Dienst-Karte mit Öffnen-Link. Der geführte
Drucker-Flow funktioniert auf 390 px. Ohne Blöcke bleibt die Antwort lesbar.

## E — Responsive und Feinschliff (fortlaufend)

- [x] **E1 Viewport-Matrix:** 320, 390, 768, 1024 und 1440 px geprüft;
  360/414/1280/1920 und Querformat stehen noch aus.
- [x] **E2 Touch-Ziele ≥ 44 px.** Textarea auf iOS 16 px; Safe-Area und
  `visualViewport` berücksichtigt; 320-px-Überlauf in den Dienstzeilen behoben.
- [x] **E3 Panel:** Vollbild unter 760 px, 432-px-Drawer ab 760 px; non-modal
  bleibt eine offene Entscheidung.
- [ ] **E4 Dark Mode, Kontrast, Fokus, Reduced Motion, Screenreader.**
- [ ] **E5 Erster Token unter 1,5 s; kein Layoutsprung; ruhiges Scrollen.**

**Akzeptanz:** Screenshots aller Größen; kein horizontaler Scroll; der
Composer bleibt mit offener Tastatur sichtbar; alle Bedienelemente sind per
Tastatur erreichbar.

## F — Später

- [ ] **F1 Gesprächsverlauf serverseitig** (Aufbewahrung entscheiden).
- [ ] **F2 Aktionen mit Bestätigung und Audit.**
- [ ] **F3 Vorlesen und Diktat.**
- [ ] **F4 Öffentliche Hilfe.**
- [ ] **F5 Vergleich von Diensten** (optional).

## Nicht Teil dieses Plans

- Kontext-Chips, Kontext entfernen/hinzufügen, Scope-Auswahl.
- Admin-Kontext und Admin-Copilot.
- Service-Detailreadouts und MCP-Server für Dienste.
- Allgemeiner Chat ohne Portalbezug.
- Zusammenfassen als eigenes Feature. Das können LLMs; es bleibt eine
  Fähigkeit, kein Produkt.

## Goldene Fragen

1. Welche App ist für Filme da und läuft sie gerade?
2. Was kann ich hier machen? (Dienstseite)
3. Warum sehe ich Medienwünsche nicht?
4. Was ist seit gestern passiert?
5. Seit wann ist Medienwünsche down?
6. Was bedeutet „Nur im Heimnetz“?
7. Wo finde ich die Anleitung für einen Filmwunsch?
8. Öffne den Status.
9. Fasse den Artikel zusammen.
10. Mein Drucker druckt nicht.
11. Was sind meine Favoriten?
12. Welche Dienste hängen voneinander ab?

## Reihenfolge

1. **A + E** — Auffindbarkeit und Responsive. Nutzer finden den Assistenten
   heute nicht; das ist der erste Hebel.
2. **B** — Historie, Freigaben, Abhängigkeiten. Das macht die Antworten
   tatsächlich nützlich.
3. **C** — Tool Calling und Navigation. Der Assistent führt, statt zu
   beschreiben.
4. **D** — AG-UI und geführte Flows. Das ist der qualitative Sprung.
5. **F** — später.

## Belege (2026-11-14)

- `npm run build`: `astro check`, Server-Build, alle Verify-Skripte und 43
  Tests grün.
- Headless Chromium: 320, 360, 390, 414, 768, 1024, 1280, 1440 und 1920 px
  ohne horizontalen Seiten-Überlauf; Panel 320–414 px vollflächig, ab 768 px
  432 px; Composer mit 16-px-Eingabe auf Touch; Schaltflächen 44 px.
- Ohne JavaScript: FAB, Übersichtskarte und kontextuelle Einstiege bleiben
  verborgen; die Seiten funktionieren unverändert.
- Echter Anbieter (Claude Haiku 5.5 über OpenRouter): Freigaben, Historie und
  sichtbare Abhängigkeiten geprüft; die Statusleiste auf Dienstseiten zeigt
  den gemessenen Zustand unabhängig vom Modelltext.

## Offene Entscheidungen

- **Mobiler Einstieg:** entschieden — der runde FAB über dem Dock. Ein
  „Neu“-Badge ist optional.
- **Panel:** modal oder non-modal ab 1440 px?
- **Gesprächsverlauf:** nur `sessionStorage` oder serverseitig mit
  Aufbewahrung?
- **AG-UI:** internes Block-Schema oder AG-UI-Protokoll? Erst intern, dann
  prüfen, ob das Protokoll einen Mehrwert bringt.
