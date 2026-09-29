# Ergänzung: Markierungs-Bestätigung per Button + M3-Design (Sep 2026)

## 1. Neuer Flow nach dem 2. Tap (statt sofortigem Dialog)

Bisher: 2. Tap öffnet direkt den „Eintrag anlegen"-Dialog.
Neu:

1. Nach Tap 2 bleibt die Markierung im Zeitstrahl stehen (roter/Primär-Block wie bisher).
2. **Statt des Dialogs erscheint ein schwebender Button (Extended-FAB-Pattern, M3):**
   - Pill-Form (border-radius full), Icon („add" o.ä. aus lucide-react) + Label **„Zeiteintrag erstellen"**.
   - Bei reiner Zukunfts-Markierung (nur Plan): Label **„Plan erstellen"**.
   - Positioniert NAHE DER MARKIERUNG: horizontal zentriert über der Markierung (clamped in den Container, mind. 8px Rand), vertikal knapp oberhalb der Markierungsoberkante; nie außerhalb des sichtbaren Timeline-Bereichs (top >= 8px).
   - Er ist absolut über dem Scroll-Container positioniert (bleibt beim Scrollen an der Markierung, wie der Markierungs-Block selbst — einfacher: im gleichen Koordinatensystem wie die Blöcke innerhalb des scrollbaren Contents).
3. **Animationen nach M3** (Tokens siehe unten):
   - Enter: fade + translateY(8px→0) + scale(0.9→1), **400ms, cubic-bezier(0.05, 0.7, 0.1, 1)** (Emphasized decelerate).
   - Exit (Verwerfen/Auswahl abgeschlossen): fade + translateY(0→4px) + scale(1→0.95), **200ms, cubic-bezier(0.3, 0, 0.8, 0.15)** (Emphasized accelerate).
   - `prefers-reduced-motion: reduce` → Animationen abschalten.
4. Klick auf den Button öffnet den BESTEHENDEN Kategorie-Dialog („Eintrag anlegen") — inkl. aller bestehenden Flows (Adopt-Dialog bei „jetzt"-Überschneidung zuerst, Kollisionsdialog, Chips, CategoryPickerDialog).
5. **Verwerfen:** neben dem Button ein kleiner runder Icon-Button („×", ghost, 32px Touch ≥40px) mit gleichem Enter/Exit. Klick: Markierung + Button verschwinden (Exit-Animation), Zustand sauber resetten (pending/adoptState/confirmDelete etc.).
   - Zusätzlich: Tap auf eine andere freie Zelle startet wie bisher eine neue Markierung (alter Tap-1-Flow) und verwirft die alte Markierung still.
6. Dialog-Abbrechen (Kategorie-Dialog/Adopt/Überschreiben) kehrt zur Markierung MIT Button zurück, solange der Anlege-Dialog aus der Markierung geöffnet wurde (pickerSource === 'create' → pending behalten, wie bereits implementiert).

## 2. M3-Design-Tokens (globals.css o. ä.)

```css
:root {
  --m3-easing-emphasized: cubic-bezier(0.2, 0, 0, 1);
  --m3-easing-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1);
  --m3-easing-emphasized-accelerate: cubic-bezier(0.3, 0, 0.8, 0.15);
  --m3-dur-enter: 400ms;
  --m3-dur-exit: 200ms;
}
@keyframes m3-fab-enter { from { opacity:0; transform: translateY(8px) scale(.9);} to { opacity:1; transform:none; } }
@keyframes m3-fab-exit { from { opacity:1; transform:none;} to { opacity:0; transform: translateY(4px) scale(.95);} }
@media (prefers-reduced-motion: reduce) { /* Animationen deaktivieren */ }
```

## 3. M3-Restyle im Timeline-Bereich (kein App-weites Redesign!)

- **„Eintrag anlegen"-Dialog + Adopt- + Kollisions-Dialog:** `rounded-[28px]` statt default; Titel `text-lg font-medium` (M3 Headline Small); Buttons nach M3 (Filled = Hauptaktion, Text-Button ghost ohne Border, Pill-Form `rounded-full`, Höhe ≥40px).
- **„Andere Kategorie…"-Button:** bleibt outline (Vorprüfung Runde 2), aber `rounded-full`.
- **Chips im Dialog:** Pill (sind sie weitgehend schon), Höhe ≥36px.
- **Erstnutzer-Hinweis:** als dezente M3-Hilfslinie belassen, aber `rounded-full`-Pill mit `bg-secondary/60` (Tonal).
- **FAB-Button:** `rounded-full`, `shadow-md` (M3 Elevation 3), Filled-Primary-Farbe, `h-12` (48px Touch).
- KEINE Änderungen an: Header/Nav der App, QuickTap-Startseite, Settings, Bottom-Nav.

## 4. Stellen im Code (Ausgangspunkt)

- `components/timeline/Timeline.tsx`: `startCommit`/`onColumnClick` (Tap-2-Zweig ruft aktuell direkt `prepareCommit`/Dialog), `pending`, `adoptState`, `collisionState`, `pickerSource`.
- Die Dialoge rendern am Ende der Timeline.tsx („Eintrag anlegen", adopt, collision).
- Button-State: `commitFab: { x: number; y: number; kind: 'entry' | 'plan' } | null` analog `popover`.

## 5. Akzeptanzkriterien

- [ ] Nach Tap 2: Markierung sichtbar + „Zeiteintrag erstellen"/„Plan erstellen"-Button mit M3-Enter-Animation; KEIN Dialog.
- [ ] Button-Klick → Kategorie-Dialog (bzw. Adopt/Kollision davor) wie gehabt.
- [ ] ×-Klick verwirft Markierung + Button (Exit-Animation).
- [ ] Dialog-Abbrechen → zurück zu Markierung + Button.
- [ ] Pläne (reine Zukunft) → Label „Plan erstellen".
- [ ] `prefers-reduced-motion` respektiert.
- [ ] tsc + build grün; Mobile 390px: Button nicht außerhalb, Touch ≥ 44px.
