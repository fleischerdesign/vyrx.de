# 11 — Medien: Suche, Vorschläge und Anfragen

**Status: Phase 1 live. Phase 2 (Movie-Anfragen) ist scharf; der erste echte
Request/Canary steht noch aus.**

## 1. Kurzbefund

1. **Der Seerr-API-Key liegt in SOPS.** Er steht als
   services/media/seerr_api_key und wird dem Portal als Systemd-Credential
   seerr-key übergeben. services.apps.seerr_oidc_secret bleibt davon getrennt:
   das ist das OIDC-Client-Geheimnis für Authentik, kein API-Key. Die
   vorhandenen services.media.*-Keys gehören zu Radarr, Sonarr, Prowlarr und
   SABnzbd, nicht zu Seerr.
2. **Das Portal kennt heute keine E-Mail.** `Identity` liest
   `X-Authentik-Username`, `-Name` und `-Groups`. Caddy kopiert zusätzlich
   `X-Authentik-Email` und `X-Authentik-Uid`; das Portal muss sie aufnehmen,
   sonst ist ein sauberes Mapping nur über den Benutzernamen möglich.
   Seerr nutzt denselben Authentik-Provider; OIDC-Nutzer werden dort mit
   `email` und `preferred_username` angelegt. Das ist der natürliche
   Zuordnungsschlüssel.
3. **Der richtige Hebel ist `X-Api-User`.** Seerr akzeptiert neben
   `X-Api-Key` den Header `X-Api-User: <seerrUserId>` und handelt dann als
   dieser Nutzer. Damit werden Suche, Quota, Berechtigungen und die Anfrage
   selbst unter der richtigen Person ausgeführt. Der API-Key bleibt ein
   serverseitiges Admin-Geheimnis; der Browser sieht ihn nie.
4. **Sichtbarkeit ist nicht Berechtigung.** Der Portaldienst
   `media-requests` ist für `family` **und** `media-users` sichtbar; Seerr
   selbst ist nur für `media-users` freigegeben. Eine Medienaktion muss
   deshalb zusätzlich `media-users` und ein vorhandenes Seerr-Mapping
   verlangen. Ein reiner `family`-Nutzer darf suchen, aber nicht anfragen —
   oder sieht gar keinen Schreibzugang.
5. **Composio ist hier nicht installiert.** `command -v composio` schlägt
   fehl; es wurde nichts installiert und keine Anmeldung versucht. Für einen
   self-hosted Seerr ist die native REST-API der direkteste Weg. Composio
   bleibt für andere externe Apps eine Option, nicht für diesen Dienst.

## 1a. Umgesetzt (Phase 1, read-only)

- `Identity` liest jetzt `email` und `uid` aus `X-Authentik-Email` und
  `X-Authentik-Uid`.
- `media_user` speichert die eindeutige Zuordnung Portal-Person → Seerr-ID.
  `media-users` ist Pflicht; ein reiner `family`-Nutzer erreicht Seerr nicht.
- Der Seerr-Client setzt bei jedem Aufruf `X-Api-Key` und `X-Api-User`.
  Suchparameter werden als `%20` kodiert, nicht als `+`; Seerr lehnt
  `+`-Leerzeichen mit 400 ab. Bei `Titel (Jahr)` fällt die Suche auf den
  Titel zurück und filtert auf das Jahr.
  Lesende GETs werden bei 5xx/Netzfehlern genau einmal wiederholt; POSTs
  werden nie blind wiederholt.
- Der Mediendienst wird über die Fleet-ID gefunden: Produktion heißt er
  `jellyseerr`, die lokale Fixture `media-requests`; beide werden unterstützt.
  Das war die Ursache für das frühere `not_visible`.
