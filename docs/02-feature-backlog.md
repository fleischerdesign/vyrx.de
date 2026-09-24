# 02 — Feature-Backlog

Alle Einträge sind Vorschläge. Format: `Status` · Aufwand (`S` ≤ 1 Tag,
`M` ≤ 1 Woche, `L` > 1 Woche) · Nutzen · Personas · Ort · Akzeptanzkriterium (AC).

Vorgabe für den **Ort** ist `Portal`. Abweichende Orte, weil die Arbeit dort
ohnehin stattfindet:

- **Terminal** — R1 Wirkung vor der Änderung, R2 Trockenlauf, L1 Durchlaufzeit
  (gemessen am Ausrollweg), H6 Baumgesundheit, G4 Sicherheits-Header, I3 Tote
  Felder (als Prüflauf)
- **Änderungsvorschlag (PR)** — H3 Prüflauf, H7 Vorschau, J1 Contract-Entwurf
- **Endpunkt** — F5 Tokens, R7 Export
- **Git** — O3 Änderungsprotokoll (Quelle der Wahrheit ist die Revision, nicht
  das Portal)
- **Mail oder Startbildschirm** — E2 Benachrichtigungen, R5 Nachtbericht
- **Ferne (Portal oder Telefon)** — R3 Rollback, C1 Statushistorie: das Portal
  ist der Ort, an dem man ist, wenn man nicht dort ist, wo man sonst ist

**Triage.** Der erste Arbeitsblock ist entschieden und trägt den Status
`geplant`: die Grundlage S1–S5, die Übersetzungsparität H1 und die vier kleinen
Griffe G1, G2, G6 und G7. Von diesen elf Einträgen ist H1 inzwischen
`umgesetzt` (E-0010). Alles andere bleibt `idee` und ist damit ausdrücklich
nicht zugesagt; `verworfen` steht am Ende der Datei mit Begründung.

Block A und B sind die beiden Vorhaben, die das Portal von einem Schaufenster
zu einem Hub machen. C bis H sind der Rest, nach Nutzen sortiert.

## A. Wissensbasis (Wiki)

Zwei Teile, ausdrücklich getrennt: die **Faktentafel** entsteht aus dem Katalog
(Contracts → `portal.json`), die **Anleitung** wird in diesem Repository
geschrieben (`content/knowledge/<slug>/de.md` und `en.md`, optional
`content/services/<id>/`). Nichts davon steht in den Nix-Modulen — sonst gäbe es
zwei Beschreibungen desselben Dienstes, und eine Textänderung bräuchte einen
Flotten-Rebuild.

- **A1 Wissensbasis unter `/knowledge`** — `idee` · `M` · Nicht-technische
  Nutzer finden Anleitungen dort, wo sie sich anmelden. Personas: Gast,
  Nicht-technisch, Technisch. AC: `/knowledge` und `/knowledge/<slug>` liefern
  vorgerendertes HTML (auch ohne JavaScript lesbar); die Artikel sind eine
  Inhaltssammlung mit typisierten Feldern, ein fehlendes Pflichtfeld bricht den
  Bau. Ort: Portal.
- **A2 Volltextsuche über Inhalte** — `idee` · `M` · Eine Suche, die Dienste,
  Kategorien und Wissensseiten gemeinsam trifft. Personas: alle. AC: Die
  Befehlspalette findet Titel und Textstellen; Treffer zeigen die Herkunft.
- **A3 Zwei Lesetiefen je Thema** — `idee` · `M` · Kurzfassung für den Alltag,
  Abschnitt „Technisch“ zum Aufklappen. Personas: Nicht-technisch, Technisch.
  AC: Jede Seite hat einen Kurzabschnitt vor allen Fachdetails; die Kurzfassung
  ist ohne Vorwissen verständlich (Prüfung durch eine zweite Person).
- **A4 Sichtbarkeit nach Rolle** — `idee` · `S` · Nutzt das vorhandene Modell
  (`public|internal|mesh|isolated`). AC: Unsichtbare Seiten sind auch über
  die Suche nicht erreichbar, nicht nur nicht verlinkt.
- **A5 Rezepte statt Referenz** — `idee` · `S` · „Film beantragen“, „Drucker
  einrichten“, „Passwort vergessen“ als Schrittfolgen. AC: Jedes Rezept beginnt
  mit dem Ergebnis, nicht mit dem Werkzeug.
- **A6 Inhalt im Pull-Request-Verfahren** — `idee` · `S` · Vorschau je PR,
  Freigabe durch den Admin. AC: Ein neuer Artikel ist ohne Neubau der
  Anwendung sichtbar zu machen.

