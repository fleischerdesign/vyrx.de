# 05 — Personas, Anwendungsfälle, Randfälle

Jedes Vorhaben im Backlog nennt mindestens eine Persona. Was hier fehlt, fehlt
auch in der Begründung.

## 1. Personas

### P1 — Nicht-technisch (Haushalt, Familie, Mitbewohner)
Will Medien schauen, drucken, Dateien ablegen. Kennt Begriffe wie Dienst,
Container oder Port nicht. Erwartet: anmelden, sehen was es gibt, klicken.
Kann nichts kaputt machen — und soll das wissen.

Was heute fehlt: Es gibt nichts zu lesen (kein Wiki), die Ansichten brauchen
JavaScript, und ein Zustandspunkt „degraded“ erklärt sich nicht.

### P2 — Technisch (Homelab, Selbstbedienung)
Will Zustand, Kennzahlen und Abkürzungen. Kennt die Dienste, will sie schnell
erreichen und Details sehen, ohne zu suchen. Ärgert sich über Erklärungen, die
er schon weiß.
Braucht: Direktaufrufe, Tastaturbedienung, dichte Darstellung, Verlauf.

### P3 — Administrator (Betrieb)
Richtet ein, sieht alles, greift ein. Will eine Matrix „wer darf was“,
Zustandshistorie, Wartungsfenster setzen, ein Protokoll der Eingriffe.
Braucht: Werkzeuge, keine Schaukästen — und jede Aktion bestätigt.

### P4 — Gast (befristet)
Besucht für eine Weile, hat keinen Zugang zum Verzeichnis. Soll sehen, was
öffentlich ist, und sich anmelden können. Soll nichts sehen, was intern ist.
Braucht: klare Trennung, keine leeren Flächen, einen Weg zur Anmeldung.

### P5 — Automat (Skript, Agent, Dashboard)
Fragt den Katalog und den Status maschinell ab. Braucht stabile JSON-Formen,
Versionierung und Tokens, keine HTML-Seiten.

## 2. Anwendungsfälle

### Alltag
- „Ich will einen Film ansehen.“ → Dienst finden, öffnen, evtl. anfragen.
- „Der Fernseher lädt nicht.“ → Status prüfen, verstehen, ob es bekannt ist.
- „Wie verbinde ich das Tablet?“ → Wiki, Schrittfolge.
- „Ich brauche eine Datei von gestern.“ → Dienst finden, öffnen.
- „Ich habe mein Passwort vergessen.“ → Weg zur Anmeldung, nicht nur ein Fehler.

### Betrieb
- „Läuft alles?“ → Übersicht, gruppiert, mit Zeitpunkt.
- „Seit wann ist der Dienst weg?“ → Verlauf.
- „Ist die Sicherung durchgelaufen?“ → Zustand, Alter.
- „Was habe ich gestern geändert?“ → Protokoll.
- „Wer ist noch angemeldet?“ → Sitzungen.

### Maschinell
- Konfiguration lesen (Katalog exportieren).
- Status in ein eigenes Dashboard spiegeln.
- Warnung weiterleiten, ohne das Portal zu öffnen.

## 3. Randfälle

| Randfall | Erwartetes Verhalten |
|---|---|
| Kein JavaScript | Landing vollständig, Ansichten erklären den Ausfall statt leer zu bleiben (Backlog G3) |
| Kollektor nicht erreichbar | Zustandsflächen zeigen „unbekannt“ mit Zeitpunkt der letzten Antwort, keine Nullwerte |
| Benutzer ohne sichtbare Dienste | Erklärender Leerzustand mit Weg zur Anmeldung oder Rechteklärung |
| Gruppen falsch zugeordnet | Admin-Ansicht zeigt die wirksamen Gruppen; sichtbar, nicht stillschweigend |
| Dienst kennt die Sichtbarkeit nicht | Zustand `unmonitored`, kein erfundenes „ok“ |
| zwei Geräte, verschiedene Sprache | Sprache folgt der Wahl, nicht dem Gerät |
| Zeitumstellung | Zeitpunkte in UTC vergleichen, lokal anzeigen |
| sehr langer Dienstname | Umbruch statt Abschnitt, Symbol bleibt in der Zeile |
| Abbruch der Verbindung mitten in einer Aktion | Ergebnis unbekannt ist ein eigener Zustand: „nicht bestätigt“, mit Weg zur Prüfung |
| alte Sitzung, neue Rechte | Aktion serverseitig abgelehnt, Meldung erklärt den Grund |
| Bildschirmleser, Zustandswechsel | `aria-live`-Meldung (Backlog G7) |
| langsames Gerät | Skeletons statt Sprung, keine sichtbare Nachladeunruhe |
| Druckansicht eines Artikels | Wiki-Seiten drucken lesbar, ohne Hülle |
| geteilter Link auf eine Ansicht | Adresse trägt die Ansicht; ohne Anmeldung führt sie in die Anmeldung und danach zum Ziel |

## 4. Was daraus folgt

1. Nicht-technische Nutzer sind keine Ausnahme, sondern die Mehrheit. Das Wiki
   (A) ist damit keine „nette Ergänzung“, sondern die Voraussetzung dafür, dass
   der Hub von allen benutzt wird.
2. Der Ausfall ohne JavaScript trifft genau die Personen, die am wenigsten
   Erklärung bekommen. Er ist ein Randfall mit Priorität, nicht mit Ausrede.
3. Maschinelle Nutzer (P5) sind billig zu bedienen: ein stabiler Endpunkt plus
   Token (F5) — und die Versuchung verschwindet, Konfiguration abzuschreiben.
4. Jede Aktion braucht ein Protokoll. Ohne Protokoll gibt es keinen
   verantwortlichen Betrieb, nur Vermutungen.