- Assistent-Werkzeuge: `media_search`, `media_discover`, `media_title`.
- Native Medienkarten mit Poster-Proxy, Status, Jahr und Kurztext. Die Karte
  bleibt bewusst ruhig: Ein Klick öffnet ein Modal (Desktop) bzw. ein
  Bottom-Sheet (Mobil) mit Backdrop, Poster, Beschreibung, Status und
  „Anfragen“; der Request läuft über den bestätigten Flow. Beim Öffnen lädt
  `/api/media/title` Laufzeit, Tagline, Genres, Regie, Cast,
  Bewertungsanzahl und – wenn vorhanden – den YouTube-Trailer nach. Der
  Trailer liegt als Play-Overlay auf dem Backdrop, nicht als Textlink.
- Geprüft: Suche *Dune*, Trending, Quota und eigene Requests read-only;
  `X-Api-User: 2` liefert philipp, `X-Api-User: 3` Kugelblitz82.
- **74 Tests** und vollständiger Build grün.

Phase 1 ist live. Phase 2 ist implementiert, aber noch nicht scharf; TV-Staffeln,
Cancel und Jellyfin-Personalisierung folgen danach.

## 1b. Phase 2 scharf (Movie-Anfragen)

Die schreibende Strecke ist implementiert und über
`PORTAL_MEDIA_REQUESTS=on` aktiv:

- `media_proposal` speichert Actor, Payload, Ablauf und Einmaligkeit.
- `media_propose_request` prüft Mapping, Status, Quota und legt nur einen
  Vorschlag an; es schreibt nicht.
- Die `confirm`-Karte zeigt Titel, Jahr, Status und Konto mit
  „Anfragen“/„Abbrechen“.
- `POST /api/media/request` ist die einzige Schreibstelle. Sie beansprucht das
  Proposal **vor** dem Seerr-Aufruf, setzt `X-Api-User` und schreibt
  `{mediaType:'movie', mediaId, is4k:false}`.
- 409/403/429/Timeout: kein blinder Retry; nach Timeout werden die eigenen
  Requests geprüft, sonst „unklar“.
- Audit und Rate Limit (3/Minute, 20/Tag) sind eingebaut.
- Mit einem Mock-Seerr end-to-end geprüft: Confirm → POST → 201, Header
  `X-Api-User: 2`, Body `mediaId: 438631`; kein echter Schreibzugriff.
- **74 Tests** und der vollständige Build sind grün.

**Der erste echte Request steht noch aus:** Der Flow ist aktiv, aber noch mit
keinem realen Film/User durchgespielt. Der Mock-End-to-End-Test ist grün.

## 2. Ziel

Der Assistent soll im Medienbereich nicht nur suchen, sondern **den nächsten
Schritt** anbieten:

- „Ist *Dune: Part Two* schon da?“
- „Was läuft heute im Trend?“
- „Etwas wie *Arrival*, aber heute verfügbar.“
- „Ein Familienfilm, höchstens 110 Minuten.“
- „Was kommt bald?“
- „Bitte *Dune: Part Two* anfragen.“
- „Was habe ich angefragt?“
- „Ist meine Anfrage schon durch?“

Der Assistent darf **vorschlagen** und **vorbereiten**. Die eigentliche
Anfrage passiert erst nach einer expliziten Bestätigung durch die Person.

## 3. Identität und Mapping

### 3.1 Portal-Identität erweitern

`Identity` bekommt `email` und optional `uid`:

```ts
interface Identity {
  username: string;
  name: string;
  email: string | null;
  uid: string | null;
  groups: readonly string[];
}
```

Quellen: `X-Authentik-Email`, `X-Authentik-Uid` (Caddy kopiert beide bereits).
Wenn die Kopfzeile fehlt, bleibt `email` `null`; das ist ein sichtbarer
Zustand, kein stiller Fallback.

### 3.2 Seerr-Nutzer finden

Mit dem Admin-API-Key (ohne `X-Api-User`) einmalig bzw. cachebar:

```http
GET /api/v1/user?take=50&q=<email>
X-Api-Key: <secret>
```

