# 07 — Produkt- und Seitenkonzept

Stand: 2026-09-26. **Gestaltungsgrundlage, noch keine Implementierung.** Die
Produktentscheidungen E-0015 bis E-0018 in `06-entscheidungen.md` legen die
Richtung fest; technische Form und genaue Veröffentlichung werden vor dem Bau
geprüft. Dieses Dokument ergänzt die bestehenden Ideen um die öffentliche
Projekt-Fallstudie und konkrete Nutzerwege.

## 1. Ein Produkt, drei Blickwinkel

VYRX ist für Familie und Freunde zuerst ein **Zugang zu ihrem digitalen Alltag**.
Für Interessierte darf es außerdem eine **nachvollziehbare Arbeit von Philipp**
sein. Für Philipp ist es schließlich ein **Werkzeug, um das System zu verstehen
und zu betreiben**. Diese Blickwinkel teilen Marke und Gestaltungsregeln, aber
nicht zwingend Navigation, Informationsdichte oder Berechtigungen.

| Blickwinkel | Leitfrage | Erste Handlung | Nicht hier |
|---|---|---|---|
| Öffentlich: Nutzer | „Wie komme ich zu meinen Dingen?“ | Workspace öffnen | Netzplan, Dienstinventar, Admin-Zahlen |
| Öffentlich: Interessierte | „Was wurde hier gebaut und warum?“ | Projekt verstehen | Live-Topologie, personenbezogene Daten |
| Angemeldet: Alltag | „Was möchte ich jetzt erledigen?“ | Anwendung/Wissen öffnen | Betreiberkennzahlen als Hauptinhalt |
| Angemeldet: Betrieb | „Was weicht ab und was tue ich?“ | Ursache und Runbook finden | zweite Quelle für Nix-Dauerzustand |

**Korrektur zur ersten Designstudie:** „Dateien“, „Medien“ und „Anfragen“ waren
illustrierende Platzhalter. Der geprüfte öffentliche Katalog enthält tatsächlich
Hausautomation (Home Assistant), Medienwünsche (Jellyseerr) und Rezepte (Mealie;
nur für die entsprechende Gruppe). Die Studie wird darauf ausgerichtet,
bleibt aber eine Illustration und keine Live-Datenquelle. Im Produkt kommen
Einträge aus dem Katalog und Texte aus der Darstellungsschicht
(`04-integrationen.md` §11), nie aus dem Mockup.

## 2. Öffentliche Seiten: klein, aber vollständig

### `/` — Einstieg, nicht Inventar

- Adressat: Familie, Freunde, bereits eingeladene Personen; Projektinteressierte
  sind willkommen, aber nicht die Hauptfigur.
- Im ersten Bildschirm: VYRX in einem Satz, **eine** primäre Handlung „Zum
  Workspace“, eine knappe Aussage, was dort möglich ist. Keine Plattform- oder
  Sicherheitsbegriffe als Voraussetzung zum Verstehen.
- Darunter: **Hausautomation, Medienwünsche, Rezepte** als konkrete Beispiele,
  ohne Versprechen, dass jede Person jeden Dienst erreicht; kurze Erklärung
  „Für wen ist das?“, Weg zu Hilfe und unaufdringlicher Verweis auf das Projekt.
  Keine Roh-URLs oder Gruppennamen auf der Landing.
- Kein öffentliches Host-Raster. Die heutige Landing zeigt Hostnamen, Adressen,
  Zonen, Dienste und Zustand. Ob diese Daten überhaupt öffentlich sein sollen,
  ist eine eigene Veröffentlichungsentscheidung, **kein** Design-Detail.
- Angemeldete Nutzer dürfen direkt ihre Startansicht sehen; der öffentliche
  Inhalt muss ohne Anmeldung und JavaScript selbständig funktionieren.

### `/project/` — Portfolio, ausdrücklich zweite Ebene

- Eine redaktionell gepflegte **VYRX-Fallstudie**, kein Duplikat der bereits
  bestehenden separaten persönlichen Portfolio-Website:
  **Ausgangsproblem → Leitprinzipien →
  Architektur auf Abstraktionsebene → ausgewählte Entscheidungen und Trade-offs →
  Wirkung/Erfahrungen → Quellcode, falls bewusst öffentlich**.
