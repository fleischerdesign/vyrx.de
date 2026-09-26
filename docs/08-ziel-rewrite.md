# 08 — Ziel und Plan: Neubau der Webapp

Stand: 2026-09-26. Dieses Dokument hält fest, **wohin** die neue App gebaut wird
und **woran** ein Fortschritt gemessen wird. Es ist kein Produktversprechen,
sondern die Arbeitsgrundlage für den Neubau.

## 1. Ziel

VYRX wird als eigenständige Webapp **vollständig neu geschrieben** – nicht
umgebaut. Die bestehende App wird nicht wiederverwendet. Maßstab ist das
Gestaltungskonzept in `design-concept.html`, die Prinzipien aus
`docs/practices.md` (nixfiles) und `docs/README.md`:

> akademisch professionell · clean · solid · dry · konsistent · agnostisch

Konkret für die App:

- **Astro Best Practices:** Datei-Routing, Inseln statt Monolithen, Content
  Collections für redaktionelle Inhalte, TypeScript strikt.
- **DRY:** jede Tatsache genau eine Deklaration; Ableitungen statt Kopien.
- **Agnostisch:** die Oberfläche kennt Katalogformen, keine Produktnamen.
- **Konsistent:** ein Token-System, ein Komponentensatz, eine Sprache je Begriff.
- **Solid:** Fehler und Unbekanntes sind sichtbare Zustände, keine leeren Flächen.
- **Wiederverwendbar:** UI-Primitive einmal, statt je Ansicht neu.

## 2. Datenmodell (fünf Quellen, klar getrennt)

| Quelle | Liefert | Wohnort |
|---|---|---|
| `nixfiles`-Projektion (`fleet.json`) | Dienste, Kategorien, Freigaben, Revision | zur Laufzeit gelesen, **nie** an den Browser |
| Authentik (Header) | Identität und aktuelle Gruppen | pro Anfrage |
| Prometheus | gemessener Zustand + Zeitpunkt | serverseitig abgefragt |
| `vyrx.de`-Repo | Prosa, Wiki-Artikel, Reihenfolge, Symbol | redaktionell |
| Browser | nur Interaktion (Suche, Filter, Sprache) | flüchtig |

Entscheidung: **kein öffentliches `portal.json`.** Öffentliche Seiten sind
redaktionell und werden vorgerendert; alles Personenbezogene wird serverseitig
autorisiert ausgeliefert. Der Zugriff entscheidet sich für HTML, JSON, Suche,
Sprachvariante und Direktadresse nach derselben Regel.

Rechteänderungen (Gruppen in Authentik) wirken **ohne** Rebuild. Eine
`nixfiles`-Änderung wirkt nach deren Ausrollen; „gebaut" gilt nie als
„ausgerollt". Die ausgelieferte Revision ist sichtbar.

## 3. Testen ohne `nixfiles`

Der Neubau darf das `nixfiles`-Repository nicht verändern. Deshalb:

- `fixtures/fleet.example.json` – eine vollständige, erfundene Projektion mit
  mehreren Diensten, Kategorien und Freigaben.
- `PORTAL_FLEET` zeigt auf eine beliebige Projektionsdatei (Standard im
  Entwicklungslauf: das Fixture).
- `PORTAL_DEV_USER` / `PORTAL_DEV_NAME` / `PORTAL_DEV_GROUPS` erzeugen im
  Entwicklungslauf eine Identität, damit Ansichten ohne Authentik prüfbar sind.
  Diese Wege greifen **nur**, wenn ausdrücklich gesetzt; sonst zählt der
  Proxy-Header.

## 4. Meilensteine und Abnahmekriterien

Jeder Meilenstein gilt erst als fertig, wenn `npm run build` grün ist und die
Wege im Browser in **DE und EN, Desktop und Mobil** geprüft wurden.

1. **Fundament** — Tokens, Basisstile, Primitive, Layouts, Sprach-Routing,
   Katalog- und Identitätsschicht, Fixture, Tests für Autorisierung.
2. **Öffentlich** — Einstieg, Projekt, Hilfe; vorgerendert, ohne Betriebsdaten.
3. **Workspace** — Start, Anwendungen, Status, Konto; serverseitig autorisiert.
4. **Wissen** — Übersicht, Themen, Suche, Artikelseite, Querverweise; Artikel
   unabhängig vom Dienstkatalog, Dienstbezug optional.
5. **Betrieb** — Admin (nur für Berechtigte), Revisionsanzeige.
6. **Abnahme** — Barrierefreiheit, Druck, Tastatur, leere/gestörte Zustände,
   Negativtests Gast/Nutzer A/Nutzer B/Admin.

## 5. Bewusst nicht in diesem Schritt

- keine Änderung an `nixfiles` (nur die Schnittstelle wird vorbereitet),
- keine serverseitig gespeicherten Favoriten (brauchen eine Datenbank),
- keine erfundenen Live-Werte: fehlt die Messung, steht „unbekannt".

## 6. Die Schnittstelle zu `nixfiles`

Die App erfindet keine Dienste: sie liest eine **Projektion**, die `nixfiles`
aus Topologie und Contracts ableitet. Diese Datei ersetzt das alte, öffentliche
`portal.json`. Sie wird **zur Laufzeit** gelesen (`PORTAL_FLEET`), erreicht
**nie** den Browser und trägt keine Adressen oder Zugangsdaten.

```jsonc
{
  "schema": 1,
  "revision": "<revision der nixfiles-Konfiguration>",
  "generatedAt": "<ISO-Zeitpunkt>",
  "locales": ["de", "en"],
  "adminGroups": ["infra-admins"],
  "categories": [{ "id": "media", "label": { "de": "Medien", "en": "Media" }, "order": 20 }],
  "services": [
    {
      "id": "media-requests",              // stabiler Slug, lowercase
      "name": { "de": "…", "en": "…" },
      "summary": { "de": "…", "en": "…" },
      "categoryId": "media",
      "icon": "play",                      // optional; unbekannt = neutrales Symbol
      "scope": "public",                   // public | internal | mesh | isolated
      "accessGroups": ["family"],          // leer = für alle angemeldeten sichtbar
      "adminGroups": [],                   // Gruppen, die den Dienst verwalten
      "url": "https://…",                  // das Ziel, nicht die Adresse des Hosts
      "monitored": true                    // ob es überhaupt eine Messung gibt
    }
  ]
}
```

Regeln, die für beide Seiten gelten:

1. **Ein Fakt, eine Deklaration.** Dienste, Kategorien und Freigaben entstehen
   im Contract; die App liest sie nur.
2. **Kein Adressbuch.** Hostnamen, IPs, Ports und Topologie gehören nicht in
   die Projektion - die Ansicht braucht sie nicht.
3. **Gebaut ist nicht ausgerollt.** Die App zeigt die Revision, die sie
   tatsächlich liest; sie behauptet keinen Zustand der Flotte.
4. **Personen sind keine Konfiguration.** Gruppenmitgliedschaften bleiben in
   Authentik und wirken ohne Rebuild; die Projektion nennt nur, *welche* Gruppe
   einen Dienst öffnet.
5. **Zustand ist eine Messung.** `monitored`, `up`/`down`/`unbekannt` kommen
   aus dem Kollektor, nie aus der Projektion.

