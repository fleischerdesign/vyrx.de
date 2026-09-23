# 04 — Integrationssystem

Entwurf. Ziel: Dienste wie Jellyfin, Jellyseerr, SABnzbd und die übrigen
Werkzeuge werden aus dem Portal heraus **angesprochen**, nicht nur angezeigt —
und zwar über ein Format, das keinen Dienstnamen im Code kennt.

## 1. Ziele und Nicht-Ziele

**Ziele**

1. Ein neuer Dienst ist eine Dateneingabe, keine Codeänderung.
2. Der Browser sieht niemals ein Geheimnis des Dienstes.
3. Ein langsamer oder ausgefallener Dienst schadet den anderen nicht.
4. Aktionen sind nachvollziehbar: wer, was, wann, mit welchem Ergebnis.

**Nicht-Ziele**

1. Kein Ersatz für die Oberflächen der Dienste. Das Portal startet und deutet
   an; die Tiefe bleibt beim Dienst.
2. Keine allgemeine Fernsteuerung. Aktionen sind ausdrücklich aufgeführt,
   nicht abgeleitet.
3. Keine zweite Rechteverwaltung. Rollen und Gruppen kommen aus dem Verzeichnis.

## 2. Begriffe

| Begriff | Bedeutung |
|---|---|
| **Dienst** | ein erreichbares Angebot (Jellyfin, SABnzbd, ein Wiki) |
| **Deskriptor** | die Beschreibung des Dienstes als Datensatz |
| **Adapter** | serverseitiges Stück Code, das einen Diensttyp versteht |
| **Zustand** | `up`, `degraded`, `down`, `unknown`, `unmonitored` plus Messzeitpunkt |
| **Aktion** | benannte Handlung am Dienst (`pause-queue`, `restart`) |

## 3. Deskriptor

Der Deskriptor ist die einzige Stelle, an der ein Dienst vorkommt. Die
Oberfläche liest nur diese Felder.

```json
{
  "id": "sabnzbd",
  "name": { "de": "Download-Warteschlange", "en": "Download queue" },
  "category": "media",
  "icon": "download",
  "url": "https://sabnzbd.example.invalid/",
  "visibility": "internal",
  "roles": ["server"],
  "audience": ["adult"],
  "auth": { "mode": "sso", "entry": "/outpost.goauthentik.io/start?rd=<url>" },
  "health": { "adapter": "sabnzbd", "endpoint": "http://sabnzbd:8080", "interval": 30 },
  "actions": [
    { "id": "pause-queue", "label": { "de": "Warteschlange pausieren" }, "role": "admin" }
  ]
}
```

Regeln:

- `name` und `label` sind übersetzt; fehlt eine Sprache, greift `de`.
- `url` zeigt nach außen (SSO-Eingang), `health.endpoint` nach innen (Adapter).
- `visibility` und `roles` nutzen das bestehende Modell aus dem Katalog.
- `auth.mode` ist `sso`, `none` oder `delegated` (der Dienst meldet selbst).
- Aktionen tragen die Rolle, die sie verlangt. Ohne Rolle: nur Administratoren.

## 4. Adapter-Vertrag

Ein Adapter läuft **serverseitig** und hat genau eine Aufgabe:

```ts
// Eingabe: der Deskriptor und die Umgebung. Ausgabe: Zustand und Werte.
type Adapter = (input: { endpoint: string; secrets: Record<string, string> }) =>
  Promise<{ state: "up" | "degraded" | "down"; metrics?: Record<string, number | string>; message?: string }>;
```

- **Zeitlimit** je Adapter (Vorgabe 3 s), danach `unknown` — nie ein hängender
  Aufruf, nie ein blockierter Seitenaufbau.
- **Kein Durchreichen von Fehlern im Original.** Antworten des Dienstes werden
  übersetzt, nicht zitiert; sonst leckt die Konfiguration nach außen.
- **Ein Ausfall isoliert.** `/api/services` antwortet auch dann, wenn die Hälfte
  der Adapter schweigt.
- **Keine Geheimnisse im Browser.** Zugangsschlüssel kommen aus der
  Bereitstellungsumgebung, nie aus dem Katalog-Export.