- Keine Produktliste als Selbstzweck. Spannend ist *warum* beispielsweise
  deklarative Konfiguration, Contracts, Mesh, Authentifizierung und Monitoring
  zusammenspielen – und was nicht ins Portal gehört.
- Ein statisches, abstrahiertes Diagramm zeigt Beziehungen zwischen Schichten
  (Identität, Zugang, Dienste, Betrieb), keine reale Topologie. Ein optionaler
  ausführlicher Artikel unter `/project/architecture/` lohnt erst, wenn dafür
  tatsächlich eigenständiger Inhalt vorhanden ist.
- Versions- und Zeitbezug: Welche Beschreibung ist Entwurf, was läuft wirklich,
  wann wurde zuletzt geprüft? Keine automatisch veröffentlichten Live-Metriken.
- SEO und Teilen: eigener Titel, Beschreibung, Social-Preview, DE/EN-Text.

### `/help/` — öffentlicher Zugang und erste Hilfe

- Für eingeladene Personen: „Wie melde ich mich an?“, „Ich habe keinen Zugang“,
  „Etwas öffnet sich nicht“, „Wen frage ich?“. Kurz, schrittweise, ohne zu
  behaupten, der Gast könne sich selbst Rechte vergeben.
- **Abgrenzung zur Wissensbasis `/knowledge/`:** Hilfe vor der Anmeldung ist
  öffentlich redigiert. Interne Namen, Geräte- und Netzdetails gehören hinter
  die Anmeldung. Öffentliche Wissensartikel mit `public` sind bereits
  entschieden (`06-entscheidungen.md`, Frage 9); diese erhalten vor
  Veröffentlichung zusätzlich eine bewusste redaktionelle Prüfung. Ein
  Menüversteck ist kein Zugriffsschutz.
- Kein öffentliches Kontaktformular ohne klares Zustell-, Missbrauchs- und
  Datenschutzkonzept. Ein tatsächlich betreuter Kontaktweg genügt.

### `/status/` — privat; kein zusätzlicher öffentlicher Status im Redesign

- Aktuell führt `/status/` in die Anmeldung. Das ist für technische Details
  sinnvoll. Für Familienmitglieder kann eine öffentliche Aussage wie „Dienst
  aktuell eingeschränkt“ hilfreich sein, **wenn** sie auch bei einem Ausfall
  verlässlich ausgeliefert wird und nichts über interne Systeme verrät.
- `/availability/` wird jetzt **nicht** eingeführt. Falls später nötig,
  braucht es eine eigene Entscheidung zu unabhängiger Auslieferung, Abdeckung,
  Aktualität und Datenfreigabe; keine Weiterverwendung der privaten Host-Ansicht.
- `/.well-known/security.txt` bleibt ein technischer Kontaktweg, keine
  prominent beworbene Alltagsseite. Rechtliche Hinweise/Datenschutz werden nach
  tatsächlicher Datenverarbeitung und Publikumsziel entschieden, nicht aus
  einem Muster-Template kopiert.

**Öffentliche Navigation (Vorschlag):** Marke, „Projekt“, „Hilfe“, primär „Zum
Workspace“. Auf kleinen Bildschirmen darf nichts die Marke abschneiden; keine
sechs Einträge mit künstlicher Wichtigkeit.

## 3. Workspace: Wege statt Seitenzahl

| Bereich | Primäre Frage / Ansicht | Bezogene Ideen | Erstes sinnvolles Inkrement |
|---|---|---|---|
| Start | „Was brauche ich gerade?“ Favoriten, zuletzt, relevante Hinweise | B6, D3, D6, E1 | Dynamische Reihenfolge, ehrlicher Leerzustand |
| Anwendungen | „Was kann ich öffnen?“ Suche, Kategorie, Zweck, Zugangsinfo | B1–B3, A7 | Katalog und direkter Aufruf, ohne Adapter-Versprechen |
| Wissen | „Wie mache ich das?“ Rezepte, Kurzfassung, technische Tiefe | A1–A5, K4 | Ein paar geprüfte, echte Anleitungen statt leeres Wiki |
| Status | „Ist mein Problem bekannt?“ Wirkung vor Host-Metrik | C1–C2, K1 | Gemessener Zustand + Standzeit + Unbekannt-Zustand |
| Konto | „Was betrifft mich?“ Eigene Rechte, Sitzungen, Präferenzen | F1–F4, M1 | Rechte in Klartext; Verweise statt duplizierte Identitätsverwaltung |
| Anliegen | „Wer kümmert sich?“ Problem oder Wunsch mit sichtbarem Verlauf | E3, N1–N3, Q2 | Zunächst betreuter Meldeweg; Workflow erst mit echter Zuständigkeit |

