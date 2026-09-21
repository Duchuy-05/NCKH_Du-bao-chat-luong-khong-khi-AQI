# Home Typography, Color and Shape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved Home visual specification so typography is readable, the orange accent is locked, light/dark chart surfaces are theme-aware, and radius/shadow usage follows one documented shape system without changing Home behavior or information architecture.

**Architecture:** Keep `Home` as the existing React page and preserve all state, handlers, data contracts, routes, callbacks, and section order. Add semantic visual tokens in `theme.css`, keep the existing system sans stack in `index.css`, and update `Home.tsx` utility classes and Recharts presentation in focused passes. Use existing Tailwind v4, CSS variables, Recharts, and Lucide React; add no dependencies and do not split the 1075-line page unless an implementation blocker makes a focused extraction necessary.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vite, Recharts, Lucide React, existing `LanguageContext`, `NotificationContext`, `ThemeContext`, `AQIBadge`, `FadeIn`, and AQI utility functions.

## Global Constraints

- Preserve route `/`, the `Home` props interface, all existing navigation callbacks, station selection, search, geolocation, forecast filtering, notification behavior, chart tabs, map selection, bilingual copy, and light/dark themes.
- Preserve the existing section order and data rendering. Do not remove the complete seven-day forecast, pollutant cards, charts, map, health advice, notification settings, city comparisons, or indoor-air tips.
- Keep `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif` as the primary UI font stack; do not add Inter, Fira Sans, a serif, a remote font, or a new dependency.
- Use orange as the single primary brand accent for CTA, active, focus, and brand emphasis.
- Keep sky/blue, red, green, and AQI category colors only where they communicate location, weather, chart series, risk, trend, safe state, or AQI semantics.
- Use content typography of at least `text-sm` for readable body/advice content; reserve `text-xs` for metadata and remove `text-[10px]` from meaningful weather labels.
- Use `font-black` only for the H1 and primary AQI value; use `font-bold` or `font-semibold` for secondary headings and data values.
- Use card radius `rounded-2xl`, control radius `rounded-xl`, badge radius `rounded-lg`, and `rounded-full` only for true pill statuses. Keeping `rounded-3xl` is allowed only for the primary hero as a documented exception.
- Use strong shadows only for true overlays; ordinary cards should use a border or a light tinted card shadow.
- Do not use pure black/pure white as new theme colors, do not add decorative gradients/glows, and do not alter AQI semantic colors merely to force a monochrome page.
- Preserve visible keyboard focus states and do not communicate important state by color alone.
- Do not silently swallow errors or change existing user-visible locating, notification, empty-state, or search behavior.

---

## File Map and Responsibilities

| File | Responsibility in this plan |
|---|---|
| `frontend/src/styles/theme.css` | Define light/dark semantic surface, text, accent, chart, radius, and shadow tokens while preserving existing aliases. |
| `frontend/src/index.css` | Keep the Tailwind `font-sans` token aligned with `body`; add only typography role tokens if they are actually consumed. |
| `frontend/src/pages/Home.tsx` | Apply typography, color, radius, shadow, CTA, weather, forecast, health, pollutant, map, insight, and Recharts presentation changes. |
| `frontend/src/App.tsx` | Inspect only; modify only if the shell still references a conflicting page/background/text token after the shared token pass. |
| `frontend/package.json` | No change; existing `lint` and `build` scripts are the validation surface. |

The implementation must not create a second design system or a new component library. Existing shared components such as `AQIBadge` and `VietnamMap` remain consumers of their current APIs.

---

### Task 1: Establish semantic visual tokens and font alignment

**Files:**
- Modify: `frontend/src/styles/theme.css`
- Modify: `frontend/src/index.css` only if its current token needs a matching role alias
- Inspect: `frontend/src/App.tsx`
- Test: `frontend/src/styles/theme.css`, `frontend/src/index.css`

**Interfaces:**
- Consumes: Current `:root`, `.dark`, `body`, `.surface-card`, `.surface-card-header`, `.surface-border`, and Tailwind v4 `@theme`.
- Produces: Stable CSS variables for page/card/header surfaces, primary/secondary text, orange accent, focus, chart axis/grid/tooltip, radius, and card/overlay shadow.

