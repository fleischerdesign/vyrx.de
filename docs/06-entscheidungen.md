# 06 — Entscheidungen und offene Fragen

Format je Eintrag: Kontext — Entscheidung — Begründung — Alternativen —
Konsequenzen. Kurz halten, aber vollständig; spätere Einträge dürfen frühere
ablösen, der alte Eintrag bleibt mit Verweis stehen.

## Entschieden

### E-0001 — Diese Dokumentation liegt im Portal-Repository
*Kontext:* Analyse, Ideen und Konventionen brauchten einen Ort.
*Entscheidung:* `docs/` in `fleischerdesign/vyrx.de`, nicht in `nixfiles`.
*Begründung:* Die Dokumentation beschreibt die Anwendung; der Betrieb
(Ingress, Outpost, Kollektor) wird aus `nixfiles` heraus verlinkt, nicht
dupliziert.
*Alternativen:* ein eigenes Dokumentations-Repository (zu viel Zeremonie für
diese Größe); Wiki nur als Anwendung (zu spät verfügbar, siehe A1).
*Konsequenzen:* `nixfiles` braucht einen kurzen Zeiger hierher und umgekehrt.

### E-0002 — Dokumentation auf Deutsch, Code auf Englisch
*Kontext:* Das Repository kommentiert englisch, der Betreiber arbeitet deutsch.
*Entscheidung:* Prosa-Dokumentation deutsch, Code, Kommentare und Bezeichner
englisch.
*Begründung:* Wer den Code liest, liest englische Kommentare; wer die Absicht
sucht, liest Deutsch. Vermischung innerhalb einer Datei wäre der Fehler, nicht
die Zweisprachigkeit.
*Alternativen:* alles englisch (verliert die Zielgruppe der Wissensbasis),
alles deutsch (bricht mit dem Bestand).
*Konsequenzen:* Fachbegriffe bleiben englisch (`visibility`, `scope`), auch in
deutschen Sätzen.

### E-0003 — Dienste-agnostische Oberfläche bleibt Bedingung
*Kontext:* Der Wunsch nach Integrationen (Jellyfin, Seerr, SABnzbd, …) verleitet
dazu, Namen in Bedingungen zu schreiben.
*Entscheidung:* Namen dürfen nur in Daten und Übersetzungen vorkommen; die
Oberfläche liest ausschließlich Deskriptor-Felder.
*Begründung:* Ein Dienst kommt und geht; die Oberfläche soll das nicht merken.
*Alternativen:* Sonderfall je Dienst (schneller heute, unbezahlbar über Zeit).
*Konsequenzen:* Ein neuer Dienst braucht einen Deskriptor, nicht einen
Pull-Request an `views.js`.

### E-0004 — Geheimnisse bleiben serverseitig
*Kontext:* Adapter müssen sich bei Diensten ausweisen.
*Entscheidung:* Zugangsschlüssel kommen aus der Bereitstellungsumgebung; weder
Katalog-Export noch Browser sehen sie. Zusätzlich gilt weiter, dass Prometheus-
Ausdrücke serverseitig festgelegt sind.
*Begründung:* Der Browser ist die angreifbarste Stelle; er darf nichts wissen,
was ein Angreifer gebrauchen könnte.
*Alternativen:* Schlüssel in den Deskriptoren (widerrufen, nicht diskutierbar).
*Konsequenzen:* Neue Dienste erfordern einen Eintrag in der Bereitstellung,
nicht nur im Katalog. Das ist Absicht.

### E-0005 — Hash-Router bleibt, wird aber eingebettet *(abgelöst durch E-0006 und E-0007)*
*Kontext:* Die Ansichten laufen über `#/…`; ein Wechsel auf echte Pfade wäre
ein Umbau von Router, Auslieferung und Ingress.
*Entscheidung:* Vorerst bleiben Hash-Pfade. Erst wenn Ansichten serverseitig
ausgeliefert werden (G3), wird die Adresse Teil der Auslieferung.
*Begründung:* Die Reihenfolge vermeidet einen doppelten Umbau.
*Alternativen:* sofort echte Pfade (bricht die statische Auslieferung).
*Konsequenzen:* Geteilte Links bleiben funktionsfähig, solange JavaScript
an ist — ein weiterer Grund für G3.

*Abgelöst:* E-0006 und E-0007 entscheiden englische Pfade und echte Adressen;
dieser Eintrag bleibt als Begründung der Reihenfolge stehen.