- **A7 Wissensgerüst generieren** — `idee` · `M` · Aus dem Katalog entsteht je
  Dienst eine Seite mit Faktentafel (Kennung, Zweck, Kategorie, Ebenen,
  Erreichbarkeit, Verantwortliche, Abhängigkeiten); geschriebene Artikel liefern
  nur den Rest. Ort: Portal. Personas: alle. AC: Kein Fakt der Tafel existiert
  ein zweites Mal als Text, und jede Seite hat eine Adresse, auch wenn sie
  niemand geschrieben hat.
- **A8 Inhaltliche Prüfungen** — `idee` · `S` · Jeder Katalogeintrag hat eine
  Seite; jeder Artikel nennt eine Kennung, die existiert; kein Artikel zweimal
  zum selben Zweck; Sprachpaar vollständig oder ausdrücklich einsprachig. Ort:
  Prüflauf. Personas: Technisch. AC: Jeder Verstoß bricht den Bau und nennt die
  Datei.

## B. Integrations-Hub

- **B1 Dienst-Deskriptoren** — `idee` · `M` · Ein Datenformat beschreibt je
  Dienst: Kennung, Anzeigename, Symbol, Adresse, Anmeldung, Zustandsabfrage,
  Kurzaktionen, Sichtbarkeit. AC: Ein neuer Dienst ist über den Katalog, ohne
  Änderung an `views.js`, vollständig bedienbar. Format: `04-integrationen.md`.
- **B2 Direktaufruf mit Anmeldung** — `idee` · `S` · Ein Klick führt in den
  Dienst, bereits angemeldet, und zurück. AC: Rückweg über eine feste Adresse,
  nicht über die Zurück-Taste des Browsers.
- **B3 Live-Zustand je Dienst** — `idee` · `M` · Adapter fragen den Dienst
  selbst (Version, Warteschlange, Belegung) statt nur eine Metrik zu raten.
  AC: Ein ausgefallener Adapter beeinflusst die anderen nicht und ist als
  „unbekannt“ sichtbar.
- **B4 Schnellaktionen** — `idee` · `L` · Pausieren, fortsetzen, neu starten —
  nur für Administratoren, jede Aktion bestätigt und protokolliert. AC: Jede
  Aktion hat eine Erklärung, eine Bestätigung und einen Eintrag im Protokoll.
- **B5 Dienstübergreifende Suche** — `idee` · `L` · Eine Suche, die Medien,
  Downloads und Wiki zugleich abfragt, mit Herkunftsangabe. AC: Ergebnisse sind
  gruppiert, langsam erreichbare Quellen blockieren die schnellen nicht.
- **B6 „Meine Dienste“** — `idee` · `S` · Favoriten steuern Reihenfolge und
  Startansicht. AC: Die Startansicht zeigt zuerst die Favoriten, dann den Rest,
  ohne leeren Zwischenzustand.

## C. Betriebstransparenz

- **C1 Statushistorie** — `idee` · `M` · Ein Verlauf beantwortet „war das
  gestern auch schon?“. AC: Veränderungen werden mit Zeitpunkt und Dauer
  festgehalten und sind je Dienst abrufbar.
- **C2 Wartungsfenster und Banner** — `idee` · `S` · Geplante Arbeiten stehen
  vorher sichtbar, nicht erst als Ausfall. AC: Ein Fenster kann ohne Neubau
  gesetzt werden und verschwindet von selbst.
- **C3 Health-Endpunkt des Portals** — `idee` · `S` · `/api/health` unterscheidet
  „Prozess lebt“ von „Datenquelle erreichbar“. AC: Der Endpunkt antwortet in
  unter einer Sekunde und nennt je Abhängigkeit `ok|degraded|down`.
- **C4 Sicherungszustand** — `idee` · `M` · Alter der letzten Sicherung je
  System, mit Warnschwelle. AC: Überfällige Sicherungen sind auch ohne
  Aufklappen sichtbar.
- **C5 Zertifikate und Namen** — `idee` · `S` · Ablaufdaten und Auflösung der
  Namen. AC: Warnung 14 Tage vor Ablauf.
- **C6 Gruppierte Statusansicht** — `idee` · `S` · Nach Kategorie und Rolle,
  Filter merkt sich die Auswahl. AC: Ein Filterzustand überlebt das Neuladen.

## D. Komfort und Informationsarchitektur