- [ ] **Step 1: Record current token consumers before editing**

Run from the repository root:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
rg -n -- "--bg-|--border|--text-|--accent-|font-family|--font-sans|surface-card|surface-border|#0F172A|#334155|#94A3B8|#F8FAFC" frontend/src/index.css frontend/src/styles/theme.css frontend/src/App.tsx frontend/src/pages/Home.tsx
```

Expected: the command lists the existing aliases and all Home/chart consumers that must remain compatible.

- [ ] **Step 2: Add semantic token names without breaking existing aliases**

In `frontend/src/styles/theme.css`, add these semantic variables to `:root` and `.dark`, retaining the old variables as aliases so existing pages do not break:

```css
:root {
  --surface-page: #F8FAFC;
  --surface-card: #FFFFFF;
  --surface-subtle: #F1F5F9;
  --surface-header: #F1F5F9;
  --border-default: #D7E1E5;
  --text-primary: #0F172A;
  --text-secondary: #536671;
  --text-tertiary: #475569;
  --accent-primary: #C2410C;
  --accent-primary-hover: #9A3412;
  --accent-focus: #EA580C;
  --chart-axis: #64748B;
  --chart-grid: #CBD5E1;
  --chart-tooltip-surface: #FFFFFF;
  --chart-tooltip-border: #D7E1E5;
  --radius-card: 1rem;
  --radius-control: 0.75rem;
  --radius-badge: 0.5rem;
  --radius-pill: 9999px;
  --shadow-card: 0 1px 3px rgb(15 23 42 / 0.08);
  --shadow-overlay: 0 18px 40px rgb(15 23 42 / 0.16);
}

.dark {
  --surface-page: #0D171B;
  --surface-card: color-mix(in srgb, var(--surface-page) 95%, white 5%);
  --surface-subtle: color-mix(in srgb, var(--surface-page) 92%, white 8%);
  --surface-header: color-mix(in srgb, var(--surface-page) 90%, white 10%);
  --border-default: color-mix(in srgb, var(--surface-page) 88%, white 12%);
  --text-primary: #F8FAFC;
  --text-secondary: #CBD5E1;
  --text-tertiary: #94A3B8;
  --accent-primary: #E86F28;
  --accent-primary-hover: #FF9D62;
  --accent-focus: #FDBA74;
  --chart-axis: #CBD5E1;
  --chart-grid: #475569;
  --chart-tooltip-surface: #162329;
  --chart-tooltip-border: #40545C;
}

:root {
  --bg-primary: var(--surface-page);
  --bg-card: var(--surface-card);
  --bg-card-subtle: var(--surface-subtle);
  --bg-card-header: var(--surface-header);
  --border-color: var(--border-default);
  --text-main: var(--text-primary);
  --text-muted: var(--text-secondary);
}
```

Do not duplicate the `:root` block in a way that creates conflicting values; merge the aliases into the existing root block.

- [ ] **Step 3: Keep the font stack identical in `index.css` and `body`**

Verify `frontend/src/index.css` keeps:

```css
@theme {
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}
```

Verify `theme.css` `body` uses the same sans stack. Do not add `@import` for a remote font. If typography role variables are added, use only values actually consumed by Home:

```css
:root {
  --font-size-body: 0.875rem;
  --font-size-meta: 0.75rem;
  --line-height-body: 1.5rem;
  --line-height-meta: 1.25rem;
}
```

- [ ] **Step 4: Make shared surface helpers consume semantic aliases**

Keep `.surface-card`, `.surface-card-header`, and `.surface-border` behavior intact, but make their declarations resolve through `--surface-card`, `--surface-header`, and `--border-default`. Do not change dark-mode selector coverage used by existing components.

- [ ] **Step 5: Inspect the app shell for token conflict**

Inspect `frontend/src/App.tsx` at the root wrapper. If it still uses `text-slate-900 dark:text-slate-100` in a way that overrides the new semantic body text, change only that wrapper to:

```tsx
<div className="min-h-screen flex flex-col bg-[var(--surface-page)] text-[var(--text-primary)] transition-colors">
```

Do not change routing, lazy loading, `Suspense`, modals, or navigation.

- [ ] **Step 6: Validate the token foundation**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH\frontend"
npm run lint
npm run build
```