Reihenfolge der Zuordnung:

1. `seerr.email` exakt und case-insensitiv gleich `identity.email`.
2. `seerr.username` oder `seerr.jellyfinUsername` gleich
   `identity.username` (bevorzugt `preferred_username` aus Authentik).
3. Falls die User-Antwort eine OIDC-Verknüpfung mitliefert:
   `linkedAccounts.sub === identity.uid` (nur wenn der Authentik-Outpost
   `X-Authentik-Uid` mit dem OIDC-`sub` gleichsetzt; das ist zu verifizieren,
   nicht anzunehmen).
4. Explizite Zuordnung in der Portal-Datenbank.

Bei **null Treffern** oder **mehreren Treffern** wird nicht geraten. Die
Aktion endet mit `not_linked`; die Oberfläche erklärt, dass das Seerr-Konto
noch verknüpft werden muss.

### 3.3 Zuordnung speichern

Neue Tabelle `media_users` in `portal.sqlite`:

```sql
CREATE TABLE IF NOT EXISTS media_users (
  portal_username TEXT PRIMARY KEY,
  seerr_user_id   INTEGER NOT NULL,
  seerr_email     TEXT,
  seerr_username  TEXT,
  verified_at     TEXT NOT NULL
);
```

Die Zuordnung gehört zur Portal-Identität, nicht zur Sitzung. Sie wird beim
ersten erfolgreichen Match geschrieben und kann im Konto sichtbar gemacht
werden („Seerr: verknüpft als …“).

### 3.4 Jeder Seerr-Aufruf läuft als diese Person

Nach dem Mapping wird **jeder** Seerr-Aufruf für diese Person mit beiden
Headern gesetzt:

```http
X-Api-Key: <secret>
X-Api-User: <seerr_user_id>
```

Damit gilt:

- `GET /search`, `GET /discover/*`, `GET /movie/:id` sehen die Welt aus Sicht
  dieser Person (Sprache, Region, Freigaben, vorhandene Requests).
- `POST /request` legt die Anfrage unter dieser Person an; Seerr prüft deren
  `REQUEST`-Rechte und Quota.
- `GET /request` liefert die eigenen Anfragen.
- `DELETE /request/:id` darf nur eigene, noch offene Anfragen entfernen.

Der Header wird **ausschließlich serverseitig** aus der Zuordnung gesetzt.
Ein vom Browser gelieferter `seerrUserId` wird ignoriert.

### 3.5 Kein Fallback auf den Admin

Wenn kein Mapping existiert, wird **nicht** mit dem API-Key-Besitzer
(id 1) angefragt. Das würde die Anfrage unter der falschen Person verbuchen.
Die einzig richtige Antwort ist: „Dein Seerr-Konto ist nicht verknüpft.“

## 4. Berechtigungen

- Portal: `media-users` ist Pflicht für jede Medienaktion. Die Sichtbarkeit
  des Dienstes über `family` genügt nicht.
- Seerr: Die Zielperson braucht `REQUEST` (32) bzw. `REQUEST_MOVIE` (262144)
  oder `REQUEST_TV` (524288). Seerr prüft das selbst; ein 403 wird als
  verständlicher Fehler gezeigt.
- 4K: `is4k` nur mit `REQUEST_4K`/`REQUEST_4K_MOVIE`; in v1 immer `false`.
- Quota: `GET /api/v1/user/:id/quota` liefert Movie/TV-Limits und Verbrauch.
  Seerr erzwingt sie; die Oberfläche warnt vor dem Bestätigen.
- Auto-Approve: Ob eine Anfrage `pending` oder direkt `approved` wird,
  entscheidet Seerr aus den Rechten der Zielperson. Das Portal zeigt den
  resultierenden Status, es ahmt ihn nicht nach.
- Freigaben/Decline bleiben Verwaltung und Seerr; der Assistent bekommt
  keine Admin-Aktion.

## 5. Was Seerr bereits kann