- **D1 Globale Suche statt Dienstsuche** — `idee` · `M` · Ein Eingang für
  Dienste, Kategorien, Wiki, Personen und Aktionen. AC: Die Palette erklärt
  leere Treffer, statt nichts zu zeigen.
- **D2 Kürzel sichtbar machen** — `idee` · `S` · `Cmd/Ctrl+K` und die übrigen
  Tasten stehen in der Palette und auf einer Hilfezeile. AC: Jede Aktion der
  Palette ist ohne Maus erreichbar.
- **D3 Favoriten auf dem Server** — `idee` · `M` · Favoriten gelten
  geräteübergreifend; der Verlauf bleibt geräteweise (Entscheidung 3 in
  `06-entscheidungen.md`). Speicher: E-0009. Ort: Portal. Personas: alle.
  AC: Ein Wechsel des Browsers verliert keine Favoriten; der Verlauf geht mit
  dem Gerät und ist löschbar.
- **D4 Nutzerpräferenzen** — `idee` · `S` · Sprache, Theme, Dichte je Benutzer.
  AC: Die Präferenz überlebt Sitzung und Gerät.
- **D5 Merkliste** — `idee` · `S` · Dienste für später markieren. AC: Sichtbar
  in Konto und Startansicht.
- **D6 Verlauf je Ansicht** — `idee` · `S` · Zuletzt geöffnete Dienste,
  Zuletzt gelesene Seiten. AC: Der Verlauf ist löschbar.

## E. Kommunikation

- **E1 Ankündigungen** — `idee` · `S` · Neuigkeiten mit Zeitraum und Zielgruppe.
  AC: Abgelaufene Ankündigungen verschwinden ohne Eingriff.
- **E2 Benachrichtigungen (freiwillig)** — `idee` · `M` · Ausfall- und
  Erfolgsmeldungen, abonnierbar je Kategorie. AC: Ausschalten ist genauso
  einfach wie Einschalten; ein Kanal ist nie stillschweigend aktiv.
- **E3 Problem melden** — `idee` · `S` · Ein Formular, das die Sitzungsdaten
  gleich mitliefert. AC: Die Meldung enthält Zeitpunkt, Sicht und Antwort-ID,
  aber keine Zugangsdaten.

## F. Zugang und Rollen

- **F1 Eigenes Profil** — `idee` · `S` · Anzeigename, Bild, Sprache. AC: Der
  Name stammt aus dem Verzeichnis; Abweichungen sind im Portal sichtbar.
- **F2 Sitzungen und Geräte** — `idee` · `M` · Wo bin ich angemeldet, wie beende
  ich eine Sitzung. AC: Die Liste ist vollständig aus den Konto-Daten.
- **F3 Gastzugang** — `idee` · `M` · Befristeter Zugang ohne Konto. AC: Ablauf
  ist einstellbar und wird auch durchgesetzt, nicht nur angezeigt.
- **F4 „Was darf ich?“** — `idee` · `S` · Die eigenen Rechte in Klartext.
  AC: Deckt alle im Katalog benutzten Sichtbarkeiten ab.
- **F5 Tokens für Automatisierung** — `idee` · `M` · Skripte und Agenten fragen
  den Katalog ab, ohne Benutzerkonto. AC: Token ist widerrufbar, eingeschränkt
  im Umfang und in seinem Zugriff protokolliert.

## G. Plattform

- **G1 Installierbar (PWA)** — `geplant` · `M` · Manifest, Symbole, Startbild.
  AC: Kein Symbol fehlt, der Start vom Startbildschirm führt in die Anmeldung.
- **G2 Hell und dunkel** — `geplant` · `S` · Systemvorgabe plus Wahl. AC: Die Wahl
  gewinnt gegen die Systemvorgabe und flackert beim Laden nicht.
- **G3 Ansichten ohne JavaScript** — `idee` · `L` · Die Ansichten serverseitig
  ausliefern, der Client übernimmt danach. AC: `#/dienste` zeigt mit
  abgeschaltetem JavaScript Inhalt statt einer leeren Fläche.
- **G4 Sicherheits-Header nachweisen** — `idee` · `S` · CSP, `Referrer-Policy`,
  `Permissions-Policy`, `X-Content-Type-Options`, HSTS. AC: Ein Prüflauf gegen
  die Produktionsadresse zeigt alle Header, und die CSP erlaubt nichts Fremdes.
- **G5 Schriften selbst hosten** — `idee` · `S` · Steht im Code bereits als Plan.
  AC: Keine Anfrage an fremde Herkunft beim Laden einer Seite.