Expected: both commands pass, and existing components still compile against the old aliases.

- [ ] **Step 7: Review and checkpoint**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
git --no-pager diff --check
git --no-pager diff -- frontend/src/styles/theme.css frontend/src/index.css frontend/src/App.tsx
```

Confirm this task changed only shared tokens/font alignment and did not alter Home behavior.

---

### Task 2: Apply the shape system and typography hierarchy to search and hero

**Files:**
- Modify: `frontend/src/pages/Home.tsx:182-400`
- Test: `frontend/src/pages/Home.tsx`

**Interfaces:**
- Consumes: semantic CSS tokens from Task 1, current `currentStation`, `category`, `searchResults`, `handleDetectLocation`, `onSelectStation`, and `onNavigateToAlerts`.
- Produces: unchanged search/location and hero interactions with a consistent control/card radius, readable hero text, and orange-primary CTA treatment.

- [ ] **Step 1: Capture the current utility patterns in the target range**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
rg -n "rounded-|shadow-|text-\[10px\]|font-black|bg-sky|text-slate-400|text-black/|text-white/|backgroundColor|borderColor" frontend/src/pages/Home.tsx
```

Use the output to update only the Home presentation classes, not the state/handler logic.

- [ ] **Step 2: Normalize search input and autocomplete**

For the search input and autocomplete around lines 199-229:

- Change the input radius to `rounded-xl`.
- Replace `bg-white border-slate-200` combinations with the semantic surface/border convention already used by the project, for example `bg-[var(--surface-card)] border-[var(--border-default)]`.
- Keep `text-sm`.
- Keep a visible focus ring, using `focus:ring-[var(--accent-focus)]/20` or the closest valid Tailwind v4 arbitrary value.
- Keep the autocomplete as the only `shadow-overlay`-level surface; use `rounded-xl` or `rounded-2xl` consistently with the input.
- Change meaningful station/address text from `text-xs` to `text-sm` only where it improves readability without changing row density; retain metadata as `text-xs`.
- Preserve search focus, selection, clearing, AQIBadge rendering, and keyboard focus behavior.

- [ ] **Step 3: Normalize the location action**

Choose one consistent visual role and apply it to the geolocation button:

- Preferred primary-action option: use orange primary background and hover token.
- Utility option: use a neutral surface/border button with a sky location icon and sky status text.

Because the page has one primary orange accent, do not leave `bg-sky-700` as a second equally prominent CTA. Preserve disabled behavior, `isLocating`, icon animation, and the existing status message.

- [ ] **Step 4: Refine hero container hierarchy**

For the main hero around lines 254-342:

- Keep `rounded-3xl` only on this primary hero if desired; document it as the one hero exception.
- Replace the hero `shadow-xl` with a tinted card shadow or a lighter `shadow-lg`.
- Keep the dynamic AQI category border and category color because they communicate AQI state.
- Keep the H1 at `text-2xl sm:text-3xl lg:text-4xl font-black`.
- Change station ID from `font-black` to `font-semibold`.
- Keep the AQI numeric value at `text-5xl sm:text-6xl font-black`.
- Keep `AQIBadge` and category semantic colors.
- Change the category description from `text-xs` to `text-sm leading-6` if the two-column hero remains stable at desktop and mobile.
- Keep the health warning surface category-aware, but ensure its text and border remain readable in both modes.

- [ ] **Step 5: Normalize all six weather metric tiles**

For the six weather tiles around lines 352-396:

- Change each `rounded-lg` to `rounded-xl`.
- Change each `text-[10px]` label to `text-xs`; use `text-sm` only if the grid remains readable at 390px.
- Replace `text-black/60`, `text-white/60`, `text-black/85`, and `text-white/85` with semantic text classes/tokens that work in both modes.
- Keep the orange-tinted surface as a subordinate hero surface; do not add new accent colors, gradients, or glow.
- Keep values visually stronger than labels using `font-medium` or `font-semibold`, not `font-black`.
- If mobile wraps, reduce tile padding or use the existing responsive grid rather than returning to 10px text.