- **Nur feste Fragen.** Der Aufrufer kann wie bei Prometheus keinen beliebigen
  Ausdruck stellen.

## 5. Zustandsmodell

- Ein Zustand besteht aus **Wert** und **Zeitpunkt**; `unknown` ohne Zeitpunkt
  ist ein Fehler im Adapter, kein Zustand.
- `degraded` bedeutet: erreichbar, aber mit Einschränkung (Warteschlange
  gestaut, Transkodierung überlastet). Der Grund gehört in `message`.
- `unmonitored` ist ein bewusster Eintrag im Katalog, kein fehlender Adapter.
- Werte sind Zahlen oder kurze Zeichenketten. Große Verläufe gehören nicht in
  die Antwort, sondern in die Diagramm-Quelle.

## 6. Aktionen

- Jede Aktion ist **erklärt** (was passiert), **bestätigt** (zweiter Schritt)
  und **protokolliert** (wer, wann, Ergebnis).
- Wirkung nur über einen serverseitigen Aufruf mit eigener Rechteprüfung; die
  Oberfläche ist keine Sicherheitsgrenze.
- Nach der Aktion wird der Zustand neu geholt, nicht geraten.
- Keine Aktion ist stillschweigend erfolgreich: Ergebnis oder Fehler erscheinen
  als Meldung.

## 7. Anmeldung und Rückweg

Der Aufruf führt über den Outpost (`auth.entry`) direkt in den Dienst, mit
`rd` auf das Ziel. Der Rückweg ist eine feste Adresse in der Kopfzeile des
Dienstes oder ein Lesezeichen im Portal — er darf nicht von der Zurück-Taste
abhängen.

## 8. Beispiele

- **Jellyfin** — Zustand aus `/System/Info/Public` (erreichbar, Version),
  Kennzahlen aus `/Sessions` (aktive Wiedergaben). Aktionen: keine.
- **Jellyseerr** — Zustand aus `/api/v1/status` (Version, Anmeldung), Kennzahlen
  aus offenen Anfragen (`pending`, `processing`). Aktionen: Anfrage
  zurückziehen (Rolle `user`).
- **SABnzbd** — Zustand aus `api?mode=queue` (Warteschlange, Tempo, Fehler),
  Aktionen: `pause-queue`, `resume-queue`, `restart` (Rolle `admin`).
- **Reihe „Bewachung“ (Radarr/Sonarr)** — Zustand aus `/api/v3/health`,
  Kennzahlen aus der Warteschlange (`queue`), Aktionen: Suche anstoßen.

Die Namen stehen in den Deskriptoren, nicht in diesen Abschnitten im Code. Wer
die Adapter schreibt, kennt die Dienst-API; wer die Oberfläche baut, muss sie
nicht kennen.

## 9. Randfälle

- Dienst erreichbar, Anmeldung falsch → `degraded` mit Hinweis auf die
  Anmeldung, nicht `up`.
- Zwei Deskriptoren mit gleicher Kennung → der Bau bricht ab.
- Deskriptor verweist auf unbekannten Adapter → Zustand `unknown`, Hinweis in
  der Admin-Ansicht, kein Absturz.
- Uhrzeiten: Zustandszeitpunkte werden in der Zeitzone des Betrachters
  gezeigt, verglichen wird in UTC.
- Rechtewechsel während der Sitzung: Beim nächsten Abruf greift die neue
  Berechtigung; eine Aktion aus einem alten Tab wird serverseitig abgelehnt.

## 10. Etappen

1. **Deskriptoren ohne Adapter.** Katalog mit Anzeige, Direktaufruf und
   statischem Zustand aus Prometheus. (bewusst klein)
2. **Erste Adapter** für zwei Dienste, `/api/services` mit Isolation und
   Zeitlimit, Oberfläche unverändert.
3. **Aktionen** mit Bestätigung, Protokoll und Rechteprüfung.
4. **Dienstübergreifende Suche** auf derselben Adapter-Schicht.
## 11. Schichtung: Contract, Katalog, Darstellung

Die Abschnitte 3 bis 6 setzen voraus, dass die Deskriptoren irgendwoher kommen.
Woher, ist keine Frage des Portals — und genau hier entsteht die falsche
Kopplung. Dieser Abschnitt trennt sie.