Seerr ist nicht nur ein Request-Formular; die API liefert Suche und
Discovery:

| Zweck | Endpunkt |
|---|---|
| Multi-Suche (Film/Serie/Person) | `GET /api/v1/search?query=…&language=de` |
| Trends | `GET /api/v1/discover/trending?mediaType=movie&timeWindow=week` |
| Filme entdecken | `GET /api/v1/discover/movies?page=1&sortBy=popularity.desc&genre=…` |
| Serien entdecken | `GET /api/v1/discover/tv?…` |
| Kommende Filme | `GET /api/v1/discover/movies/upcoming` |
| Kommende Serien | `GET /api/v1/discover/tv/upcoming` |
| Ähnliche Filme | `GET /api/v1/movie/:id/similar` |
| Empfehlungen | `GET /api/v1/movie/:id/recommendations` |
| Filmdetails | `GET /api/v1/movie/:id` |
| Seriendetails | `GET /api/v1/tv/:id` |
| Anfrage | `POST /api/v1/request` |
| Eigene Anfragen | `GET /api/v1/request?take=…` |
| Anfrage löschen | `DELETE /api/v1/request/:id` |
| Nutzer/Quota | `GET /api/v1/user/:id`, `GET /api/v1/user/:id/quota` |

Wichtige Enums (aus Seerr):

- `MediaType`: `movie`, `tv`
- `MediaRequestStatus`: `1 pending`, `2 approved`, `3 declined`,
  `4 failed`, `5 completed`
- `MediaStatus`: `1 unknown`, `2 pending`, `3 processing`,
  `4 partially available`, `5 available`, `6 blocklisted`, `7 deleted`

`MediaRequestBody`:

```ts
{
  mediaType: 'movie' | 'tv';
  mediaId: number;          // TMDB-ID
  seasons?: number[] | 'all';
  is4k?: boolean;
  userId?: number;          // nur für Admin-Aufrufe; wir nutzen stattdessen X-Api-User
  // profileId/rootFolder/tags sind Admin-Feinheiten und bleiben aus
}
```

Die Suche liefert `mediaInfo.status` und `mediaInfo.requests`. Für die
Oberfläche wird daraus nur `available / requested / processing / unknown`
gemacht; fremde Requests und Nutzernamen werden **entfernt**.

## 6. Nutzenszenarien

### 6.1 Finden und entscheiden

| Frage | Datenquelle | Phase |
|---|---|---|
| „Ist X schon da?“ | Suche + `mediaInfo` | 1 |
| „Was ist neu/angesagt?“ | Trending, Discover | 1 |
| „Etwas wie X“ | Similar/Recommendations | 1 |
| „Heute, max. 110 Minuten, gute Bewertung“ | Discover mit Runtime/Vote-Filter | 1 |
| „Familienfilm“ | Discover mit Certification | 1 |
| „Was kommt bald?“ | Upcoming | 1 |
| „Zeig mir Details zu X“ | Movie/TV-Details | 1 |
| „Was ist neu in der Mediathek?“ | Jellyfin, nicht Seerr | 3 |

### 6.2 Anfragen und verfolgen

| Frage | Aktion | Phase |
|---|---|---|
| „Bitte X anfragen“ | Vorschlag → Bestätigung → `POST /request` | 2 |
| „Was habe ich angefragt?“ | eigene Requests | 2 |
| „Ist meine Anfrage durch?“ | Request-Status | 2 |
| „Storniere meine Anfrage“ | `DELETE /request/:id` | 2 |
| „Serie X, Staffel 2“ | TV mit `seasons` | 3 |
| „In 4K“ | nur mit 4K-Recht | 3 |
| „Für ein Familienmitglied anfragen“ | nur mit expliziter Zielperson und Recht | 4 |

### 6.3 Persönlich und familiär