- [ ] **Step 6: Validate the search and hero pass**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH\frontend"
npm run lint
npm run build
```

Expected: both commands pass, station selection and location detection remain wired, and no state/handler imports were removed.

---

### Task 3: Apply typography and shape rules to forecast, health, notification, pollutants, map, and insights

**Files:**
- Modify: `frontend/src/pages/Home.tsx:402-790`
- Modify: `frontend/src/pages/Home.tsx:930-1075`
- Test: `frontend/src/pages/Home.tsx`

**Interfaces:**
- Consumes: existing `filteredForecast`, `selectedProvinceFilter`, health data, notification state, pollutant data, map callbacks, insights data, semantic tokens, and Task 2's page-level visual rules.
- Produces: consistent secondary cards and readable data content with the same CTA/radius/shadow policy.

- [ ] **Step 1: Normalize forecast wrappers and controls**

For the forecast header, select, empty state, desktop table, and mobile cards:

- Use `rounded-xl` for the region select and controls.
- Use `rounded-2xl` for the table/card wrapper instead of `rounded-3xl`.
- Replace `shadow-xl` with card shadow or border-only treatment.
- Keep the full `filteredForecast` render and the empty state callback to `onNavigateToForecast`.
- Keep table header uppercase only as a column-scanning aid; do not add uppercase to body content.
- Retain AQI category colors, orange maximum temperature, sky minimum temperature, and rain badges as semantic data colors.
- Increase forecast subtitle or advice-like copy to `text-sm leading-6` if it is currently used as readable explanatory text; retain dates and compact metadata at `text-xs`.

- [ ] **Step 2: Normalize health cards and risk badges**

For the health section:

- Change secondary health card containers from `rounded-3xl` to `rounded-2xl`.
- Keep risk badge `rounded-full` because it is a true status pill.
- Keep red/orange risk colors because they convey risk level.
- Change advice list content to `text-sm leading-6` where it is long enough to require reading; keep icon size and click-to-alert behavior.
- Replace any large shadow with border plus card shadow.

- [ ] **Step 3: Normalize notification settings**

For the notification section:

- Keep the existing threshold slider, preference update, permission request, and simulated alert behavior unchanged.
- Use `rounded-2xl` for the notification card.
- Keep the orange CTA as the only primary action accent.
- Validate button text against orange background in default, hover, focus, disabled, and dark mode.
- Keep the existing range control labels and ensure they do not become smaller than readable metadata.
- Remove no copy and do not introduce a second CTA intent.

- [ ] **Step 4: Normalize pollutant cards**

For pollutant cards:

- Use `rounded-xl`.
- Keep pollutant values larger than units and safe-limit metadata.
- Change secondary values from `font-black` to `font-bold` or `font-semibold`; reserve the strongest weight for the AQI hero and H1.
- Keep red/green trend colors and over-limit behavior as semantic states.
- Use semantic border tokens for the safe-limit divider.
- Retain station-selection click behavior and the “view detailed station specs” action.

- [ ] **Step 5: Normalize map CTA and insight cards**

For map and insight sections:

- Use the same orange primary CTA style for “view full map” and other primary navigation actions.
- Use `rounded-2xl` for insight card containers and `rounded-xl` for inner rows/controls.
- Keep clock/activity/leaf icon colors only as utility or semantic meanings.
- Keep city comparison station selection and indoor-air advice unchanged.
- Replace strong secondary shadows with border/card shadow.
- Increase advice paragraph readability to `text-sm leading-6` where the text is instructional rather than metadata.

- [ ] **Step 6: Scan for shape and weight regressions**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
rg -n "rounded-3xl|shadow-(xl|2xl)|font-black|text-\[10px\]|text-black/|text-white/" frontend/src/pages/Home.tsx
```

Expected: remaining `rounded-3xl` is only the documented hero exception, remaining strong shadows are limited to overlay/primary hierarchy, `font-black` is limited to H1/AQI, and `text-[10px]` is absent from meaningful content.

