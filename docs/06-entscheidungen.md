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
*Erweitert 2026-09-26:* um die Tabelle `maintenance` (C2, Wartungsfenster).
Sie ist Betriebswissen mit einer Zeit, kein Personendatum: alle lesen sie, nur
Berechtigte setzen sie, und sie läuft von selbst ab - gepflegt wird sie nicht.
Die Zahl der Tabellen wächst damit auf fünf; die Grenze oben gilt unverändert.

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
deshalb trug der Sprachumschalter sie clientseitig mit. Verweise auf die Adresse
gibt es nur in `routes.ts`, also war der Wechsel mit S5 eine Zeile.

*Abgelöst durch S5* (2026-09-24): Jeder Dienst hat jetzt eine eigene Seite
(`/services/<id>/`), erzeugt aus dem Katalog als Bau-Eingang (E-0013). Die
Zwischenlösung mit der Abfrage ist damit weg — und mit ihr das clientseitige
Nachreichen im Sprachumschalter.

### E-0013 — Der Katalog ist ein Bau-Eingang, und die Datei trägt, was allen gehört
*Kontext:* Jede Ansicht entstand im Browser, weil der Katalog nur dort gelesen
wurde (`/portal.json`). Ohne Skripte blieb deshalb eine leere Fläche (S3, G3).
Die naheliegende Alternative — jede Seite bei jeder Anfrage rendern — hieße, dass
die Seiten am laufenden Prozess hängen; die Zusage aus `01-ist-analyse.md` §1
fiele.
*Entscheidung:* Der Bau liest den Katalog **einmal** (`src/lib/catalogue.ts`, aus
`PORTAL_CATALOGUE` oder `./portal.json`) und rendert damit, was allen gehört: die
Dienste ohne Gruppenanforderung — `visibleServices(services, [])`, dieselbe
Funktion, die der Browser benutzt — und die Knoten. Was dem Leser gehört
(Favoriten, seine zusätzlichen Dienste, der lebende Zustand) bleibt beim Browser,
der die Datei nach der Anmeldung ersetzt. Fehlt der Katalog beim Bau, steht der
benannte Zustand („Kein Katalog im Bau“) statt einer leeren Fläche.
*Begründung:* Eine Datei kann nicht wissen, wer liest; sie kann wissen, was allen
gehört. Damit halten beide Zusagen gleichzeitig: die Seiten bleiben abrufbar,
wenn der Prozess steht, und sie zeigen Inhalt ohne Skripte.
*Alternativen:* serverseitig rendern, um die Identität zu kennen (ein zweiter
Auslieferungsweg, Seiten am Prozess); den Katalog in dieses Repository legen
(zwei Wahrheiten über die Flotte, ein zweiter Pflegeort); nur die Hülle
vorgerendern und den Inhalt leer lassen (genau der Zustand, den S3 beendet).
*Konsequenzen:* Der Bau braucht den Katalog als Eingang — die Bereitstellung muss
die Datei dort ablegen, wo `readCatalogue()` sie liest, sonst erscheint der
benannte Zustand statt Inhalt. **S5 baut darauf auf** (eine Seite je Dienst).
Konto und Verwaltung bleiben Browser-Ansichten mit erklärendem Satz: für sie gilt
„ohne Skripte sichtbar“ nicht, und das steht dort auch so.