| Frage | Datenquelle | Phase |
|---|---|---|
| „Weiter schauen“ | Jellyfin UserData | 3 |
| „Was habe ich zuletzt gesehen?“ | Jellyfin UserData | 3 |
| „Was ist als Nächstes dran?“ | Jellyfin NextUp | 3 |
| „Familien-Watchlist“ | Portal-eigene Liste | 4 |
| „Sag mir, wenn X verfügbar ist“ | Seerr/Sonarr/Radarr-Webhook oder Polling | 4 |

**Wichtig:** Die ersten beiden Phasen brauchen **keine** Jellyfin-API.
Seerr allein trägt Suche, Discovery, Details, Request und Status. Jellyfin
kommt erst für persönliche Sehhistorie und „Weiter schauen“; dafür braucht es
einen eigenen Jellyfin-API-Key und ein User-Token-Mapping.

## 7. Architektur

### 7.1 Serverseitige Module

- `src/lib/seerr.ts` — HTTP-Client:
  - `seerrForUser(userId)` setzt `X-Api-Key` + `X-Api-User`.
  - `search`, `discover`, `title`, `similar`, `recommendations`, `requests`,
    `request`, `quota`.
  - Timeout, 401/403/404/409/429 sauber auf eigene Fehlercodes abbilden.
  - Keine Schreibfunktion ohne fertige Proposal.
- `src/lib/media-users.ts` — Mapping:
  - `findSeerrUser(identity)`, `readMapping`, `writeMapping`.
  - Nutzt den Admin-Key nur zum Suchen/Verifizieren.
- `src/lib/media-actions.ts` — Proposal/Action:
  - `proposeMovieRequest(identity, tmdbId)` prüft Mapping, Recht, Status,
    Quota und erzeugt die Bestätigung.
  - `executeProposal(id, identity)` ist die **einzige** Schreibstelle.
- `src/pages/api/media/*.ts` — read-only Suche/Discover/Details/Requests und
  der eine Action-Endpunkt.

### 7.2 Assistent-Werkzeuge

| Werkzeug | Art | Ergebnis |
|---|---|---|
| `media_search` | read-only | Medienkarten |
| `media_discover` | read-only | Trends, Upcoming, Genre, ähnlich, Empfehlungen |
| `media_title` | read-only | Detailkarte |
| `media_requests` | read-only | eigene Anfragen |
| `media_propose_request` | server-only | Bestätigungskarte + Proposal-ID |
| `media_request_status` | read-only | Status einer eigenen Anfrage |

`media_search`, `media_discover` und `media_title` dürfen vom Modell
komponiert werden. `media_propose_request` erzeugt **keine** Schreibwirkung;
es legt nur einen serverseitigen Vorschlag an. Einen Tool-Aufruf
`media_request` gibt es **nicht**.

### 7.3 UI-Bausteine

- **`media`** — server-only: `tmdbId`, `mediaType`, Titel, Jahr, Kurztext,
  Poster/Backdrop, Laufzeit, Bewertung, Genres, Status, `requestable`.
- **`media-grid`** — optional: 2-spaltige Poster-/Backdrop-Karten; das Modell
  kann auch `grid` + `media` verwenden.
- **`confirm`** — server-only: Titel, Fakten, Zielperson, „Anfragen“ /
  „Abbrechen“, Proposal-ID.
- **`result`** — server-only: angenommen / bereits vorhanden / Quota /
  nicht verknüpft / Fehler; Request-ID und Seerr-Link.
- **`request-list`** — optional: eigene Anfragen mit Status und Datum.

Poster laufen über einen serverseitigen Proxy
(`/api/media/poster?path=…`), nicht direkt zu TMDB. Das hält die CSP streng,
vermeidet Fremd-Requests und erlaubt Caching. Ohne Poster gibt es eine
typografische Karte mit Initial und Farbfläche, keinen kaputten Bildrahmen.

### 7.4 Request-Flow