### 11.1 Die Regel

> Ein Service-Contract trägt keine Darstellung; eine Darstellung nennt keinen
> Contract-Inhalt, den sie nicht ableiten kann.

Sie ist das Gegenstück zu der Regel, die in `fleischerdesign/nixfiles` bereits
gilt: „a service contract carries no addresses; a host carries no service
names“ (`docs/practices.md` §1, Begriff *agnostisch*). Bisher fehlte die dritte
Schicht der Regel.

### 11.2 Drei Schichten

| Schicht | Besitzt | Leser | Darf nicht |
|---|---|---|---|
| **Contract** (`nixfiles`) | Identität, Absicht, Fakten | Prometheus, DNS, Ingress, Sicherung, Portal | Darstellung, portal-eigene Felder, fremde Namen oder Adressen |
| **Katalog** (`portal.json`, generiert) | nichts — reine Ableitung | das Portal | selbst etwas behaupten |
| **Darstellung** (dieses Repository) | Prosa, Reihenfolge, Symbol, Sichtbarkeitsentscheidung | nur das Portal | Adressen, Ports, Rollen, Telemetrie |

Der Katalog entsteht heute in `nixfiles`
(`features/services/vyrx-landing/default.nix`); die Darstellung gehört
hierher.

### 11.3 Feld für Feld, mit „wer liest das?“

Grundlage ist der `dashboard`-Block in `contracts/endpoints/default.nix`.

| Feld | Leser | Wohnort | Begründung |
|---|---|---|---|
| `id` (Endpunktname) | Prometheus, DNS, Blueprint, Portal | Contract | geteilte Identität, abgeleitet statt wiederholt |
| `scope`, `audience` | Ingress, Identität, Portal | Contract | Absicht des Dienstes |
| Ports, Adressen, OIDC | Ingress, Dienst | Contract | Fakten |
| `dashboard.show` | nur Portal | Darstellung | Sichtbarkeitsentscheidung der Anzeige |
| `dashboard.displayName[locale]` | nur Portal | Darstellung | Prosa |
| `dashboard.description[locale]` | nur Portal | Darstellung | Prosa |
| `dashboard.category` | heute nur Portal | Darstellung, bis ein zweiter Leser existiert | „who reads this?“ |

Außerdem: `contracts/` nennt heute `my.portal.locales` und kennt damit das
Portal. Die Abhängigkeit zeigt nach innen; sie sollte nach außen zeigen.

### 11.4 Invarianten und ihre Prüfer

- **I-1 — Eine Deklaration je Fakt.** Der Endpunktname existiert genau einmal,
  alles andere wird abgeleitet. *Prüfer:* Registrierung in `lib/endpoints.nix`
  und `nix flake check`.
- **I-2 — Sprachvollständigkeit.** Jede sichtbare Kachel hat Prosa in jeder
  Portal-Sprache. *Prüfer:* der Bau dieses Repositories; ersetzt die Assertion
  in `contracts/endpoints/default.nix`.
- **I-3 — Kein verwaister Schlüssel.** Jeder Schlüssel der Darstellung
  existiert im Katalog. *Prüfer:* Bau dieses Repositories, bricht ab.
- **I-4 — Keine Gegenabhängigkeit.** `contracts/` nennt kein `my.portal.*`.
  *Prüfer:* eine Textsuche in `nix flake check`.
- **I-5 — Keine Adressen in der Darstellung.** Die Darstellungsschicht hat ein
  geschlossenes Schema ohne Ports oder Hostnamen. *Prüfer:* Schemaprüfung.

### 11.5 Gewinn und Grenze

Gewinn: Eine Textänderung ist ein Commit in diesem Repository statt eines
Flotten-Rebuilds; der Contract verliert ein Feld mit genau einem Leser; die
Prüfung bleibt und wandert nur.

Grenze, offen benannt: Die geteilte Kennung bleibt — sie ist Identität, nicht
Kopplung. Und I-2 zieht von der Auswertungszeit in den Bau: heute fällt eine
fehlende Sprache vor dem Ausrollen auf, künftig beim Bau dieses Repositories.
Die Entscheidung dazu steht in `06-entscheidungen.md`.