- **G6 Polling mit Bedacht** — `geplant` · `S` · Nur bei sichtbarem Tab abfragen,
  längeres Intervall im Hintergrund. AC: Ein versteckter Tab erzeugt keine
  Anfragen.
- **G7 Barrierefreiheit** — `geplant` · `M` · `aria-live` für Zustandswechsel,
  Fokusfalle in der Palette, `prefers-reduced-motion`. AC: Ein Prüflauf mit
  Tastatur und Screenreader kommt durch alle Ansichten.
- **G8 Fehler sichtbar machen** — `idee` · `S` · Fehler beim Laden nennen Grund
  und Erholungsschritt, nicht nur „Fehler“. AC: Kollektor aus — die Oberfläche
  sagt es und bietet erneut versuchen an.

## H. Qualitätssicherung und Dokumentation

- **H1 Übersetzungsparität als Prüfung** — `umgesetzt` · `S` · Test über die
  Schlüsselmengen beider Dateien. AC: Eine fehlende Übersetzung bricht den Bau.
  *Beleg:* `test/i18n.test.ts` — die Sprachen, die Schlüssel und die Dateien
  werden aus dem Baum entdeckt, nichts ist im Test aufgezählt; `npm run check`
  läuft `astro check` und die Prüfungen, `npm run build` beginnt mit `check`.
  Läufer: E-0010.
- **H2 Vertragstests der Endpunkte** — `idee` · `M` · `me`, `status`, `hosts`
  und der JSON-404 werden gegen feste Beispiele geprüft. AC: Die Katalogform
  steht als Prüfbeispiel im Repository.
- **H3 Prüflauf (CI)** — `idee` · `S` · `astro check`, Tests, Bau.
  AC: Jeder Pull-Request läuft den Prüflauf.
- **H4 Dokumentation im Prüflauf** — `idee` · `S` · Tote Verweise und
  Überschriftenfolge. AC: Kaputte Verweise brechen den Prüflauf.
- **H5 Entscheidungen festhalten** — `idee` · `S` · Fortlaufend in
  `06-entscheidungen.md`. AC: Jede Entscheidung, die den Aufbau bestimmt,
  hat dort einen Eintrag.
- **H6 Baumgesundheit** — `idee` · `S` · Letzter Prüflauf, letzter Ausrolllauf,
  letzte Vertragsprüfung als eine Ansicht. Personas: Administrator.
  AC: Ein roter Lauf ist ohne Aufklappen sichtbar.
- **H7 Vorschau je Änderung** — `idee` · `M` · Jeder Änderungsvorschlag bekommt
  eine Adresse, unter der die Landing in dieser Fassung zu sehen ist.
  Personas: Technisch, Administrator. AC: Die Vorschau ist nur für Berechtigte
  erreichbar.

## I. Projektion des Systems

Diese Gruppe erweitert die Wahrheit nicht — sie zeigt, was bereits deklariert
oder gemessen ist. Vorbedingung für alle Einträge: die Schichtung aus
`04-integrationen.md` §11.

- **I1 Namensseite** — `idee` · `M` · Eine Seite je DNS-Name beantwortet alles
  über ihn: Ebenen, Zertifikat, Ingress, Contract, Telemetrie, Sicherung,
  Verantwortliche. Personas: Technisch, Administrator. AC: Jede Aussage nennt
  ihre Quelle; die Seite liest Projektionen, sie kennt keine Namen im Code.
- **I2 Konvergenzseite je Host** — `idee` · `M` · Soll und Ist: laufende
  Generation, zugehörige Revision, beobachteter Zustand, Alter seit dem letzten
  Ausrollen. Personas: Administrator, Technisch. AC: Eine Abweichung ist ohne
  Aufklappen sichtbar und nennt beide Seiten.
- **I3 Tote Felder und nackte Fakten** — `idee` · `M` · Das Daten-Gegenstück zu
  `deadnix`: Deklarationen ohne Leser, Fakten ohne Deklaration. Personas:
  Administrator. AC: Der Bericht ist aus den Contracts erzeugt und benennt
  jeden Fund mit Quelle.
- **I4 Ablaufregister** — `idee` · `S` · Zertifikate, Empfänger von
  Geheimnissen, Tokens, Alter der letzten Sicherung in einer Tabelle mit
  Warnschwelle. Personas: Administrator. AC: Jeder Eintrag nennt Restlaufzeit
  und Verantwortlichen.
- **I5 Zugriffslandkarte** — `idee` · `M` · Welche Person und welche Gruppe
  erreicht welchen Dienst und welches Geheimnis — der Graph, nie die Werte.
  Personas: Administrator. AC: Die Karte enthält keinen einzigen Wert, nur
  Beziehungen.