**Navigation ist nicht gleich Backlog:** Start, Anwendungen, Status und Konto
sind der erste funktionierende Weg. Wissen wird mit den bereits entschiedenen
zehn geprüften Rezepten zur fünften Hauptansicht (s. `06-entscheidungen.md`,
Frage 1). „Anliegen“ bleibt ein kontextueller Weg aus Hilfe/Status, bis es
einen betreuten Ablauf gibt. Verwaltung bleibt
unter `/admin/` und erscheint nur für Berechtigte. Diese Einteilung folgt
`03-ui-ux.md` §6; sie ist keine Zusage für alle Funktionen auf einmal.

### Wissen / Wiki: ein eigenständiger Wissensraum

**Die aktuelle Studie ist eine interaktive Strukturprobe, kein fertiges Wiki.**
Sie zeigt acht *nicht geprüfte* Beispielartikel aus Einstieg, Geräten, Medien,
Zuhause und Problemen: Themenwahl, Suche, Anleitungen, Erklärungen und
Problemlösungen, Querverweise und optionale Kontextlinks zu Anwendungen sind
visuell und klickbar erprobt. Die Inhalte, ihre Rechte, Mehrsprachigkeit und
Lebenszyklen werden in der Studie nicht technisch durchgesetzt. Die Beispiele
sind nicht mit den zehn redaktionell freizugebenden Alltagsrezepten aus
`06-entscheidungen.md` gleichzusetzen.

**Ein Artikel gehört dem Wiki, nicht einem Service.** Er beantwortet eine
Alltagsfrage, erklärt einen Zusammenhang, führt durch eine Aufgabe oder hilft
bei einem Problem. „Neues Gerät verwenden“, „Wer sieht meine Dateien?“ oder
„Wenn zu Hause etwas nicht erreichbar ist“ sind eigenständige Themen, auch
ohne zugehörige Anwendung. Mehrere Artikel können zu demselben Dienst passen;
ein Artikel kann mehrere Dienste betreffen. Die Beziehung ist ein **optionaler
Querverweis**, niemals Dateipfad, Navigationsbaum oder Pflichtfeld. Der
Dienststeckbrief nach A7 kommt aus Contract/Katalog und ist keine erfundene
Wiki-Anleitung. Artikel liegen redaktionell im Portal-Repository, nicht in
Nix-Contracts (`04-integrationen.md` §11).

**Vorläufiges Inhaltsmodell, vor Implementierung zu entscheiden und zu testen:**

| Feld / Beziehung | Aufgabe | Grenze |
|---|---|---|
| Stabile Artikel-ID, Slug je Sprache, Titel, Zusammenfassung | teilen, finden, Sprache wechseln; alte URLs per Redirect erhalten | URL ist kein Dienstname und keine Berechtigung |
| Art: Anleitung, Problembehebung, Erklärung, Referenz | verschiedene Lesemuster statt Einheitsrezept | nicht jeder Text braucht Schritte; ein Problemartikel nennt auch Nichtwissen und nächsten Schritt |
| Redaktionelle Themen, Suchbegriffe und Artikelbeziehungen | zusammenhängendes Wissen durchstöbern und Fragen ohne Produktnamen finden | keine leeren Pflichtkategorien; Beziehungen sind absichtsvoll, nicht aus Schlagworten geraten |
| Optional null bis mehrere Dienst-IDs | Artikel im *Kontext* einer Anwendung anbieten | kein eigenes Wiki je Dienst; Referenz muss gültig oder bewusst historisch sein; nicht angezeigte Dienste verraten keine Namen |
| Redaktionelle Sichtbarkeit, Zielgruppe, Voraussetzungen | öffentlichen Einstieg, Familienwissen und Betriebswissen unterscheiden | Dienst-`scope`/`audience` allein autorisiert keinen Artikel; Mehrdienst-Artikel dürfen keine fremden Angebote verraten |
| Redaktioneller Status, verantwortliche Person, geprüft am, Sprachstand | Entwurf, freigegeben, veraltet, zurückgezogen unterscheidbar halten | kein erfundenes Prüfdatum; veraltete Schritte nicht still als aktuell zeigen |
| Verweise auf verwandte Artikel und optional Vorgänger/Nachfolger | von Überblick zu Vertiefung und zurück | kein automatisches „verwandt“ aus Wörtern oder heimliches Duplikat |

