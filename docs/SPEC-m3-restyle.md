# SPEC: Komplettes M3-Restyle der ChronoMind-App (Sep 2026)

## Ziel
Die komplette App auf Material Design 3 umstellen — alle Seiten, Header, Bottom-Nav.
**NUR Präsentation. Keine Logik-, Daten-, API- oder Flow-Änderungen.** Alle bestehenden
Tests/Flows (Zeitstrahl 2-Tap, FAB, Kollisionen, Adopt, Cloud-Sync, Chat, PWA) müssen
weiterhin funktionieren.

## Entscheidungen (mit Marc abgestimmt)
1. **M3-Farbrollen aus Indigo-Seed #4F46E5** — Werte siehe unten, hell + dunkel.
2. **Hybrid:** `@material/web` (MWC, v2.5.0, installiert) für sichtbare M3-Kernkomponenten;
   Dialoge/Dropdowns/Sheet/Tooltip/AlertDialog bleiben Radix (shadcn), optisch M3-angeglichen.
3. **M3-Motion app-weit, dezent.** Kein Overshoot. `prefers-reduced-motion` respektieren.
4. Kategorie-Domänenfarben (Arbeit rot usw.) bleiben NICHT angefasst.

## MWC-Integration (Next.js App Router!)
- NEU `components/m3/m3-provider.tsx`: 'use client' Komponente, die in useEffect
  dynamisch die benötigten `@material/web/*/define.js`-Module importiert (SSR-safe,
  kein `window` zur Importzeit im Server-Component-Baum). In `app/layout.tsx` einbinden.
- NEU `components/m3/md-text-field.tsx`, `md-switch.tsx`, `md-chip.tsx`: dünne
  React-Wrapper ('use client') mit props forwarding (value, onInput/onChange, label,
  error, disabled). MWC-Events sind CustomEvents — `onInput` via addEventListener.
- **MWC-CSS-Tokens** in globals.css setzen (die MWC-Komponenten lesen die Tokens):
  ```css
  md-filled-button, md-outlined-button, md-text-button, md-filled-tonal-button,
  md-filled-text-field, md-outlined-text-field, md-switch, md-assist-chip {
    /* via CSS custom properties, siehe MWC docs: --md-sys-color-primary etc. */
  }
  ```
  Setze die vollen `--md-sys-color-*` Rollen (primary, on-primary, primary-container,
  on-primary-container, secondary-container, on-secondary-container, surface,
  on-surface, on-surface-variant, outline, outline-variant, error, ...) — hell in
  `:root`, dunkel in `.dark`.
- WO MWC einsetzen: Chat-Eingabe (`components/prompt-form.tsx`, md-outlined-text-field
  + md-filled-button Senden ODER beibehaltene Button optisch M3), Settings-Switches
  (`components/settings/`), Kategorie-Dialog-Chips bleiben custom (Domänenfarben!),
  Login/SignUp-Formulare (md-outlined-text-field + md-filled-button).
  WO NICHT: Timeline-Blöcke/FAB (custom, token-basiert lassen), QuickTap-Chips
  (Domänenfarben), Bottom-Nav (custom M3-Stil, siehe unten).

## shadcn-Basis auf M3 umstellen (wirkt app-weit)
`components/ui/button.tsx` (BEWAHRE die API: variant/size props gleich!):
- variant default (Filled): `bg-primary text-primary-foreground rounded-full`
- secondary (Tonal): `bg-secondary-container text-on-secondary-container`
  → NEU als CSS-Variablen; oder secondary auf secondary-container mappen
- outline (Outlined): `border-outline text-primary rounded-full`
- ghost (Text): ohne bg, `text-primary`, hover state-layer `bg-on-surface/8`
- State-Layer-Pattern: hover `bg-*` mit 8% Opacity, active 12% (Tailwind opacity utilities)
- `transition-colors duration-200` M3-Standard-Easing via globals.

`components/ui/dialog.tsx`, `alert-dialog.tsx`: Content `rounded-[28px]`,
`bg-surface-container-high text-on-surface` (Container-Rolle), Overlay `bg-black/32`;
Radix-Animationen auf M3: Enter `data-[state=open]:animate-in` Dauern 400ms mit
`cubic-bezier(0.05, 0.7, 0.1, 1)`, Exit 200ms `cubic-bezier(0.3, 0, 0.8, 0.15)`
(tailwindcss-animate Klassen nutzen, Dauern/Easings in globals überschreiben).
Close-Button: `rounded-full`, Touch ≥ 44px.

`input.tsx`/`textarea.tsx`/`select.tsx`/`switch.tsx`: auf M3-Anmutung
(outline-variant Border, rounded-lg→rounded-xl bzw. full, focus ring primary).
`badge.tsx`: Pill, secondary-container.

## M3-Farbrollen (erzeugt aus Seed #4F46E5 via material-color-utilities)
In `app/globals.css`: bestehende shadcn-HSL-Variablen BEHALTEN (Kompatibilität),
aber auf M3-Werte umgebogen; NEU dazu die M3-Rollen als Hex. `.dark` entsprechend.