## J. Selbstbedienung

- **J1 Anforderung wird Contract-Entwurf** — `idee` · `L` · Ein Formular
  erzeugt einen gültigen Endpunkt-Schnipsel statt eines Tickettexts. Personas:
  Technisch, Administrator. AC: Der Entwurf ist prüfbar, das Absenden
  berechtigungsgeprüft und protokolliert.
- **J2 Geräteaufnahme** — `idee` · `M` · Ein frisches Gerät erscheint aus dem
  Inventar und bekommt Name und Zone. Personas: Administrator. AC: Ohne
  Aufnahme bleibt das Gerät sichtbar, aber namenlos — nie unsichtbar.

## K. Erklären

- **K1 Wirkung statt Ursache** — `idee` · `M` · Statt eines Host-Zustands eine
  Aussage darüber, was nicht geht, abgeleitet aus den Abhängigkeiten. Personas:
  alle. AC: Eine Aussage nennt die betroffenen Personen und die kleinste
  mögliche Handlung.
- **K2 Onboarding-Reise** — `idee` · `M` · Gerät, Konto, erster Zugang mit
  Zustand statt Papierliste. Personas: Nicht-technisch, Gast. AC: Jeder Schritt
  zeigt, was noch fehlt und wer hilft.
- **K3 Rezept-Modus** — `idee` · `L` · Ein Rezept führt durch die Oberfläche
  und hebt den gemeinten Knopf hervor, statt ihn zu beschreiben. Personas:
  Nicht-technisch. AC: Ohne laufendes Rezept ändert sich die Oberfläche nicht.
- **K4 Wissensbasis, die offline hält** — `idee` · `M` · Gerade im Ausfall ist
  das Netz weg; die Erklärung muss im Zwischenspeicher liegen. Personas: alle.
  AC: Die zuletzt gelesenen Rezepte sind ohne Netz lesbar.
- **K5 Sprachweg** — `idee` · `M` · Eine gesprochene Frage nach dem Zustand,
  eine gesprochene Antwort. Personas: Nicht-technisch. AC: Der Weg ist
  abschaltbar und antwortet nie mit einem Geheimwert.

## L. Betrieb

- **L1 Durchlaufzeit** — `idee` · `M` · Commit, Ausrollen, beobachteter Zustand
  je Host als Kennzahl. Personas: Administrator. AC: Die Zeit wird gemessen,
  nicht geschätzt, und nennt Start- und Endartefakt.
- **L2 Ereignisfeed mit Verkettung** — `idee` · `M` · Neustart und
  Zustandswechsel werden verknüpft gezeigt, damit Ursache und Folge nicht
  verwechselt werden. Personas: Technisch, Administrator. AC: Jedes Ereignis
  nennt Zeitpunkt, Quelle und Folge.
- **L3 Übungsmodus** — `idee` · `M` · Das Runbook als geführter Weg während
  eines Ausfalls, ohne Netz. Personas: Administrator. AC: Der Weg funktioniert
  offline und endet mit einem Bericht.

## M. Über Personen

- **M1 „Meine Daten“** — `idee` · `S` · Welche Identitätsdaten existieren, wo
  Protokolle liegen, wie lange. Personas: alle. AC: Die Seite nennt keine Daten
  anderer Personen.
- **M2 Ruhezeiten** — `idee` · `S` · Benachrichtigungen respektieren sie;
  Ausnahmen müssen benannt sein. Personas: alle. AC: Eine Ausnahme ist einzeln
  sichtbar und begründet.

## N. Vorgänge und Betriebsgedächtnis

Der Vorgang ersetzt kein Ticketsystem: er hat einen Eingang, einen Wartenden
und einen Abschluss — sonst nichts. Das ersetzt zugleich den getrennten
Freigabe-Eingang aus der Ideensammlung (ein Weg, nicht zwei).

- **N1 Vorgang mit Artefakt-Abschluss** — `idee` · `L` · Ein Vorgangstyp für
  alle Anliegen; erledigt heißt, ein Artefakt liegt vor (Commit, Contract,
  Inventareintrag). Speicher: E-0009. Personas: alle. AC: Kein Vorgang lässt
  sich ohne benanntes Artefakt schließen.
- **N2 Ein Eingang für alle Quellen** — `idee` · `M` · Bericht, Reconciler,
  Ablaufregister, Inventar und Medienwunsch landen in derselben Liste. Personas:
  Administrator. AC: Jeder Vorgang nennt seine Quelle, und keine Quelle hat
  einen eigenen Eingang.