**Informationsarchitektur:** `/knowledge/` ist eine eigenständige Bibliothek:
Suche nach Frage und Umgangssprache, Einstieg über Fragen/Situationen und
redaktionelle Themen, dazu für größere Sammlungen ein durchstöberbarer
Themenindex. Themen entstehen aus dem echten Inhalt und erscheinen nur mit
Artikeln. Suche zeigt *Wissensartikel* und *Anwendungen* unterscheidbar, sortiert
nicht alles in einer einzigen Trefferliste nach Produktnamen. Artikel sind unter
`/knowledge/<slug>/` eigenständig adressierbar, mit Brotkrumen, passenden
Querverweisen, Inhaltsverzeichnis bei längeren Texten und sichtbar gehaltenem
Stand. Ihr Aufbau folgt dem Inhalt: eine Erklärung braucht keine nummerierten
Schritte; eine Problemlösung braucht Entscheidungen und Auswege, nicht nur eine
Liste. `/services/<id>/` ist ein **zusätzlicher Einstieg** in passende Artikel;
dort erscheinen kontextuelle Hinweise, nicht ein zweites Wiki oder eine
parallele Inhaltsstruktur. Ein Dienst ohne Anleitung funktioniert weiterhin.
Öffentliche `/help/` beantwortet Anmeldefragen, ohne ein zweites Wiki zu werden;
von dort sind freigegebene öffentliche Artikel erreichbar. Interne Artikel
werden nicht durch eine bloße Menüentscheidung öffentlich.

**Agnostik-Test:** Das Wiki muss auch dann sinnvoll navigierbar sein, wenn kein
Artikel einem Service zugeordnet ist; wenn zu einem Service zehn Artikel
existieren; und wenn eine Aufgabe drei Anwendungen, ein Gerät und den Zugang
betrifft. Die Frage eines Menschen entscheidet den Einstieg, nicht die Anzahl
der Einträge im Dienstkatalog. Betriebswissen für Philipp darf im selben
Inhaltsmodell entstehen, aber nicht automatisch im selben öffentlichen Index.

**Szenarien, die der nächste Entwurf wirklich abbilden muss:**

| Situation | Erwarteter Weg | Kritische Probe |
|---|---|---|
| Familienmitglied weiß noch nicht, welche Anwendung es für einen Film braucht | Frage im Wiki → Anleitung mit Kontextlink → passende Anwendung | Einstieg funktioniert ohne Produktnamen; kein Wechsel auf den falschen Mediendienst |
| Familienmitglied kennt die Anwendung, braucht aber Hilfe bei einer Aufgabe | Anwendung → kontextueller Querverweis → eigenständiger Artikel | mehrere Artikel zu einer Anwendung, keine Kopie unter der Dienstseite |
| Jemand sucht „Drucker geht nicht“ statt den Dienstnamen | Suche/Problemthema → Problembehebung → erreichbarer nächster Schritt | verständliche Synonyme, Suche ohne Treffer, veraltete Statusdaten |
| Eine Person möchte ein neues Gerät verbinden oder verstehen, wer Zugriff hat | Thema → passender Artikel, ggf. Entscheidung nach Gerät oder Zielgruppe | auch ohne zugeordneten Dienst auffindbar; nicht jeder Gerätetyp hat denselben Weg |
| Eingeladener Gast öffnet einen geteilten Link | öffentlicher Artikel oder Anmeldung → genau dieser berechtigte Artikel | private Titel/Teaser dürfen vorher nicht leaken; abgelaufener Zugang |
| Ein Problem betrifft mehrere Angebote | ein gemeinsamer Artikel, von allen betroffenen Dienstseiten erreichbar | keine dreifach divergierenden Kopien; nur berechtigte Dienstbezüge sichtbar |
| Ein Dienst wird umbenannt, ersetzt oder abgeschaltet | gültige Verweise, Hinweis auf Nachfolger oder bewusst zurückgezogene Anleitung | keine kaputten Links oder Anleitung für nicht mehr vorhandene Oberflächen |
| Netz/Portal ist gestört | zuletzt verfügbare Hilfe nur, wo technisch unabhängig ausgeliefert | K4-Offline-Rezepte sind ein eigenes Vorhaben, keine Verfügbarkeitsbehauptung |