### E-0006 — Pfade sind englische Bezeichner
*Kontext:* Ansichten liegen hinter einer Raute und tragen deutsche Namen
(`#/dienste`, `#/konto`).
*Entscheidung:* Alle Adressen sind englische Bezeichner (`/services`,
`/knowledge`, `/status`, `/account`, `/admin`); Deutsch präfixlos, Englisch
unter `/en/`.
*Begründung:* Ein Pfad ist ein Bezeichner, kein Text — dieselbe Trennung, die
`practices.md` als *agnostisch* führt.
*Alternativen:* deutsche Pfade (brechen mit den Bezeichnern im Code);
sprachabhängige Pfade (doppelte Verweise, doppelte Prüfliste).
*Konsequenzen:* Verweise in dieser Doku und im Code werden mitgezogen; die
Raute entfällt (E-0007).

### E-0007 — Echte Pfade statt Raute, Hülle als Layout
*Kontext:* Die Raute war die Folge der statischen Auslieferung — der Server sah
die Route nie, also brauchte es keine Umschreibungsregeln und kein 404 je
Ansicht. Der Preis: nicht teilbare Adressen, keine Metadaten je Ansicht, keine
Ansicht ohne JavaScript.
*Entscheidung:* Ansichten werden Seiten unter `src/pages/` mit echten Pfaden;
die Hülle (Zeichnung, Hafen, Palette, Sprachumschalter) wird ein Layout; die
Navigation im Browser wird zur Verbesserung, nicht zum einzigen Renderer.
*Begründung:* Astro bringt Datei-Routing, i18n-Routing und die Mischform
„vorgerendert plus serverseitige Routen“ mit — letztere nutzt `/api` bereits.
*Alternativen:* Raute behalten (billiger, aber die drei Nachteile bleiben und
G3 wird unerreichbar).
*Konsequenzen:* Umbau von Router, Hülle und Auslieferung; Voraussetzung für
Block A und für G3. Siehe Block S in `02-feature-backlog.md`.

### E-0008 — Navigation bleibt Nutzersicht, Verwaltung als Abschnitte
*Kontext:* Mit allen neuen Vorhaben (Netzblick, Vorgänge, Contracts, Zugänge)
droht die Seitenleiste zu einer Funktionsliste zu werden.
*Entscheidung:* Die Seitenleiste trägt sechs Einträge, davon einen neuen
(`/knowledge`); alles Verwaltende wohnt unter `/admin/<bereich>`, alles
Persönliche unter `/account/<bereich>`. Das untere Hafen trägt höchstens fünf.
*Begründung:* Ein Eintrag je Verwaltungsbereich ist für alle anderen
Haushaltsmitglieder Rauschen; die Leiste ist die teuerste Fläche im Entwurf.
*Alternativen:* ein Eintrag je Vorhaben (die Leiste wird zur Liste);
Verwaltung ausblenden (dann findet sie der Betreiber nicht).
*Konsequenzen:* Adressen bekommen eine zweite Ebene, und der Aktiv-Zustand des
Elternteils muss berechnet werden. Siehe `03-ui-ux.md` §6.

### E-0009 — Ein eigener Speicher: SQLite, und nur für vier Dinge
*Kontext:* Das Portal liest heute alles (Contracts, Prometheus, Verzeichnis,
Kopfzeilen) und besitzt keine Daten. Mit Favoriten (D3), Vorgängen (N1),
Protokoll (O3) und Benachrichtigungen (E2) entsteht erstmals Zustand, den
niemand sonst führt.
*Entscheidung:* Es gibt genau **einen** portal-eigenen Speicher: eine
SQLite-Datei mit vier Tabellen (`favorite`, `case`, `audit`, `subscription`) und
einer Schemaversion. Alles andere bleibt gelesen.
*Begründung:* Das Portal ist ein Prozess (Adapter standalone), damit entfällt
der einzige echte Nachteil von SQLite — es skaliert nicht über Prozesse. Eine
Datei braucht keinen Dienst, keine Netzabhängigkeit und keine eigene Anmeldung;
die Sicherung ist eine Dateikopie und lässt sich über die bestehenden Verträge
(`storage`, `backup`) deklarieren. `node:sqlite` ist in Node 24 eingebaut (auf
dem Host geprüft, v24.20.0) — also keine neue Abhängigkeit.
*Alternativen:* PostgreSQL (im Haus vorhanden, aber Netzabhängigkeit,
Migrationen und ein zweiter Betrieb für vier kleine Tabellen); JSON-Dateien
(billig, aber ohne Transaktionen und Abfragen); Zustand im Browser (geräteweise
und damit im Widerspruch zur Entscheidung über Favoriten).
*Konsequenzen:* Der Speicherort kommt aus der Umgebung wie die
Kollektor-Adresse; nur der Portalprozess öffnet die Datei, der Browser nie;
Migrationen laufen beim Start über die Schemaversion. **Grenze, ausdrücklich:**
Bekommen Vorgänge Kommentare, Zuständige und Fälligkeiten, entsteht ein zweites
Aufgabensystem — dann ist der Entwurf falsch, nicht die Tabelle.