### E-0014 — Die Darstellungswahl gehört dem Gerät, und sie steht vor dem ersten Bild
*Kontext:* G2 verlangt Systemvorgabe plus Wahl; `03-ui-ux.md` §2 nannte sie „je
Benutzer“. Das Portal hat keinen eigenen Speicher (E-0009 wird erst mit D3 und N
gebraucht), und die Wahl wird *vor* dem ersten Bild gebraucht — der Aufbau wartet
nicht auf `/api/me`, und ein Theme, das danach kommt, ist ein Flackern bei jedem
Aufruf.
*Entscheidung:* Die Wahl liegt im Gerätespeicher (`vyrx.portal.theme`). Ohne Wahl
entscheidet `prefers-color-scheme`. Gesetzt wird sie von einem Inline-Skript im
Kopf, vor dem Stylesheet und damit vor dem ersten Bild. Der Umschalter existiert
nur, wo ein Skript läuft (`html.js` in `daisy.css`).
*Begründung:* Eine Wahl, die nach dem ersten Bild kommt, ist ein Flackern; ein
Knopf, der nichts tut, ist schlimmer als kein Knopf. „Je Benutzer“ ist heute nur
um den Preis eines Flackerns (auf die Identität warten) oder einer erfundenen
Zugehörigkeit (Schlüssel mit Benutzernamen, den man noch nicht kennt) zu haben.
*Alternativen:* benutzerweise im Gerätespeicher (der Name kommt zu spät);
daisyUIs `theme-controller` ohne Speicherung (schön, aber die Wahl ist beim
nächsten Aufruf weg); serverseitig (das Portal hat keinen Zustand — E-0009).
*Konsequenzen:* Die Wahl gilt je Gerät; mit dem eigenen Speicher (D4) darf der
Schlüssel den Benutzernamen tragen und die Wahl wandert auf das Konto. Und:
`light` ist jetzt die Vorgabe für ein System ohne Vorliebe — das Portal war
vorher fest dunkel. Wer es umgekehrt will, dreht in `daisy.css` zwei Wörter um
(`dark --default, light --prefersdark`) und nichts sonst.

### E-0015 — Der öffentliche Einstieg dient zuerst den Nutzern
*Kontext:* VYRX soll zugleich Zugang für Familie/Freunde und vorzeigbares
Infrastrukturprojekt sein. Die jetzige Landing stellt Hosts und Mesh in den
Vordergrund. Der öffentlich abrufbare Katalog (geprüft am 2026-09-26) bestätigt
u. a. Hausautomation, Medienwünsche und Rezeptplanung als Angebote; das
„Dateien“-Beispiel der ersten Designstudie ist kein belegtes allgemeines Angebot.
*Entscheidung:* `/` erklärt den Zugang und drei reale Alltagsfälle in Klartext;
der Workspace ist die primäre Handlung. Beispiele sind keine Zugangsversprechen:
Rezeptplanung erfordert eine passende Freigabe. Die Projekt-Fallstudie steht
unter `/project/` als zweite, klar erkennbare Ebene, nicht als zweiter Hero.
Die bereits bestehende separate Portfolio-Website bleibt ein anderer Ort;
`/project/` beschreibt VYRX und nicht Philipps vollständiges Portfolio.
*Begründung:* Wer etwas benutzen will, soll sich nicht zuerst durch eine
Architekturführung lesen. Wer die Architektur sehen will, bekommt eine richtige
Fallstudie statt technisch klingender Werbesätze.
*Alternativen:* alles auf `/` (beide Zielgruppen verlieren ihren Einstieg);
Portfolio auslagern (VYRX erklärt sich am eigenen Ort nicht); Live-Dashboard
öffentlich lassen (zu viele Details ohne Bezug zu einer Nutzerhandlung).
*Konsequenzen:* Redaktionelle Texte DE/EN, eigene Metadaten für `/project/` und
ein Weiterweg von beiden Seiten zum Workspace. Die öffentliche Navigation
bleibt klein. Das ist eine Produktentscheidung, noch keine Implementierung.