1. Person: „Bitte *Dune: Part Two* anfragen.“
2. Modell ruft `media_search` auf; Server sucht mit `X-Api-User`.
3. Treffer enthalten `mediaInfo`; Server filtert fremde Requests heraus.
4. Modell zeigt Treffer; Person wählt.
5. Modell ruft `media_propose_request({ mediaType:'movie', tmdbId })` auf.
6. Server prüft Mapping, `media-users`, `REQUEST`-Recht, Quota, Status,
   Duplikate undlegt eine Proposal-Zeile an.
7. Der Client zeigt die `confirm`-Karte. **Noch kein Seerr-Schreibzugriff.**
8. Klick auf „Anfragen“ → `POST /api/media/request` mit Proposal-ID.
9. Server prüft Same-Origin, Sitzung, Actor, Ablauf, Einmaligkeit; ruft
   `POST /api/v1/request` mit `X-Api-User`; schreibt Audit.
10. Ergebnis als `result`-Karte; die Person kann den Status erneut abfragen.

## 8. Datenmodell

### 8.1 `media_users`

Siehe 3.3.

### 8.2 `media_proposals`

```sql
CREATE TABLE IF NOT EXISTS media_proposals (
  id            TEXT PRIMARY KEY,       -- 128 Bit random, nie erratbar
  actor         TEXT NOT NULL,          -- portal_username
  service_id    TEXT NOT NULL,          -- media-requests
  action_id     TEXT NOT NULL,          -- seerr.request
  payload_json  TEXT NOT NULL,          -- mediaType, tmdbId, seasons, is4k
  created_at    TEXT NOT NULL,
  expires_at    TEXT NOT NULL,          -- 10 Minuten
  consumed_at   TEXT,
  outcome       TEXT,
  result_json   TEXT
);
```

- Ein Proposal ist an den Actor gebunden.
- Es ist nach Ablauf oder nach einer Ausführung unbrauchbar.
- Der Payload wird nie vom Client übernommen; der Client schickt nur die ID.

### 8.3 Audit

Die vorhandene `audit`-Tabelle bekommt `target`/`detail` (Migration):
`actor`, `service_id`, `action_id`, `outcome`, `target` (TMDB-ID/Medientyp),
`detail` (Seerr-Request-ID), `created_at`. Auch abgelehnte Vorschläge und
fehlende Mappings werden protokolliert.

### 8.4 Cache

- Suche/Discover/Details: In-Memory-LRU, 2–5 Minuten, pro Nutzer/Region.
- Poster: HTTP-Cache, 24 Stunden, ohne Nutzerbezug.
- Eigene Requests/Quota: **nicht** cache, oder max. 30 Sekunden.
- Kein persistenter Cache von Sehhistorie in v1.

## 9. Sicherheit und Robustheit

- API-Key nur im systemd-Credential; nie im Client, nie im Log.
- `X-Api-User` nur serverseitig aus `media_users`.
- Medienaktion nur mit `media-users` **und** Mapping.
- Same-Origin + `Origin`/`Sec-Fetch-Site` + JSON-Content-Type am Action-Endpunkt.
- Proposal: 128 Bit, Actor-gebunden, 10 Minuten, einmalig.
- Rate Limit: 3 Anfragen/Minute und 20/Tag pro Person.
- Vor dem Schreiben: Status prüfen; `available`/`pending`/`processing` nicht
  doppelt anfragen. Seerr-409 wird als „bereits angefragt“ gezeigt.
- Kein blinder Retry nach Timeout: zuerst eigene Requests für die TMDB-ID
  lesen. Unklarer Ausgang wird als „unbekannt, bitte prüfen“ gemeldet, nicht
  erneut geschrieben.
- Fremde Requests, E-Mails und Nutzernamen aus Seerr-Antworten entfernen.
- Keine Admin-Aktionen (Approve/Decline/Manage) im Assistenten.
- Fehlermeldungen nennen den nächsten Schritt, nicht den API-Key.