- **N3 „Wartet auf wen“** — `idee` · `S` · Das einzige Feld, das in jedem
  Vorgangssystem wirklich benutzt wird. Personas: Administrator. AC: Vorgänge
  ohne Wartenden sind als solche markiert.
- **N4 Betriebsgedächtnis** — `idee` · `M` · „Hatten wir das schon?“ —
  Ausfälle, Ursache und Behebung als durchsuchbare Einträge. Personas:
  Technisch, Administrator. AC: Ein früherer Fall ist auch über die Wirkung
  auffindbar, nicht nur über den Namen.

## O. Sicherheit und Vertrauen

- **O1 Sicherheits-Einseiter** — `idee` · `S` · Was hängt öffentlich, was nur
  im Netz, was hat ein Zertifikat — als Projektion der Scopes. Personas:
  Administrator, Gast. AC: Die Aussage folgt der Deklaration, nicht einer
  gepflegten Liste.
- **O2 Vertrauensstufen je Gerät** — `idee` · `M` · „Darf dieses Gerät das?“
  aus Zone und Inventar abgeleitet. Personas: Administrator. AC: Die Antwort
  nennt die Regel, nicht nur ja oder nein.
- **O3 Änderungsprotokoll** — `idee` · `M` · Wer hat wann welche Deklaration
  geändert, verknüpft mit Revision und Person. Personas: Administrator.
  AC: Einträge ohne zuordenbare Person sind als solche gekennzeichnet.
- **O4 „Was habe ich zuletzt getan?“** — `idee` · `S` · Die eigene Spur, für
  die eigene Nachvollziehbarkeit. Personas: Technisch, Administrator. AC: Nur
  die eigene Spur ist sichtbar.

## P. Zeit und Sorgfalt

- **P1 Sorgfaltsregister** — `idee` · `M` · Wiederkehrende Sorgfalt (Sicherung,
  Restore-Probe, Zertifikate, Aktualisierungen, Prüfläufe) mit Rhythmus und
  Zustand. Personas: Administrator. AC: Überfälliges ist ohne Aufklappen
  sichtbar und nennt die letzte Erledigung.
- **P2 Wartungsfenster als Vorgang** — `idee` · `S` · Kein Sonderweg: ein
  Fenster ist ein Vorgang mit Zeitraum und Ankündigung. Personas:
  Administrator, alle. AC: Ankündigung und Fenster sind derselbe Datensatz.

## Q. Zugang und Gäste

- **Q1 Gastmodus mit Einweisung** — `idee` · `M` · Befristeter Zugang plus
  Einseiter „was hier erlaubt ist“ und erzwungener Ablauf. Personas: Gast,
  Administrator. AC: Nach Ablauf endet der Zugang ohne Zutun.
- **Q2 „Wen frage ich?“** — `idee` · `S` · Verantwortliche je Dienst, aus den
  Contracts. Personas: alle. AC: Jede Aussage, die eine Handlung verlangt,
  nennt eine Person oder eine Gruppe.

## R. Fernhilfe und Vorschau

Diese Gruppe entstand aus Ideen, die zuerst **falsch geformt** waren: sie
zeigten im Portal, was am Terminal entschieden wird. Die Ableitung bleibt eine,
der Ort ist der, an dem man ohnehin steht. Deshalb steht hier bei jedem Eintrag
der Ort ausdrücklich.

- **R1 Wirkung vor der Änderung** — `idee` · `M` · Betroffene Dienste und
  Personen aus Contracts und Abhängigkeiten ableiten und als Text am Ausrollweg
  sowie als Kommentar am Änderungsvorschlag ausgeben. Ort: Terminal und PR.
  Personas: Technisch, Administrator. AC: Beide Ausgaben stammen aus derselben
  Ableitung — es gibt keine zweite Rechnung.
- **R2 Trockenlauf** — `idee` · `M` · „Was würde sich ändern“, je Host, in
  Sätzen statt als Diff. Ort: Terminal. Personas: Administrator. AC: Die
  Ausgabe nennt je Host die Änderung und die Wirkung, die sie hätte.
- **R3 Rollback als Notfallweg** — `idee` · `M` · Auf die vorherige Generation
  zurückgehen, wenn kein Terminal erreichbar ist: berechtigungsgeprüft,
  bestätigt, protokolliert. Ort: Fernzugriff. Personas: Administrator. AC: Nach
  der Aktion ist der neue Zustand belegt, nicht behauptet.