### E-0016 — Veröffentlichung ist eine explizite, getrennte Projektion
*Kontext:* Die öffentliche Landing zeigt heute Hosts mit Namen, Adressen,
Zonen, laufenden Diensten und Zustand. Zusätzlich ist `/portal.json` öffentlich
abrufbar und enthält mehr als nur das, was die Landing zeigt: auch interne
Dienstadressen und Gruppenzuordnungen. Eine optische Bereinigung der Landing
würde die Datenquelle allein nicht verändern.
*Entscheidung:* Die öffentliche Erzählung über die Architektur ist redaktionell
und abstrahiert. Der produktive Katalog für angemeldete Ansichten und eine
eventuelle öffentliche Projektion sind **getrennte Veröffentlichungsflächen**;
ein `scope: public` bedeutet nicht automatisch „alle Metadaten öffentlich“.
Vor dem Relaunch werden Datei, vorgerenderte Dienstseiten und Endpunkte auf
freigegebene Felder und Zugriffe geprüft. Das bisherige Verhalten wird hier
nicht stillschweigend als sicher oder unsicher bewertet – die Veröffentlichung
ist eine eigene bewusste Entscheidung.
*Begründung:* Verstecken im UI ist kein Zugriffsschutz; ein Portfolio braucht
keine Live-Inventardaten, um technisch glaubwürdig zu sein.
*Alternativen:* Host-Raster nur ausblenden (Quelle bleibt abrufbar); kompletten
Katalog unverändert als Projektinhalt zeigen (vermischt Nutzerdaten mit
Betriebsfakten); alle technischen Informationen entfernen (verhindert eine
ehrliche Fallstudie).
*Konsequenzen:* Freigabeliste für öffentliche Inhalte und gesonderter Test der
Auslieferung, nicht nur der Browseransicht. E-0013 bleibt für das Prinzip
„vorgerenderte Seiten sind ohne Skripte lesbar“ bestehen, aber die dortige
öffentliche Ausgabe aller Knoten und die uneingeschränkte Katalog-Datei werden
bei Umsetzung neu abgegrenzt. Angemeldete Daten brauchen eine eigene
autorisierte Quelle; eine statische Datei kennt keine Identität. Verträge
bleiben einzige Quelle für Fakten; die Projektion filtert sie, statt sie in
Prosa zu duplizieren.

### E-0017 — Öffentliche Hilfe ja, öffentliche Betriebsstatusseite vorerst nein
*Kontext:* Personen ohne Anmeldung brauchen Hilfe beim ersten Zugang. Ein
öffentlicher Status wäre nur dann hilfreich, wenn er unabhängig von der
betroffenen Infrastruktur erreichbar bleibt, verlässlich aktualisiert wird und
keine privaten Betriebsdetails veröffentlicht. Das ist nicht belegt.
*Entscheidung:* `/help/` erklärt Zugang und erste Schritte ohne technische
Interna. Zugang entsteht durch eine Einladung beziehungsweise Freigabe durch
Philipp, nicht durch öffentliche Selbstregistrierung; ein befristeter Gastmodus
braucht vor seiner Bewerbung die in F3/Q1 vorgesehenen erzwungenen Abläufe.
`/status/` bleibt angemeldet; `/availability/` wird **nicht** mit dem
Redesign eingeführt. Bestehende öffentliche Artikel der Wissensbasis bleiben
gemäß Entscheidung 9 unten möglich, müssen aber redaktionell explizit für
Öffentlichkeit freigegeben werden. Öffentliche Hilfe und internes Wissen sind
zwei Zielgruppen, nicht zwei Wahrheiten über einen Dienst.
*Begründung:* Hilfe vor der Anmeldung löst ein belegtes Problem; eine
halbverlässliche Statusampel würde Vertrauen eher schädigen.
*Alternativen:* alle Hilfe hinter Anmeldung (hilft beim Anmeldeproblem nicht);
Host-Status öffentlich wiederverwenden (zu detailliert); sofort eine zweite
Statusplattform bauen (unverhältnismäßig für den Gestaltungsumbau).
*Konsequenzen:* Login- und Problemwege werden als Text verifiziert. Eine
öffentliche Kurzstatusseite braucht später einen eigenen Beschluss über Quelle,
Auslieferung, Aussage und Sichtbarkeit.