## 10. Fehlerfälle

| Fall | Verhalten |
|---|---|
| Seerr nicht erreichbar | „Medienwünsche sind gerade nicht erreichbar“; keine Proposal |
| Kein Mapping | `not_linked`; Link zu Seerr/Konto; keine Admin-Anfrage |
| Keine `media-users`-Gruppe | Suche darf erklärt werden, Request wird verweigert |
| Kein `REQUEST`-Recht | 403 von Seerr → „Dein Seerr-Konto darf keine Anfragen stellen“ |
| Quota erreicht | Quota-Karte; kein Request |
| Bereits verfügbar | Status „verfügbar“; kein Request |
| Bereits angefragt | Status „angefragt“; kein Duplicate |
| 4K nicht erlaubt | 4K-Option gar nicht anzeigen |
| Timeout nach POST | Eigene Requests prüfen; „unbekannt“ statt Retry |
| Poster fehlt | Typografische Karte |
| Ungültige TMDB-ID | Suche/Details liefern keinen Treffer; kein Request |

## 11. Tests

- Mock-Seerr mit Fixtures für Suche, Discover, User, Quota, Request.
- Mapping: E-Mail exakt, Benutzername-Fallback, mehrdeutig, fehlend.
- Header: jeder Aufruf trägt `X-Api-Key` und `X-Api-User`; kein Aufruf ohne
  Mapping.
- Rechte: `media-users` fehlt, Seerr-403, Quota-403.
- Request: Duplicate 409, available, pending, Timeout/unklar.
- Proposal: abgelaufen, fremder Actor, doppelt, Payload-Manipulation.
- Audit: accepted/refused/failed.
- UI: Medienkarten, Confirm, Result, Fehler, 390/1200 px, Dark Mode.
- Keine echten Schreibzugriffe in CI.

## 12. Rollout

| Phase | Inhalt | Voraussetzung |
|---|---|---|
| 0 | API-Key + E-Mail-Claim + Mapping-Tabelle | Key in SOPS, `media-users` |
| 1 | Suche, Discover, Details, Medienkarten | Key, Mapping |
| 2 | Movie-Request mit Confirm, Audit, Status | Phase 1, Canary |
| 3 | TV-Staffeln, eigene Requests, Quota, Cancel | Phase 2 |
| 4 | Jellyfin „Weiter schauen“, Familienliste, Benachrichtigungen | Jellyfin-Key/User-Token |

Feature-Flags: `PORTAL_MEDIA_READ` und `PORTAL_MEDIA_REQUESTS` getrennt.
Phase 1 darf lesen, Phase 2 schreiben; ohne Flag keine Schreibroute.

## 13. Was noch fehlt

1. **Erster echter Request/Canary**: ein Testnutzer, ein Film; der Flag ist
   bereits `on`.
2. **TV-Staffeln** mit Season-Auswahl und eigener Quota-Prüfung.
3. **4K** nur mit separatem Recht und sichtbarer Entscheidung.
4. **Cancel** eigener offener Requests.
5. **Jellyfin** „Weiter schauen“, zuletzt gesehen und NextUp.
6. **Benachrichtigungen** für Request-Status und neue Titel.

## 14. Abnahmekriterien

- Ein `media-users`-Nutzer mit Mapping kann suchen, Verfügbarkeit sehen und
  einen Film nach Bestätigung anfragen.
- Die Anfrage erscheint in Seerr unter **diesem** Nutzer, nicht unter dem
  API-Key-Besitzer.
- Ein Nutzer ohne Mapping bekommt `not_linked`; es wird nichts geschrieben.
- Ein `family`-Nutzer ohne `media-users` kann nicht anfragen.
- Doppelte/bereits verfügbare Titel werden ohne Schreibzugriff erklärt.
- Jede Ausführung und jede Ablehnung steht im Audit.
- Der Assistent hat keinen direkten Schreib-Tool-Aufruf.