**Sicherheitsgrenze vor dem Bau:** Ein statisch vorgerendertes privates HTML,
eine öffentliche Suchindex-Datei, Vorschau, Sitemap oder Browser-Cache kann
Inhalte trotz verstecktem Menü verraten. Zugriffsentscheidung muss für HTML,
Suchdaten, Metadaten, API, Vorschau und Caches dieselbe sein; öffentliche Artikel
werden redaktionell eigens freigegeben. Wie private Inhalte trotz A1 ohne
JavaScript lesbar und nur für Berechtigte ausgeliefert werden, ist eine offene
Architekturfrage, nicht durch das Mockup entschieden. A7s generierter
Dienststeckbrief bleibt eine andere Sache als das Wiki; A8s Forderung „jeder
Artikel nennt eine [Dienst-]Kennung“ widerspricht dienstunabhängigen Artikeln
und muss vor Umsetzung ausdrücklich revidiert werden.
Erst mit geprüften Inhalten wird „Wissen“ ein produktiver Haupteintrag.

### Betrieb / Admin ist ein anderer Arbeitsmodus

Die Admin-Startansicht zeigt zuerst Abweichungen und überfällige Sorgfalt, nicht
noch einmal denselben Katalog. Sinnvolle Vertiefungen: Dienste und Abhängigkeiten
(I1/I2), Ereignisse und Historie (L2/N4), Sicherung und Ablaufdaten (C4/I4/P1),
Netzblick (T), Zugriffslandkarte (I5) und offene Vorgänge (N). Jede Zahl braucht
Quelle und Zeitpunkt. Änderungen am dauerhaften Zustand erfolgen weiter über
Nix/Contracts/PR; das Portal kann lesen, erklären und zum richtigen Arbeitsort
führen. Für einen echten Notfall gelten eigene, explizite Regeln (R3), nicht
„Admin darf alles im Browser ändern“.

## 4. Szenarien als Prüfkriterium für den Entwurf

| Person / Situation | Erwarteter Weg | Woran der Entwurf scheitern könnte |
|---|---|---|
| Eingeladene Person öffnet zum ersten Mal einen Link | `/` → Workspace → passende Anwendung; bei fehlendem Zugang `/help/` | Landing spricht nur über Technik; Login endet ohne Hilfsweg |
| Familienmitglied will einen Film sehen | Start/Anwendungen → „Medien“ → Dienst | Produktname statt Zweck, doppelter Einstieg, unklarer Zugriff |
| „Der Fernseher lädt nicht“ | Status aus Wirkungssicht → seit wann? → nächster Schritt | Host „online“, aber Dienst kaputt; Messung älter als gedacht |
| Gast erhält befristeten Zugang | öffentlicher Einstieg → Einweisung → erlaubte Inhalte | abgelaufene Einladung oder Rechtewechsel lassen alte Kacheln offen |
| Philipp erklärt das Projekt einem Interessierten | `/project/` → Prinzipien, Schichtbild, belegbare Trade-offs | zu viel Marketing oder automatisch veröffentlichte Betriebsdetails |
| Philipp ist unterwegs, Dienst gestört | Status → Abhängigkeiten → Runbook/Kontakt | Portal hängt selbst am defekten Dienst oder braucht internen Zugriff |
| Philipp prüft am Morgen das System | `/admin/` → Änderungen, Sicherung, Zertifikate, ausstehende Fälle | Dashboard zählt Hosts, zeigt aber keine Handlung oder Quelle |
| Eine Person meldet ein Problem | Kontext erfassen → Bestätigung → Verantwortliche/Status | Formular geht ins Leere, doppelte Tickets, personenbezogene Daten im Log |

## 5. Randfälle, die vor neuen Screens gestaltet werden müssen

1. **Identität unbekannt oder Sitzung abgelaufen:** Rückkehr zum *ursprünglichen*
   Ziel nach erneuter Anmeldung. Keine flackernden privaten Inhalte.