- **R4 Zustandsvertrag je Dienst** — `idee` · `M` · „Was heißt hier gesund?“
  einmal deklariert; Alarmierung und Portal lesen denselben Satz. Ort: Contract,
  gelesen von Terminal und Portal. Personas: Technisch, Administrator.
  AC: Eine Abweichung zwischen beiden Lesern ist nicht baubar.
- **R5 Nachtbericht** — `idee` · `S` · Was Automatisierungen und Reconciler
  über Nacht getan haben, als ein Absatz. Ort: Startbildschirm, auf Wunsch
  Mail. Personas: Administrator, Technisch. AC: Der Bericht nennt nur, was er
  belegen kann — jede Zeile hat eine Quelle.
- **R6 Fragenbuch** — `idee` · `S` · Wiederkehrende Vorgänge werden zu
  Wissensseiten; die Antwort entsteht dort, wo die Frage gestellt wurde. Ort:
  Portal, gespeist aus Block N. Personas: alle. AC: Der Übergang von Vorgang zu
  Wissensseite ist ein Schritt, kein Umweg.
- **R7 Einseiter-Export** — `idee` · `S` · Alles, was das Portal zeigt, als
  eine Datei. Ort: Endpunkt. Personas: Automat, Technisch. AC: Der Export
  enthält nichts, was die Oberfläche nicht auch zeigt — sonst wäre die
  Oberfläche unvollständig.
- **R8 Fernhilfe-Register** — `idee` · `S` · Die freie Fassung ist entschieden.
  Damit hat das Portal keine Sitzung zu vergeben und nichts zu vermitteln; es
  führt ein **Register**: welche Geräte erreichbar sind, in welcher Betriebsart
  (unbeaufsichtigt heißt dauerhaftes Kennwort), welche Kennung, wo das Geheimnis
  liegt (im Geheimnisspeicher, nie hier), wann es zuletzt gewechselt wurde, wie
  es widerrufen wird und wer zuletzt geholfen hat. Ort: Portal. Personas:
  Administrator. AC: Jeder Eintrag nennt Kennung, Betriebsart, Fundort des
  Geheimnisses, Alter und Widerrufsweg; keine Aussage behauptet eine Kontrolle,
  die es nicht gibt.
  Grenzen, ausdrücklich: keine Konten, keine Konsole, keine Schnittstelle, kein
  Adressbuch, kein Verbindungsprotokoll. Das Register kann eine Sitzung weder
  erlauben noch beweisen — nur ankündigen und festhalten. Der Nachweis einer
  Hilfe entsteht deshalb im Vorgang (Block N), nicht hier.
  Was bleibt, ist Konfiguration: Erreichbarkeit der beiden Server, Verteilung
  des Schlüssels, Betriebsart und Zustimmung am Zielgerät, und der Umgang mit
  dem unbeaufsichtigten Kennwort als langlebigem Geheimnis — dessen Wechsel
  gehört in den Rhythmus des Sorgfaltsregisters (P1).

## S. Grundlage: Routen, Hülle, Astro

Diese Gruppe ist **Vorarbeit**: sie erledigt die Raute, die deutschen Pfade und
die ungeprüfte Oberfläche in einer Arbeit. Block A und G3 bauen darauf auf und
würden sonst zweimal gebaut werden. Entscheidungen: `06-entscheidungen.md`
E-0006 bis E-0008; Navigation: `03-ui-ux.md` §6.

- **S1 Echte Pfade statt Raute** — `geplant` · `M` · Ansichten werden Seiten unter
  `src/pages/` mit englischen Pfaden in beiden Sprachen. Ort: Portal. Personas:
  alle. AC: Jede Ansicht hat eine eigene Adresse, ein eigenes 404-Verhalten und
  Metadaten; kein Verweis im Projekt enthält noch eine Raute.
- **S2 Hülle als Layout** — `geplant` · `M` · Zeichnung, Hafen, Palette und
  Sprachumschalter werden ein Layout, die Ansichten sind Seiten darin. Ort:
  Portal. Personas: alle. AC: Kein Ansichtsmodul enthält Hüllenelemente.
- **S3 Inseln statt `innerHTML`** — `geplant` · `M` · Nur das Lebendige lädt im
  Browser (Status, Palette, Aktionen), alles andere kommt als HTML. Ort: Portal.
  Personas: alle. AC: Ohne JavaScript zeigen alle Ansichten Inhalt statt einer
  leeren Fläche (erfüllt G3).