### E-0010 — Geprüft wird mit `node --test`, ohne neues Paket
*Kontext:* H1 verlangt eine Prüfung der Übersetzungsparität. Das Repository hatte
keinen Testläufer, keine Testdatei und keinen Lauf, der eine Prüfung anstößt; die
Parität hielt, weil jemand nachgesehen hatte (84 Schlüssel je Sprache, gemessen
am 2026-09-24).
*Entscheidung:* `node --test` — der Läufer, der in Node 24 enthalten ist — ist
der Läufer. `npm run test` läuft allein, `npm run check` ist `astro check` plus
Tests, und `npm run build` beginnt mit `check`. Eine fehlende Übersetzung bricht
damit den Bau, wie H1 es verlangt.
*Begründung:* Dieselbe Abwägung wie bei E-0009: was die Laufzeit mitbringt,
braucht kein Paket. Die Prüfungen liegen als TypeScript in `test/` und werden von
Node direkt gelesen (Typen werden entfernt, nicht übersetzt) — keine zweite
Konfiguration, kein Übersetzungsschritt vor dem Prüfen, keine zusätzliche
Abhängigkeit in einem Baum, der bewusst schlank ist.
*Alternativen:* Vitest (kann mehr — Browserumgebung, Schnappschüsse, Abdeckung —
kostet aber ein Paket, eine eigene Konfiguration und eine zweite Meinung dazu,
was ein Test ist); kein Läufer (dann bleibt eine Prüfung eine Behauptung, und H2
und H3 stehen ohne Grundlage); ein Skript im `build` ohne Rahmen (billiger, aber
ohne Einzelergebnis und ohne Namen für den Fehler).
*Konsequenzen:* `test/` ist der Ort für Prüfungen, H2 und H3 setzen darauf auf.
Ein späterer Wechsel des Läufers kostet die Testdateien, nicht die Absicht. Und:
eine Prüfung, die niemand anstößt, ist keine Prüfung — im Repository stößt sie
`npm run check` an, im Änderungsvorschlag noch niemand (H3).

### E-0011 — Adressen statt Router
*Kontext:* Die Ansichten lagen hinter einer Raute (`#/dienste`), und ein eigener
Router im Browser entschied, was zu sehen ist. Die Adresse war damit für niemand
sonst lesbar: nicht für den Server, nicht für einen Verweis, nicht für ein
Lesezeichen ohne Skripte. Vier Dateien nannten dieselbe Adresse — `nav.ts`,
`app.ts`, `views.ts` und die Hülle.
*Entscheidung:* Jede Ansicht ist eine Seite mit einer Adresse aus
`src/lib/routes.ts`, und Navigation ist Navigation: ein Verweis, ein
Seitenaufruf. Der Router im Browser entfällt; die Seite erklärt dem Startskript,
welche Ansicht sie ist, und das Skript liest Sprache und Auswahl aus derselben
Tabelle.
*Begründung:* Ein Pfad ist ein Bezeichner (E-0006). Wer ihn in zwei Sprachen und
mehreren Werkzeugen selbst zusammensetzt, pflegt eine Tatsache mehrfach — und
eine Ansicht, die nur nach dem Skript existiert, ist der Zustand, den S3 und G3
beenden sollen.
*Alternativen:* Router behalten (billiger heute, aber G3 und A1 bleiben
unerreichbar); die Raute durch Pfade ersetzen und weiter im Browser routen (dann
sähe der Server die Seiten nie — genau der Zustand, den S1 beendet).
*Konsequenzen:* Ein Seitenwechsel lädt die Seite neu. `aria-current`, Titel,
Beschreibung, `canonical` und `hreflang` entstehen serverseitig aus der Tabelle.
Der Sprachumschalter führt auf dieselbe Ansicht statt auf die Startseite. Der
Bau erzeugt Verzeichnisadressen, deshalb schreiben die Adressen den
abschließenden Schrägstrich mit.