### E-0018 — Erste Workspace-Aufgaben vor dem Funktionskatalog
*Kontext:* Das Backlog enthält viele sinnvolle Vorhaben, aber Navigation und
Mockups können nicht jede Idee als schon vorhanden darstellen. Der Katalog
enthält reale Alltagsangebote mit unterschiedlichen Gruppen und Scopes.
*Entscheidung:* Der erste neue Workspace optimiert zwei Aufgaben:
**(1) eine passende, freigegebene Anwendung finden und öffnen** und
**(2) bei einem Problem verstehen, ob es bekannt ist, wie alt die Aussage ist
und was als Nächstes zu tun ist**. Start, Anwendungen und Status bedienen
diese Wege; Wissen bekommt erst mit geprüften Artikeln einen Haupteintrag.
Anliegen bleiben ein kontextueller Weg, bis es einen betreuten Ablauf gibt.
Admin zeigt Abweichungen und leitet zu den zuständigen Arbeitsorten, statt
Nix-Dauerzustand im Portal zu ändern.
*Begründung:* Ein kleiner, durchgängiger Weg ist für Nutzer wertvoller als ein
vollständiges Menü mit halben Funktionen. Die Entscheidungen zur Wissensbasis
(zehn Rezepte zuerst) und zum gemeinsamen Katalog bleiben bestehen.
*Alternativen:* alle Backlog-Bereiche sofort in die Navigation (leere Routen);
nur Optik ändern (Nutzerwege bleiben falsch); ein zweiter Aufgaben-Einstieg
(verworfen als V1 im Backlog).
*Konsequenzen:* Designs und Tests starten bei realen End-to-End-Szenarien und
prüfen Rechte, Lade-, Leer-, Fehler- und Alterungszustände. Demo-Werte bleiben
auf die Studie beschränkt.

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

## Neubau der Anwendung (2026-09-26)

### E-0019 — Die Anwendung wird neu geschrieben, nicht umgebaut

*Kontext:* Die bestehende App war gewachsen: eine Hülle, die im Browser
zwischen Besucher und Angemeldetem umschaltete, Ansichten als Zeichenketten,
ein Hash-Router, der zu echten Pfaden umgebaut wurde, und eine Gestaltung, die
aus daisyUI-Klassen bestand. Jede Ansicht kannte die Flotte, und die Tabelle
kannte das Portal.
*Entscheidung:* `src/` wird vollständig neu geschrieben. Astro mit
Datei-Routing, serverseitigem Rendern als Vorgabe, einem Token-System, einem
Satz wiederverwendbarer Bauteile und Content Collections für redaktionelle
Inhalte. Die alte App wird gelöscht, nicht daneben weiterbetrieben.
*Begründung:* Was die Struktur selbst ist, darf nicht die Struktur des Neubaus
vorgeben. Ein Umbau hätte die vier Ursachen mitgenommen (Hülle, Zeichenketten,
zweite Datenwege, Klassen-Gestaltung).
*Alternativen:* schrittweise migrieren (billiger heute, trägt die Ursachen
weiter); nur die Gestaltung tauschen (die Datenwege blieben falsch).
*Konsequenzen:* `astro check` prüft die Typen, `design-concept.html` bleibt
Referenz und wird **nicht** kopiert. Der Backlog wird nicht neu geschrieben,
sondern je Eintrag nachgezogen.

### E-0020 — Die Infrastruktur kommt als Projektion zur Laufzeit