2. **Katalog vorhanden, Live-Status fehlt:** Dienste bleiben nutzbar; Zustand
   heißt „unbekannt“, mit Zeitpunkt des letzten belastbaren Wertes. `unknown`
   ist nie grün, `unmonitored` ist nicht „down“.
3. **Teilberechtigung:** Suche, Verweise, vorgerenderte Dienstseiten und APIs
   folgen derselben Freigabe. Kein „versteckt im Menü, aber per URL sichtbar“.
4. **Netz oder Portal ausgefallen:** Vorgerenderte öffentliche Hilfe bleibt
   erreichbar, sofern die Auslieferung selbst erreichbar ist; Offline-Rezepte
   (K4) sind ein eigenes Vorhaben. Keine unmöglichen Verfügbarkeitsversprechen.
5. **Lange Namen, kleine Geräte, Zoom 200 %, Tastatur, Screenreader, reduzierte
   Bewegung:** jede Kernhandlung bleibt erreichbar; die globale Suche bekommt
   einen mobilen Auslöser, keine Tastenkürzel-only-Funktion.
6. **Übersetzungen und Zeit:** DE/EN-Paare für öffentliches Portfolio und Hilfe;
   lokale Anzeige von Zeitpunkten, UTC als Vergleich; „vor 2 Minuten“ nur mit
   klarer Aktualisierung.
7. **Veröffentlichung:** Nur explizit freigegebene, redaktionelle Daten verlassen
   den privaten Bereich. Ein Feld im Katalog mit `public` ist noch keine
   Erlaubnis, Hostnamen, Adressen, Versionsstände oder Topologie zu publizieren.
8. **Neues Feature ohne echte Daten:** keine Demo-Zahlen, Beispiel-Dienste oder
   „Alles funktioniert“-Behauptungen im Produkt. Leere Flächen erklären, was
   fehlt und wie man weiterkommt.

## 6. Gestalterische Konsequenzen

- **Öffentlich:** kurze Sätze und eine sichtbare Handlung. Projekt und Hilfe
  sind redaktionelle Leseseiten; sie brauchen Typografie, Struktur und sinnvolle
  Diagramme statt ein Dashboard-Raster.
- **Hero-Bild:** Der System-Atlas deutet die belegte Grundstruktur aus
  Home, zwei Cloud-Hosts, mobilen Geräten und WireGuard-Mesh räumlich an. Lage,
  Größen und Abstände sind
  **illustrativ**, keine exakte Topologie, keine Dienstabhängigkeiten und keine
  Statusanzeige. Anzahl und Namen der Anwendungen bestimmen die Bildgeometrie
  nicht; konkrete Beispiele gehören in den Abschnitt darunter und werden
  redaktionell gegen den Katalog geprüft. Kein klickbarer Schein-Katalog und
  keine erfundene Verfügbarkeit.
- **Workspace:** schnell scannbare Listen für wiederholte Nutzung, Karten nur
  für tatsächlich getrennte Objekte. Status zeigt Wirkung + Zeit + Quelle.
- **Admin:** höhere Dichte, Sortierung, Filter, Vergleiche. Tabellen sind auf
  Desktop nützlich; mobil braucht jede kritische Aufgabe eine eigene Darstellung.
- **Gemeinsames System:** dieselbe Wortmarke, Schriftlogik, Farben, Abstände,
  Fokus- und Zustandsregeln. Nicht zwanghaft dieselbe Komponente für jeden Zweck.
- Die visuelle Studie in `design-concept.html` ist ein *Testbild*, keine
  Komponenten-Spezifikation. Ein Produktionsdesign braucht Tokens, Dark Mode,
  echte Inhalte und Tests mit Nutzern. Externe Fonts der Studie sind keine
  Produktionsentscheidung; G5 fordert Self-Hosting.

## 7. Vor Umsetzung zu verifizieren, nicht an Nutzer delegieren

1. Sind die drei öffentlichen Beispiele redaktionell gewollt und die wirklichen
   Zugangswege für Home Assistant, Jellyseerr und Mealie wie erwartet?
   Angebotsnamen aus dem Katalog sind belegbar; die Reichweite pro Gruppe nicht
   aus einem Screenshot.
2. Veröffentlichungsprüfung von `/portal.json`, vorgerenderten Dienstseiten,
   API-Endpunkten und Caches (E-0016). Die öffentliche UI allein ist kein Test.