### Light
```
--md-primary: #4d44e3; --md-on-primary: #ffffff;
--md-primary-container: #e2dfff; --md-on-primary-container: #0f0069;
--md-secondary: #5e5c71; --md-secondary-container: #e3e0f9; --md-on-secondary-container: #1a1a2c;
--md-tertiary: #7a5368; --md-tertiary-container: #ffd8ea; --md-on-tertiary-container: #2f1123;
--md-surface: #fffbff; --md-on-surface: #1c1b1f; --md-on-surface-variant: #47464f;
--md-surface-container-lowest: #ffffff; --md-surface-container-low: #f6f2f7;
--md-surface-container: #f0edf1; --md-surface-container-high: #ebe7ec; --md-surface-container-highest: #e5e1e6;
--md-surface-dim: #dcd9dd; --md-outline: #787680; --md-outline-variant: #c8c5d0;
--md-inverse-surface: #313034; --md-inverse-on-surface: #f3eff4; --md-inverse-primary: #c3c0ff;
--md-error: #ba1a1a; --md-on-error: #ffffff; --md-error-container: #ffdad6; --md-on-error-container: #410002;
```
shadcn-Mapping light: background→surface, foreground→on-surface, primary→#4d44e3,
primary-foreground→#ffffff, secondary→secondary-container, secondary-foreground→on-secondary-container,
accent→secondary-container, accent-foreground→on-secondary-container, muted→surface-container,
muted-foreground→on-surface-variant, card→surface-container-low, popover→surface-container-high,
border→outline-variant, input→outline-variant, ring→primary, destructive→error.
(HSL-Format beibehalten oder auf Hex umstellen — Tailwind 4 akzeptiert beides,
Konsistenz wahren: am einfachsten Hex + `hsl(var(--x))`-Aufrufe prüfen und ggf. auf
`var(--x)` direkt umstellen. KEIN kaputtes CSS: tsc+build müssen grün bleiben.)

### Dark
```
--md-primary: #c3c0ff; --md-on-primary: #1d00a5;
--md-primary-container: #3323cc; --md-on-primary-container: #e2dfff;
--md-secondary: #c7c4dd; --md-secondary-container: #464559; --md-on-secondary-container: #e3e0f9;
--md-tertiary: #eab9d1; --md-tertiary-container: #603c50; --md-on-tertiary-container: #ffd8ea;
--md-surface: #1c1b1f; --md-on-surface: #e5e1e6; --md-on-surface-variant: #c8c5d0;
--md-surface-container-lowest: #0e0e11; --md-surface-container-low: #1c1b1f;
--md-surface-container: #201f23; --md-surface-container-high: #2a292d; --md-surface-container-highest: #353438;
--md-surface-dim: #131316; --md-outline: #928f9a; --md-outline-variant: #47464f;
--md-inverse-surface: #e5e1e6; --md-inverse-on-surface: #313034; --md-inverse-primary: #4d44e3;
--md-error: #ffb4ab; --md-on-error: #690005; --md-error-container: #93000a; --md-on-error-container: #ffb4ab;
```

## Motion (app-weit, globals)
```css
:root {
  --m3-easing-standard: cubic-bezier(0.2, 0, 0, 1);
  --m3-easing-emphasized: cubic-bezier(0.2, 0, 0, 1);
  --m3-easing-emphasized-decelerate: cubic-bezier(0.05, 0.7, 0.1, 1);
  --m3-easing-emphasized-accelerate: cubic-bezier(0.3, 0, 0.8, 0.15);
}
```
- Radix-Dialog/Sheet/Tooltip: open 400ms emphasized-decelerate, close 200ms emphasized-accelerate.
- Buttons/Chips: `transition` 200ms standard.
- `@media (prefers-reduced-motion: reduce)`: alle Animationen/Transitions ~0ms.

## Seiten im Detail
- **Header (`components/header.tsx`):** M3 Top App Bar — `bg-surface`/transparent,
  Titel `text-on-surface`, Nav-Links: aktive Route als Pill `bg-secondary-container
  text-on-secondary-container`, inaktiv `text-on-surface-variant`, `rounded-full h-10`.
- **Bottom-Nav (`components/bottom-nav.tsx`):** M3 Navigation Bar — `bg-surface-container`,
  aktive Item: Icon in Pill `bg-secondary-container` (`h-8 px-4 rounded-full`), Label
  `text-on-surface`, inaktiv `text-on-surface-variant`; Höhe `h-16` + Safe-Area beibehalten.
- **app_main/DashboardClient + Timeline:** Farbwerte automatisch via tokens (bg-primary
  wird Indigo). Markierung/Blöcke: Domänenfarben bleiben. Erstnutzer-Hint: Pill
  `bg-secondary-container text-on-secondary-container`.
- **entries/ (Liste + Filters):** Card = surface-container-low mit outline-variant
  Border, Filter-Chips als M3-Stil.
- **chat:** Prompt-Form (MWC md-outlined-text-field ODER shadcn-Textarea mit M3),
  Messages: user `bg-primary-container text-on-primary-container rounded-2xl`,
  assistant `bg-surface-container-low rounded-2xl`.
- **analytics:** recharts-Farben auf primary/tertiary/secondary umstellen, Cards M3.
- **calendars:** Cards/Forms M3.
- **settings:** Switches → MWC md-switch (Wrapper), Cards M3.
- **sign-in/sign-up:** zentrierte Card (surface-container-low, 28px), MWC-TextFields,
  md-filled-button.

## Validierung (PFLICHT)
1. `npx tsc --noEmit` Exit 0
2. `npm run build` Exit 0
3. Keine Änderung an: lib/, app/api/, Hooks, Datenflows, PWA-Manifest, Tests.

## Bericht
Geänderte Dateien je Zeile + Umsetzungsstand je Abschnitt + Exits.