### E-0012 — Die Auswahl eines Dienstes bleibt eine Abfrage, bis S5 die Datei baut
*Kontext:* `03-ui-ux.md` §6.3 nennt `/services/<id>` als Adresse je Dienst. Eine
dynamische Route erzeugt in Astro Dateien zur Bauzeit, und dafür braucht der Bau
den Katalog — der entsteht heute außerhalb dieses Repositories. Die Alternative
wäre, die Detailseite serverseitig zu rendern; damit hinge eine Ansicht am
laufenden Prozess und die Zusage aus `01-ist-analyse.md` §1 fiele („die Seiten
bleiben abrufbar, auch wenn der Node-Prozess steht“).
*Entscheidung:* Vorläufig hängt die Auswahl als Abfrage an der Katalogseite
(`/services/?service=<id>`) — eine echte, teilbare Adresse ohne Raute.
`canonical` bleibt die Katalogseite, damit 21 Dienste nicht 21 kanonische
Adressen werden. S5 löst sie durch die Datei `/services/<id>/` ab.
*Begründung:* Kein neuer Auslieferungsweg, kein Bau-Eingang, den es noch nicht
gibt — und die Ansicht, die die Kachel nicht zeigt (Zielgruppe, Sichtbarkeit),
bleibt erreichbar.
*Alternativen:* Die Detailansicht bis S5 entfernen (verliert einen Zustand, den
die Oberfläche schon hat); `/services/<id>` serverseitig rendern (ein zweiter
Auslieferungsweg für eine Seite, gegen die Zusage oben).
*Konsequenzen:* Die Abfrage kennt nur der Browser, die vorgerenderte Datei nicht —
deshalb trägt der Sprachumschalter sie clientseitig mit. Verweise auf die
Adresse gibt es nur in `routes.ts`, also ist der Wechsel mit S5 eine Zeile.

## Entscheidungen zu den offenen Fragen (2026-09-23)

Diese zehn Fragen waren als offen notiert und sind am 2026-09-23 entschieden.
Sie bleiben überprüfbar: Wer eine davon ablösen will, begründet es gegen den
Eintrag, und der alte Eintrag bleibt mit Verweis stehen.

1. **Umfang der Wissensbasis** — *Entschieden:* zehn Alltagsrezepte zuerst, die
   Struktur folgt dem Inhalt. *Begründung:* eine Struktur vor dem Inhalt wäre
   Verhandlung über Kategorien statt über Nutzen.
2. **Wiki-Technik** — *Entschieden:* Inhaltssammlung im selben Bau, Inhalte im
   Pull-Request-Verfahren. *Begründung:* ein Bauvorgang, eine Prüfung, ein
   Freigabeweg; ein eigenes Redaktionssystem wäre eine zweite Anwendung mit
   eigener Anmeldung — und ohne Prüfung.
3. **Favoriten** — *Entschieden:* Favoriten serverseitig, Verlauf lokal.
   *Begründung:* Favoriten sind eine Erwartung an das Konto
   (geräteübergreifend), Verlauf eine an das Gerät; der Unterschied ist real
   und darf sichtbar sein.
4. **Ankündigungen** — *Entschieden:* zuerst eine Datei im Repository, später
   ersetzbar. *Begründung:* die kleinste Sache, die wirkt; ersetzt wird, wenn
   es weh tut, nicht vorher.
5. **Reichweite der Aktionen** — *Entschieden:* zuerst nur Administratoren, ein
   eigenes Recht später aus dem Verzeichnis. *Begründung:* ein Recht ohne
   Gruppe ist keine Berechtigung — erst die Gruppe, dann die Aktion.
6. **Versionierung der Endpunkte** — *Entschieden:* `/api/v1/…` jetzt
   einführen. *Begründung:* solange kein Automat angebunden ist, kostet es
   nichts; danach kostet es einen Bruch.
7. **Sprache der Oberfläche** — *Entschieden:* Englisch ist ein vollwertiger
   Zweig, erzwungen durch den Paritätstest (H1). *Begründung:* ein Zweig, den
   niemand prüft, ist eine Behauptung.
8. **Ort der Sprachprüfung** — *Entschieden:* die Prüfung zieht mit der Prosa in
   den Bau dieses Repositories (`04-integrationen.md` §11, I-2). *Begründung:*
   eine Textänderung darf kein Flotten-Rebuild sein; der Preis (Bruch beim
   Bauen statt vor dem Ausrollen) ist benannt.
9. **Öffentliche Wissensbasis** — *Entschieden:* Artikel mit Sichtbarkeit
   `public` sind ohne Anmeldung lesbar und werden aus dem Zustand
   `data-auth="out"` verlinkt; alles Interne bleibt hinter der Anmeldung.
   *Begründung:* die Wissensbasis ist der einzige Einstieg für nicht-technische
   Nutzer; hinter der Anmeldung wirkt sie auf genau diese Zielgruppe
   abschreckend.
10. **Satz Zweck je Dienst** — *Entschieden:* der eine Satz Zweck gehört in den
   Contract, die Anleitung ins Portal. *Begründung:* ein Satz ist eine Aussage
   über den Dienst und für mehrere Leser nützlich (Alarmierung, Statusseiten,
   Übersichten); eine Anleitung ist eine Aussage über den Menschen davor und
   gehört der Darstellung.