*Kontext:* Das Portal las einen Katalog, den `nixfiles` aus den Contracts
ableitete, als **Bau-Eingang** und lieferte dieselbe Datei öffentlich unter
`/portal.json` aus - samt Hostnamen, Adressen und Gruppenzuordnungen. Der Bau
war damit an einen Flottenvorgang gekettet, und „gebaut" las sich wie
„ausgerollt".
*Entscheidung:* `nixfiles` erzeugt weiterhin eine Ableitung (Schema 1, siehe
`08-ziel-rewrite.md` §6), aber die App liest sie **zur Laufzeit**
(`PORTAL_FLEET`), gibt sie **nie** an den Browser und filtert pro Anfrage nach
Identität und Gruppen. Öffentliche Seiten sind rein redaktionell und brauchen
den Katalog nicht.
*Begründung:* Eine Datei kennt keinen Leser; eine Berechtigung, die nur in der
Ansicht geprüft wird, ist keine. Und eine Projektion im Artefakt kann einer
anderen Revision angehören als der laufende Dienst.
*Alternativen:* `/portal.json` öffentlich lassen und nur die Ansicht filtern
(war der Zustand); serverseitig rendern und den Katalog bei jeder Anfrage aus
`nixfiles` holen (neue Netzabhängigkeit im Hot Path).
*Konsequenzen:* Die Auslieferung muss `/portal.json` und das pauschale `/en/*`
aus den ausgenommenen Pfaden entfernen; der Prüflauf in `nixfiles`
(`lib/checks/vyrx-portal.nix`), der genau dieses öffentliche Artefakt belegt,
wird ersetzt. Der Betrieb braucht zwei Umgebungsvariablen: `PORTAL_FLEET` und
`PORTAL_PROMETHEUS_URL`.

### E-0021 — Node 24, und der eine Speicher aus E-0009

*Kontext:* E-0009 nennt SQLite über `node:sqlite`, setzt aber Node 24 voraus,
während die Flotte mit `nodejs_22` baute und der Startbefehl des Dienstes
ebenso.
*Entscheidung:* Dieses Repository baut und startet mit **Node 24**
(`flake.nix`). Der Speicher ist eine SQLite-Datei; der Zugriff liegt in
`src/lib/store.ts` und bindet **jede** Abfrage an den Eigentümer.
*Begründung:* Node 24 trägt `node:sqlite` ohne Versuchsflagge; auf Node 22 wäre
es eine Versuchsfunktion mit Warnung. Und eine Datenbank nur für Favoriten
wäre unverhältnismäßig, solange der Prozess einer ist und die Datei eine Kopie
als Sicherung erlaubt.
*Alternativen:* Node 22 behalten und `node:sqlite` mit Flagge benutzen (eine
Warnung im Betrieb, eine Ausnahme im Bau); PostgreSQL (Netzabhängigkeit für
vier kleine Tabellen).
*Konsequenzen:* `nixfiles` muss im Startbefehl des Dienstes auf Node 24 gehen
(eigener Schritt). Die Datei liegt unter `PORTAL_STORE`; ohne Angabe in der
Entwicklung unter `.data/portal.sqlite`. **Grenze, wie in E-0009:** bekommen
Vorgänge Kommentare, Zuständige und Fälligkeiten, ist der Entwurf falsch, nicht
die Tabelle.

### E-0022 — Sichtbarkeit ist eine Regel, kein Verstecken

*Kontext:* Ein Artikel der Wissensbasis kann öffentlich oder intern sein; ein
Dienst kann für alle oder für Gruppen freigegeben sein. Vorher entschied die
Ansicht darüber.
*Entscheidung:* `visibility` (Artikel) und `accessGroups` (Dienste) sind
Eigenschaften der Daten. Dieselbe Regel entscheidet über Liste, Direktadresse,
Suche, Statusabfrage und Sprachvariante; sie steht in `src/lib/visibility.ts`
und `src/lib/authz.ts`. Wer nicht darf, bekommt „gibt es nicht".
*Begründung:* Ein Menüversteck ist kein Zugriffsschutz, und zwei Wege mit zwei
Antworten sind zwei Wahrheiten.
*Alternativen:* im Browser filtern (heute der Zustand, und der Katalog lag
offen); jede Ansicht selbst entscheiden lassen (vier Gelegenheiten, es falsch
zu machen).
*Konsequenzen:* **Offen und nicht in diesem Schritt entschieden:** ob
öffentliche Artikel unter `/knowledge/` erreichbar bleiben, obwohl der Ingress
diesen Pfad schützt. Dafür braucht es entweder einen eigenen öffentlichen Pfad
oder eine Ausnahme je Artikel, die Caddy nicht kennt. Das ist eine
Auslieferungsfrage, keine Frage der Anwendung.