- [ ] **Step 7: Validate secondary sections**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH\frontend"
npm run lint
npm run build
```

Expected: both commands pass, forecast filtering still renders all matching days, health/notification/pollutant/map/insight click actions remain unchanged.

---

### Task 4: Make Recharts presentation theme-aware and readable

**Files:**
- Modify: `frontend/src/pages/Home.tsx:790-930`
- Modify: `frontend/src/styles/theme.css` if a chart token from Task 1 is missing
- Test: `frontend/src/pages/Home.tsx`

**Interfaces:**
- Consumes: `chartTab`, `HOURLY_AQI_DATA_24H`, `pollutantDataForBarChart`, `SEVEN_DAY_FORECAST`, CSS chart tokens, and existing Recharts components.
- Produces: the same three charts and data series with theme-aware tooltip, axis, grid, and restrained semantic colors.

- [ ] **Step 1: Inventory all hard-coded chart values**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
rg -n "#0F172A|#334155|#94A3B8|#F8FAFC|stopColor|stroke=|fill=|fontSize" frontend/src/pages/Home.tsx
```

Expected: all tooltip, grid, axis, gradient, line, and bar values are listed before replacement.

- [ ] **Step 2: Replace tooltip surface and border colors**

For every Recharts `Tooltip`:

```tsx
contentStyle={{
  backgroundColor: 'var(--chart-tooltip-surface)',
  borderColor: 'var(--chart-tooltip-border)',
  borderRadius: '12px',
  color: 'var(--text-primary)',
  fontSize: '12px',
}}
```

Do not use the old dark-only `#0F172A` tooltip in light mode. Preserve tooltip labels, data keys, cursor behavior, and chart tab state.

- [ ] **Step 3: Replace axis and grid colors**

For every `CartesianGrid`, `XAxis`, and `YAxis`:

- Use `var(--chart-grid)` for grid.
- Use `var(--chart-axis)` for axis text/strokes.
- Keep `fontSize: 11` only if the visual check confirms readability; otherwise use `fontSize: 12`.
- Keep `tickLine={false}` and existing margins unless layout regression requires a minimal adjustment.

- [ ] **Step 4: Reconcile chart series colors with the color lock**

Use the orange primary token for the main AQI series:

```tsx
stroke="var(--accent-primary)"
```

Use the existing blue token or a semantic blue value for PM2.5/secondary series. Keep red for above-safe pollutant bars and green only where the data meaning is safe/decreasing. Do not use chart series colors as button or navigation accents.

For gradients, set the same semantic series color through CSS variables where Recharts supports it. Preserve opacity differences between the top and bottom stops.

- [ ] **Step 5: Normalize chart container shape**

Change the chart wrapper to `rounded-2xl` and card-level shadow/border treatment. Keep the tab group at `rounded-xl`, active tab at `rounded-lg`, and preserve all three tab buttons and labels.

- [ ] **Step 6: Validate chart rendering**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH\frontend"
npm run lint
npm run build
```

Expected: Recharts TypeScript props compile, all three tabs render, and no hard-coded dark tooltip remains.

- [ ] **Step 7: Verify chart token usage**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
rg -n "#0F172A|#334155|#94A3B8|backgroundColor: '#|borderColor: '#|color: '#" frontend/src/pages/Home.tsx
```

Expected: no old hard-coded tooltip/axis/grid colors remain in Home; any remaining color must be a deliberate AQI/series semantic value documented by the implementation.

---

### Task 5: Run responsive, theme, accessibility, and regression verification

**Files:**
- Inspect: `frontend/src/pages/Home.tsx`
- Inspect: `frontend/src/styles/theme.css`
- Inspect: `frontend/src/index.css`
- Test: `frontend` lint/build plus manual browser verification

**Interfaces:**
- Consumes: completed token and Home presentation changes from Tasks 1-4.
- Produces: evidence that behavior is preserved across light/dark, desktop/mobile, interactive states, and all Home sections.

- [ ] **Step 1: Run static validation**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH\frontend"
npm run lint
npm run build
```

Expected: both commands exit with code 0.

- [ ] **Step 2: Check the final consistency scans**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
rg -n "text-\[10px\]|font-black|rounded-3xl|shadow-(xl|2xl)|bg-sky-[0-9]+.*text-white|#0F172A|#334155|#94A3B8|text-black/|text-white/" frontend/src/pages/Home.tsx
git --no-pager diff --check
```