3. Welche bestehende, betreute Kontaktmöglichkeit darf `/help/` nennen? Bis
   dahin **kein erfundenes Kontaktformular** und keine Hilfeversprechen.
4. Die Portfolio-Fallstudie erhält belegte Aussagen über NixOS, Contracts,
   Zugang, Mesh und Beobachtung aus der echten Konfiguration – keine realen
   Hostnamen, IPs, Gruppenlisten oder Secrets. `/etc/nixos` war in der
   Analyseumgebung nicht vorhanden; die Architektur ist deshalb noch nicht
   gegen die laufende Flotte verifiziert.
5. Ein realistischer Test mit Familienmitglied und einem technischen Leser:
   finden sie ohne Einführung eine Anwendung und den Weg bei einem Problem?

## 8. Zweite Entwurfsrunde: nicht nur den Idealzustand gestalten

Eine schöne Übersicht ist leicht zu zeichnen. Ob der Entwurf trägt, entscheidet
sich in den Zuständen, die Personen tatsächlich verunsichern. Die klickbare
Studie zeigt deshalb in der Statusansicht drei **umschaltbare, erfundene
Szenarien**: erreichbar, eine Störung, Messung fehlt. „Unbekannt“ darf nie wie
„ausgefallen“ aussehen; „erreichbar“ darf nie ohne belastbaren Zeitpunkt zur
Produktaussage werden. Die festen Uhrzeiten der Studie sind ausdrücklich
Illustration, keine Beobachtung.

Jede Ansicht beantwortet in dieser Reihenfolge vier Fragen:

1. **Was kann ich hier tun?** Eine Hauptaufgabe, keine Sammlung gleichwertiger
   Schaltflächen.
2. **Was weiß das System sicher?** Gemessen, deklariert, redaktionell erklärt
   oder zuletzt bekannt – diese Aussagen dürfen nicht dieselbe Beschriftung
   bekommen.
3. **Was betrifft mich?** Die Wirkung für die Person vor der technischen Ursache.
4. **Was ist der nächste Schritt?** Öffnen, später erneut versuchen, Hilfe
   lesen oder eine tatsächlich betreute Stelle kontaktieren.

### Zustandsvertrag für kritische Flächen

| Fläche | Geladen | Leer | Fehler/keine Antwort | Nur Teilzugriff |
|---|---|---|---|---|
| Start | Nutzbare Angebote, zuletzt, relevante Meldungen | Katalog-Einstieg statt leerer Favoriten-Box | Angebote bleiben nutzbar; Status „unbekannt“ | Nur eigene Angebote, keine Hinweise auf fremde Inhalte |
| Anwendungen | Zweck + Name + Zugriff + eindeutiger Aufruf | „Für dich ist noch nichts freigegeben“ + betreuter Weg | Katalogquelle benennen; keine fiktiven Kacheln | Suchindex und Detailadresse dürfen nichts zusätzlich offenbaren |
| Status | Wirkung + Zustand + gemessen um + nächste Handlung | „Keine überwachten Angebote“ statt „alles okay“ | Letzter bestätigter Stand und Alter, niemals grüne Nullwerte | Nur freigegebene Anwendungen, keine rohe Topologie |
| Wissen | Kurzanleitung + Vertiefung + Stand/Verantwortliche | Kein Hauptnavigationseintrag vor geprüften Inhalten | Vorgerenderte Texte bleiben lesbar, soweit auslieferbar | Öffentliche Artikel redaktionell freigegeben, interne nicht im Suchindex |
| Konto | Eigene Identität, Rechte in Klartext, Einstellungen | Hilfsweg bei fehlendem Profil | Kein fremder Verzeichniszustand aus altem Cache | Keine Gruppen anderer Personen oder Admin-Werkzeuge |
| Admin | Abweichungen nach Dringlichkeit + Quelle/Alter | „Keine bekannten Abweichungen“, nur bei vollständiger Messung | Quellen einzeln als unbekannt; keine pauschale Entwarnung | Serverseitige Prüfung, nicht nur verschwundener Menüpunkt |

### Konkrete UX-Prüfungen

- Familienmitglied mit `family`, aber ohne `media-users`: Kann es Rezepte
  öffnen, ohne Medien-Werkzeuge zu sehen, die nicht für es gedacht sind?
