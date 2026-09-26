# SPEC: Zeitstrahl (Timeline) für ChronoMind

## Ziel
Der Zeitstrahl ersetzt die Eintrags-Liste als Haupt-Element der Startseite. Alle 24 Stunden eines Tages sollen mit Zeiteinträgen füllbar sein; freie Stellen sind auf einen Blick sichtbar.

## Datenmodell

### Zeiteinträge (bestehend, erweitern)
- `TimeEntry` hat `started_at`/`ended_at` (ISO), `title`, `category` (Pfad `Haupt/Unter/UnterUnter`).
- NEU: Einträge dürfen zukünftig auch minutengenau sein (nicht nur Timer-basiert). Alte Einträge bleiben kompatibel.

### Pläne (NEU)
- Neuer Typ `TimePlan`: `{ id, title, category, started_at, ended_at, created_at }`
- Eigene Liste, getrennt von `chronomind_entries`: localStorage-Key `chronomind_plans`
- In die Cloud: Payload-Version 3 `{ version: 3, timestamp, device, categories, entries, plans, settings }`. Beim Laden: fehlt `plans` (altes Backup) → leere Liste. Backup-Restore ebenso.
- Beim Bestätigen wird der Plan zu einem echten Eintrag und aus der Plan-Liste entfernt.

## Zeitstrahl-Komponente (`components/timeline/Timeline.tsx`)

### Darstellung
- Volle 24h-Tagesansicht, Stundenraster mit Stunden-Labels.
- Belegte Blöcke: Farbe der Hauptkategorie (Farbe aus `lib/categories.ts` nach erstem Pfad-Segment), volle Deckkraft.
- Pläne (Zukunft): gleiche Farbe, aber blass/transparent (z.B. opacity 0.35, gestrichelte Umrandung).
- Laufender Timer: wachsender Block ab `started_at` bis jetzt, in Hauptkategorie-Farbe mit Puls-Animation; tickt wie gewohnt (bestehender Timer-Flow bleibt).
- „Jetzt"-Linie.
- Hover/Tap auf Block: Popover/Tooltip mit Titel, Kategorie-Pfad, genauer Zeit.

### Zoom
- Zwei-Finger-Pinch (Touch) + Mausrad (Desktop, mit Ctrl oder direkt horizontal + Rad = Zoom).
- Zellgröße (Raster-Präzision): 30 min (Standard) bis 5 min, Stufen: 30/15/5.
- Zoom um die aktuelle Bildschirmmitte.

### Navigation
- Horizontales Scrollen über Tage hinweg (unendlich in die Vergangenheit): Der Zeitstrahl rendert Tage fortlaufend nebeneinander; virtueller Scroll.
- Buttons: ‹ Tag zurück, › Tag vor, Datumsfeld (input type=date, Springen zum Datum), „Heute"-Button.

### Markieren & Füllen
- Zelle antippen (Start) → zweite Zelle antippen (Ende) → Block dazwischen wird markiert (Raster = aktuelle Zellgröße; Speicherung minutengenau, Grenzen = Zellgrenzen).
- Nach dem Markieren: Kategorieauswahl wie auf der Startseite (häufigste 7-Tage-Chips + Hauptkategorien-Dialog mit Unterkategorien-Ebenen aus QuickTap wiederverwenden).
- Titel = unterste Kategorie-Ebene (wie QuickTap).
- Markierung über „jetzt" hinaus: Vergangenheits-Teil → Abfrage „Als Eintrag übernehmen?"; Zukunfts-Teil → wird Plan.
- Mindestlänge eines Abschnitts: eine Zelle (5 min minimal).

### Überschreiben (Kollisionen)
- Markierung über belegten Abschnitten → Bestätigungsdialog: „Der bestehende Eintrag 07:00–07:20 wird auf 07:00–07:10 zugeschnitten." (bzw. wenn er komplett überdeckt wird: „wird gelöscht"; wenn er gespalten wird: beide Teile nennen).
- Beim Bestätigen: alte Einträge 5-min-genau an den Markierungsgrenzen zuschneiden/spalten/löschen; neue Einträge/Pläne anlegen.
- Gleiches gilt für Pläne als Kollisionspartner.

### Bearbeiten ohne Versehen
- Antippen eines Blocks → Block wird hervorgehoben (Popover mit Details + „Bearbeiten"-Modus).
- Erst nach Antippen/Auswählen sind die Ränder (Start/Ende) verschiebbar: Drag am Rand, 5-min-Raster, min. 5 min Länge.
- Gleiche Mechanik für echte Einträge und Pläne.
- Popover bietet zusätzlich: Kategorie ändern, Löschen, (bei echtem Eintrag) „Zurück in Planung".

## Startseite-Integration
- Der Zeitstrahl steht als Haupt-Element auf der Startseite (über dem QuickTap).
- Die bisherige Eintrags-Liste wird darunter eingeklappt: Überschrift „Einträge (N)" mit Aufklapp-Pfeil (details/summary oder state-gesteuert), Standard zu.
- QuickTap-Kacheln, häufige-Chips, Timer-Flow bleiben unverändert.

## Randbedingungen
- Kein neues Dependency für Drag/Zoom —原生 Pointer Events + Touch-Handler selbst implementieren.
- Mobil zuerst: Touch-Ziele ≥ 32 px in der Höhe bei 30-min-Zoom (24h × 60/30 = 48 Zellen; mindestens ~10px pro Zelle ist ok fürs Markieren, Popover via Tap).
- Performance: nur sichtbare Tage rendern (Windowing), Einträge je Tag filtern mit useMemo.
- Keine Secrets im Code; Cloud-Payload nie mit API-Keys.

## Akzeptanzkriterien
1. Zeitstrahl zeigt Tag, Zoom 30/15/5, Scroll über Tage, Datums-Sprung, „Heute".
2. Markieren 2-Tap, Kategorieauswahl wie Startseite, minutengenau gespeichert.
3. Kollisions-Trimmen mit Bestätigung 5-min-genau korrekt.
4. Pläne: anlegen (Zukunft), blass dargestellt, eigene Liste, in Cloud v3, Bestätigen → Eintrag.
5. Laufender Timer als wachsender Block.
6. Einträge-Liste eingeklappt unter dem Zeitstrahl.
7. tsc + build grün, mobile Grundbedienung per Touch funktioniert.