- **S4 Ansichten typgeprüft** — `geplant` · `S` · Ansichtsmodule nach TypeScript
  mit Prüfung; heute sieht der Prüflauf rund 27 KB Oberflächenlogik nicht
  (`src/lib/*.js` ohne `checkJs`). Ort: Prüflauf. Personas: Technisch.
  AC: Ein Typfehler in einer Ansicht lässt `astro check` fehlschlagen.
- **S5 Dienstseiten statt Detailansicht** — `geplant` · `M` · Je Dienst eine
  vorgerenderte Seite (`/services/<id>`) mittels `getStaticPaths`. Ort: Portal.
  Personas: Technisch, Automat. AC: Die Seite existiert als Datei und ist ohne
  JavaScript lesbar und verlinkbar.

## T. Netzblick (Betrieb)

Belegt am 2026-09-23 gegen `fleischerdesign/nixfiles`: **Kea** deklariert kein
`monitoring` (kein Scrape), **Knot** setzt `monitoring.http.enable = false`,
**WireGuard** und **nftables** haben keinen Zählerabgriff. **CrowdSec**
deklariert `scrape.enable = true` (Port 6060) — das fließt bereits. Die Lücke
ist also die Sammelstrecke, nicht die Oberfläche.

Zwei Regeln für den ganzen Block: es entsteht **keine zweite Sammelstrecke**
(Kennzahlen über Prometheus wie der Dienststatus, Ausdrücke serverseitig), und
**Grafana bleibt für Kurven** — das Portal beantwortet Fragen.

- **T1 Adressen und Geräte** — `idee` · `M` · Wer hat welche Adresse, in welcher
  Zone, seit wann, mit welchem Namen; neue und namenlose Geräte. Quelle:
  Kea-Steuerschnittstelle (Zustandsliste) plus Inventar. Ort: Portal. Personas:
  Administrator. AC: Jede Zeile nennt Lease, Zone und Alter; ein Gerät ohne
  Namen ist sichtbar, nie unsichtbar.
- **T2 Namen und Anfragen** — `idee` · `M` · Was wird aufgelöst, was scheitert,
  welche Ebene, welche Blockliste greift. Quelle: Knot-Statistikmodul. Ort:
  Portal. Personas: Administrator. AC: Die Ansicht nennt die Quelle ihrer Zahlen
  und bleibt ohne Datenquelle ehrlich leer statt null.
- **T3 Mesh** — `idee` · `S` · Welcher Peer ist wach, wann zuletzt gesehen,
  welche Menge. Quelle: WireGuard-Zähler über einen kleinen Sammler. Ort:
  Portal. Personas: Administrator. AC: Ein toter Peer ist ohne Aufklappen
  erkennbar.
- **T4 Regeln und Abweisungen** — `idee` · `M` · Welche Regel greift, was wird
  abgewiesen. Quelle: nftables-Zähler über einen kleinen Sammler. Ort: Portal.
  Personas: Administrator. AC: Zähler sind je Regel benannt, nicht aggregiert.
- **T5 Anmeldungen und Sperren** — `idee` · `S` · Fehlgeschlagene Anmeldungen,
  aktive Sitzungen, Sperren mit Ablauf. Quelle: Authentik und CrowdSec (letztere
  liefert bereits Kennzahlen). Ort: Portal. Personas: Administrator. AC: Eine
  Sperre nennt Grund, Zeitpunkt und Ablauf.

## Verworfen (mit Begründung)

Diese Einträge bleiben stehen, damit sie nicht in drei Monaten neu vorgeschlagen
werden. Wer sie wieder aufnehmen will, widerlegt zuerst die Begründung.

- **V1 Startseite „Was willst du tun?“** — `verworfen` (2026-09-23). Ein zweiter
  Einstieg neben dem Katalog zahlt sich nur aus, solange die Kacheln
  nichtssagend sind. Mit den Integrationen (Block B) ist die Kachel die Einheit;
  ein zweiter Einstieg wäre eine Station zu viel. *Was bleibt:* ein
  Klartext-Untertitel je Kachel und die Reihenfolge nach Nutzung.
- **V2 Eingriffe aus dem Portal (sperren, entfernen, freigeben)** — `verworfen`
  (2026-09-23). Ein Portal, das Dauerzustand ändert, erzeugt eine zweite
  Wahrheit neben der Konfiguration und macht die Konsistenzprüfung wertlos; für
  „sofort“ bräuchte es befristete Aktionen mit eigenem Rechte- und
  Protokollapparat — teurer als Wiki und Integrationen zusammen. *Was bleibt:*
  Notfallwege, die Zustand statt Deklaration ändern (R3 Rollback), und das
  Register für Fernhilfe (R8).

