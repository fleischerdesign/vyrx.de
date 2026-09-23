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

## Offen

1. **Umfang der Wissensbasis.** Beginnt sie mit zehn Alltagsrezepten oder mit
   der vollständigen Dienstübersicht? *Vorschlag:* zehn Rezepte, sonst wird die
   Struktur vor dem Inhalt verhandelt.
2. **Wiki-Technik.** Astro-Inhaltssammlungen im selben Bau (einfach, ein
   Bauvorgang) gegen ein eigenes System mit Redaktionsoberfläche (mehr Aufwand,
   für Nicht-Techniker bequemer). *Vorschlag:* zuerst ersteres, weil der
   Inhalt im Pull-Request-Verfahren prüfbar bleibt.
3. **Favoriten server- oder clientseitig.** Heute `localStorage`, also geräteweise.
   *Vorschlag:* Favoriten serverseitig (D3), Zuletzt-Benutztes lokal — der
   Unterschied in der Erwartung ist real und darf sichtbar sein.
4. **Ankündigungen.** Eigene Datenquelle im Portal oder aus dem
   Benachrichtigungssystem des Netzes? *Vorschlag:* zuerst Datei im Repository
   (E1 klein halten), später ersetzen.
5. **Reichweite der Aktionen.** Bleiben Aktionen Administratoren vorbehalten,
   oder dürfen Nutzer eigene Warteschlangen steuern? *Vorschlag:* erst nur
   Administratoren, eigenes Recht später aus dem Verzeichnis.
6. **Versionierung der Endpunkte.** `/api/v1/…` einführen, solange es billig ist,
   oder stabil halten ohne Nummer? *Vorschlag:* Nummer einführen, bevor der
   erste Automat angebunden ist (P5).
7. **Sprache der Oberfläche.** Deutsch als Vorgabe präfixlos ist gesetzt;
   bleibt Englisch unter `/en/` ein vollwertiger Zweig oder ein Nebenweg?
   *Vorschlag:* vollwertig, geprüft per Paritätstest (H1).
8. **Wo wird die Sprachvollständigkeit geprüft?** Heute erzwingt der Contract
   Prosa in jeder Portal-Sprache (`contracts/endpoints/default.nix`), also zur
   Auswertungszeit vor dem Ausrollen. Nach der Schichtung aus
   `04-integrationen.md` §11 gehört die Prosa in die Darstellungsschicht, und
   die Prüfung zöge in den Bau dieses Repositories. *Vorschlag:* Prosa und
   Prüfung ziehen mit — eine Textänderung darf kein Flotten-Rebuild sein. Die
   weichere Garantie („bricht beim Bauen“ statt „bricht vor dem Ausrollen“)
   wird dafür bewusst in Kauf genommen.

9. **Ist der öffentliche Teil der Wissensbasis ohne Anmeldung erreichbar?**
   Sie ist der einzige Eintrag, der nicht-technische Nutzer ins Portal holt;
   hinter der Anmeldung wirkt sie auf genau diese Zielgruppe abschreckend.
   *Vorschlag:* Ja — Artikel mit Sichtbarkeit `public` sind ohne Anmeldung
   lesbar und aus dem Zustand `data-auth="out"` verlinkt; alles Interne bleibt
   hinter der Anmeldung.

10. **Wo lebt der eine Satz Zweck je Dienst?** („Filme und Serien im Haus“.) Im
   Contract wäre er eine Tatsache, die auch Alarmierung, Statusseiten und
   Übersichten lesen können — Preis: ein Satz Prosa bleibt in Nix und wird dort
   gepflegt. Im Portal (Darstellung) bliebe Nix frei von Prosa, aber die
   Alarmierung erführe nie, was der Dienst ist. *Vorschlag:* ein Satz Zweck in
   den Contract, die Anleitung nie — ein Satz ist eine Aussage über den Dienst,
   eine Anleitung eine über den Menschen davor.

