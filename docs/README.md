# Dokumentation — Portal vyrx.de

Dieser Ordner sammelt Analyse, Konventionen und Ideen zum Portal unter `vyrx.de`:
Landing Page, Control Panel und Hub für alle Nutzer im Netz.

Er ist **kein** Endnutzer-Handbuch — das wird die Wissensbasis (Wiki, siehe
`02-feature-backlog.md`). Hier steht, was *wir* bauen und warum.

## Struktur

| Datei | Inhalt | Pflege |
|---|---|---|
| `01-ist-analyse.md` | Was heute existiert, wie es gebaut ist, wo die Lücken sind | bei größeren Umbauten |
| `02-feature-backlog.md` | Ideen und Vorhaben mit Nutzen, Aufwand, Akzeptanzkriterium | laufend |
| `03-ui-ux.md` | Gestaltungs- und Interaktionskonventionen sowie Verbesserungen | laufend |
| `04-integrationen.md` | Entwurf für ein generisches Integrationssystem (Dienste ansprechen) | bei Entwurfsänderungen |
| `05-personas-usecases.md` | Wer nutzt wofür, welche Szenarien und Randfälle | laufend |
| `06-entscheidungen.md` | Getroffene Entscheidungen und offene Fragen | bei jeder Entscheidung |

## Konventionen

**Status-Legende** (für Backlog und Entscheidungen):

- `idee` — gesammelt, noch nicht bewertet
- `kandidat` — bewertet, grundsätzlich gewollt, nicht terminiert
- `geplant` — eingeplant
- `umgesetzt` — im `main`
- `verworfen` — mit Begründung, Eintrag bleibt stehen

**Jeder Backlog-Eintrag** trägt: Nutzen in einem Satz, betroffene Personas,
Aufwand (`S` ≤ 1 Tag, `M` ≤ 1 Woche, `L` > 1 Woche), Abhängigkeiten und ein
prüfbar formuliertes Akzeptanzkriterium.

**Der Ort** gehört zum Eintrag: der Platz, an dem die Änderung benutzt wird —
Terminal, Änderungsvorschlag (PR), Portal, Mail oder Startbildschirm. Er
entscheidet, ob eine Idee richtig geformt ist: was am Terminal entschieden
wird, gehört nicht in eine Oberfläche, die man dafür erst öffnen müsste.
Vorgabe ist `Portal`; abweichende Orte stehen ausdrücklich am Eintrag, und
`02-feature-backlog.md` führt sie gesammelt auf.

**Jede Entscheidung** trägt: Kontext, Entscheidung, Begründung, Alternativen,
Konsequenzen. Kurz halten, aber vollständig.

**Sprache.** Dokumentation auf Deutsch, Code und Code-Kommentare auf Englisch
(wie im Repository). Bezeichner bleiben englisch: ein Wechsel zwischen
`Dienste` und `services` innerhalb einer Datenstruktur kostet mehr, als er
einbringt.

**Grundsätze**, die für alles hier gelten:

1. **Eine Wahrheit.** Jede Information existiert genau einmal im Code und
   genau einmal in der Doku. Ableitbares wird abgeleitet, nicht gepflegt.
2. **Dienst-agnostisch.** Die Oberfläche kennt Katalogformen, keine Produktnamen.
3. **Fehler sind sichtbar.** Ein unbekannter Zustand ist ein Zustand, kein leeres Feld.
4. **Ohne Maus und ohne JavaScript benutzbar** — nach Möglichkeit; wo das nicht
   geht, wird der Ausfall erklärt statt verschwiegen.
5. **Randfälle zuerst.** Jedes Vorhaben nennt die Persona, die es ausschließt,
   und was diese stattdessen sieht.
