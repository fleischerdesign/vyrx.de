# 09 — Ausbau der Anwendung (Ziel und Reihenfolge)

Stand: 2026-09-26. Der Neubau steht (`08-ziel-rewrite.md`). Dieses Dokument
hält fest, **wie die App vollständig wird** - und zwar ohne Änderung an
`nixfiles`. Die Anbindung dort kommt erst, wenn hier alles fertig ist.

## 1. Ziel

Jede Ansicht und jede Fähigkeit ist fertig gebaut und läuft im
Entwicklungsbetrieb **gegen Beispieldaten**. Der Austausch gegen echte Quellen
ist danach ein Austausch des Lesers, kein Umbau der Oberfläche.

## 2. Das Rückgrat: benannte Quellen

Die App fragt nie ein Produkt, sondern eine Quelle. Jede Quelle liefert
dieselbe Form, egal ob Beispiel oder Wirklichkeit - deshalb prüft der
Entwicklungsbetrieb denselben Parser wie der Betrieb.

| Fakt | Modul | Beispiel heute | Später |
|---|---|---|---|
| Dienste, Kategorien, Freigaben, Verantwortliche, Abhängigkeiten | `lib/fleet.ts` | `fixtures/fleet.example.json` | Projektion aus `nixfiles` |
| Gemessener Zustand | `lib/status.ts` | `fixtures/status.example.json` (Prometheus-Form) | Kollektor |
| Statushistorie | `lib/status.ts` | `fixtures/status-history.example.json` | Kollektor (`query_range`) |
| Sicherungen, Zertifikate, Baumgesundheit | `lib/operations.ts` | `fixtures/operations.example.json` | `nixfiles` / Kollektor |
| Live-Werte und Aktionen je Dienst | `lib/adapters.ts` | `fixtures/adapters.example.json` | der Dienst selbst |
| Identität | `lib/identity.ts` | Kopfzeilen, Entwicklungsshim | Authentik |
| Wissen | `lib/knowledge.ts` | Content Collections | unverändert |
| Favoriten, Meldungen, Wartungsfenster | `lib/store.ts` | SQLite | unverändert |
| Ankündigungen | `lib/announcements.ts` | Datei im Repo | unverändert |

Regeln: kein Bildschirm kennt einen Produktnamen; jede Zahl nennt Quelle und
Zeitpunkt; fehlt eine Quelle, steht „unbekannt" und nichts anderes.

## 3. Reihenfolge

1. **Quellen-Schicht und reiche Beispiele** - das Rückgrat (dieses Dokument,
   §2). Ohne es hat jeder weitere Block keinen Platz.
2. **Zustand vertiefen** - Statushistorie, gruppierte Ansicht mit gemerktem
   Filter, Wartungsfenster statt Ausfall, sichtbarer Fehler mit „erneut
   versuchen".
3. **Adapter** - Live-Werte je Dienst und Kleinigkeiten auslösen, mit Recht und
   Protokoll.
4. **Betriebsansicht** (`/admin/` in Abschnitten) - Abweichungen, Sicherungen,
   Zertifikate, Ablaufregister, Zugriffslandkarte, Netzblick, Baumgesundheit.
5. **Komfort** - Verlauf, Merkliste, Präferenzen.
6. **Kommunikation** - Benachrichtigungen und Ruhezeiten.
7. **Zugang** - Profil, Sitzungen, Tokens.
8. **Kleinere Lücken** - Volltextsuche, geführter Rückweg vom Dienst.
9. **Reife** - Vertragstests der Endpunkte, Vorschau je Änderung.

## 4. Abnahme je Block

Ein Block ist fertig, wenn `npm run build` grün ist und der Weg im Browser in
**beiden Sprachen und auf beiden Größen** geprüft wurde - mit dem Fehlerfall,
nicht nur dem guten Fall.

## 5. Grenzen

- **Wissen bleibt intern.** Die Regel (`visibility`) bleibt bestehen, aber kein
  Artikel ist öffentlich; die Wissensbasis verlangt eine Anmeldung.
- Kein Bildschirm ändert den Nix-Zustand (J1, J2 bleiben verworfen).
- Keine erfundenen Werte: die Beispiele tragen ihre Herkunft sichtbar.