Expected:

- `text-[10px]` is absent from meaningful labels/body.
- `font-black` is limited to H1/AQI or a documented exception.
- `rounded-3xl` is only the hero exception, if retained.
- Strong shadows are limited to autocomplete/true elevated surfaces.
- Old hard-coded chart colors and opacity text patterns are removed or explicitly justified.
- `git diff --check` reports no whitespace errors.

- [ ] **Step 3: Start the local frontend for visual verification**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH\frontend"
npm run dev -- --host 127.0.0.1
```

Open the reported local URL in the browser. Do not change source files during this verification step unless a concrete regression is found.

- [ ] **Step 4: Verify light and dark desktop states**

At approximately 1280px wide, inspect both theme modes:

1. Page background, hero surface, forecast/table, health, notification, pollutants, charts, map, and insights remain one coherent theme.
2. Orange primary CTA is consistent across location/navigation/notification/map actions.
3. AQI category colors still communicate risk.
4. Tooltip surface changes correctly between light and dark.
5. No card shadow dominates the hero hierarchy.
6. Focus rings remain visible when tabbing through search, controls, buttons, select, tabs, and CTA.

- [ ] **Step 5: Verify mobile at approximately 390px**

Check:

1. Search and location controls remain usable without horizontal overflow.
2. Weather labels and values remain readable and do not overlap.
3. Forecast mobile cards remain accessible and the desktop table stays hidden at the intended breakpoint.
4. Notification slider labels do not collide.
5. Chart tabs remain reachable and chart axes do not become unreadable.
6. All card radius changes preserve clipping, hover, and click affordances.

- [ ] **Step 6: Verify interactive behavior**

Exercise each existing path:

1. Type a station query and select an autocomplete result.
2. Trigger geolocation and observe locating/success/fallback status.
3. Click AQI hero and pollutant cards to open station details.
4. Change forecast province filter and confirm all matching days remain present.
5. Switch all three chart tabs.
6. Adjust and save notification threshold.
7. Open alerts, forecast, and maps through their existing callbacks.
8. Select a station on the map and click city comparisons.

Expected: no callback, state, navigation, or status behavior changes.

- [ ] **Step 7: Record final diff review**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
git --no-pager diff --stat
git --no-pager diff -- frontend/src/pages/Home.tsx frontend/src/styles/theme.css frontend/src/index.css frontend/src/App.tsx
```

Confirm that the diff is limited to the approved typography, color, shape, chart-theme, and necessary app-shell token updates. Do not include unrelated cleanup.

- [ ] **Step 8: Commit the completed visual pass**

After all checks pass:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
git add frontend/src/pages/Home.tsx frontend/src/styles/theme.css frontend/src/index.css frontend/src/App.tsx
git commit -m "refactor: align Home visual consistency"
```

The commit must include:

```text
Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>
```

Do not commit unrelated existing worktree changes.

---

## Self-review against the approved spec

- **Typography:** covered by Tasks 1-3 and final scans: system sans alignment, readable body minimum, weather label increase, weight redistribution, and line-height guidance.
- **Color tokens:** covered by Task 1; old aliases are preserved for existing pages.
- **Color Consistency Lock:** covered by Tasks 2-4: orange primary accent, semantic sky/red/green/AQI exceptions, and no second CTA accent.
- **Shape Consistency Lock:** covered by Tasks 2-4: card/control/badge/pill radius policy, hero-only `rounded-3xl` exception, and shadow reduction.
- **Chart light/dark parity:** covered by Task 4 with exact Recharts tooltip/axis/grid replacements.
- **Theme/app-shell parity:** covered by Task 1 inspection of `App.tsx`.
- **Accessibility:** covered by Tasks 2-5 through focus preservation, contrast checks, and keyboard/manual verification.
- **Behavior preservation:** covered by global constraints and Task 5 interaction checks.
- **No dependency or route changes:** explicit in global constraints and file map.

No unresolved placeholders, `TODO`, or unspecified “handle later” steps remain in this plan.