- Eine Person mit zwei Zugangsarten (öffentlich erreichbare URL, aber interne
  Netzfreigabe): Erklärt die Oberfläche **Zugriff** und **Erreichbarkeit** als
  unterschiedliche Dinge?
- Ein gemessener Dienst ist nicht erreichbar: Kann die Person innerhalb von
  zehn Sekunden unterscheiden, ob *dieser* Dienst oder das ganze Portal
  betroffen ist? Nennt der Screen den Zeitpunkt und eine sichere Alternative?
- Die Messquelle antwortet nicht: Wird „unbekannt“ angezeigt, ohne den zuletzt
  verlässlichen Stand zu überschreiben? Bleiben Anwendungslinks bedienbar?
- Ein geteilter Dienst-Link führt erst durch die Anmeldung: Kommt die Person
  danach genau zum beabsichtigten Dienst zurück, oder ist sie auf Start verloren?
- 390 px, 200 % Zoom, Tastatur, Screenreader, kein JavaScript: Sind die Wege
  „öffnen“, „Status verstehen“ und „Hilfe finden“ nachvollziehbar? Wo das
  Identität erfordert, wird die Grenze ehrlich erklärt.

## 9. Gestaltungsregeln vor einer Komponentenbibliothek

- **Typografie:** Leseseiten und Arbeitsansichten teilen Schriftfamilien, aber
  nicht zwingend dieselbe Zeilenlänge. Öffentliche Projekttexte höchstens etwa
  65–75 Zeichen pro Zeile; Status und Katalog brauchen scanbare Kurzzeilen.
- **Rangfolge:** Hauptaktion deutlich, sekundäre Handlung ruhig, technische
  Metadaten nachgeordnet. Ein Zähler bekommt nur Platz, wenn er eine Frage
  beantwortet oder eine Entscheidung auslöst.
- **Flächen:** Nicht jedes Thema wird eine Karte. Listen für häufige Aufgaben,
  Tabelle/Zeilen für vergleichbare Fakten, Lesetext für Fallstudie und Hilfe,
  Karten nur für eigenständige Einheiten.
- **Zustände:** Farbe unterstützt Text, ersetzt ihn nie. „Ausfall“, „Messung
  fehlt“ und „nicht überwacht“ haben getrennte Sprache und Zeichen. Stets
  Quelle und Alter, wenn eine Aussage von Live-Daten abhängt.
- **Responsive:** Mobil bekommt eigene Priorisierung und erreichbare globale
  Suche; keine abgeschnittene Wortmarke, keine überlaufenden Plaketten, keine
  nur horizontale Admin-Tabelle. Desktop darf im Betrieb dichter werden.
- **Bewegung:** Nur Zustandswechsel oder Navigation verdeutlichen. Kein
  automatischer Effekt, der Verfügbarkeit suggeriert. Reduzierte Bewegung und
  deutliche Fokuszustände gehören zum ersten Entwurf, nicht zum Finish.
- **Theme und Schriften:** Helles und dunkles Theme aus denselben semantischen
  Tokens; tatsächliche Produktionsschriften lokal ausgeliefert. Die externen
  Fonts der Designstudie sind kein Vorbild für die Produktarchitektur.

## 10. Wann die Gestaltung implementierungsreif ist

Vor dem Umbau der echten Oberfläche existieren für Landing, Projekt, Hilfe,
Start, Anwendungen und Status jeweils: primäre Frage, Inhaltsquelle,
Sichtbarkeit, leerer Zustand, Fehlerzustand, mobile Anordnung, Tastaturweg und
echter Verweis auf den nächsten Schritt. Für Admin/Konto gilt dasselbe, bevor
sie neu gestaltet werden; hübsche Platzhalter sind keine fertigen Routen.

Der erste nutzerseitige Durchgang muss ohne Erklärung schaffen: **eine passende
Anwendung öffnen** und **eine beispielhafte Störung von fehlenden Messdaten
unterscheiden**. Der erste technische Durchgang muss eine öffentlich
freigegebene Architektur-Erklärung nachvollziehen können, ohne echte
Betriebsdaten aus der Fallstudie zu beziehen. Vor dem Ausrollen ist die
Veröffentlichungsprüfung aus E-0016 ein eigener, nachweisbarer Arbeitsschritt.
