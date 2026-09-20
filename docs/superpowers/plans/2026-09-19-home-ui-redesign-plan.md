# Home UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the AirVision VN Home page into a calm, trustworthy AQI dashboard that prioritizes current AQI, daily health actions, and a complete seven-day forecast without changing existing product capabilities or routes.

**Architecture:** Keep the current React page behavior and data sources, but reorganize the Home presentation into clearer visual layers. Use shared theme tokens for surfaces, a system-first typography stack, semantic AQI colors, responsive forecast layouts, and accessible interactive controls. Prefer focused edits to `Home.tsx`, `theme.css`, and `index.css`; only split components if the implementation makes the existing page harder to reason about.

**Tech Stack:** React 19, TypeScript, Tailwind CSS 4, Vite, Recharts, Lucide React, existing AirVision contexts and mock/API data.

## Global Constraints

- Preserve all existing Home capabilities: station search, location detection, current AQI, pollutants, charts, map, health advice, notifications, city comparison, indoor-air tips, and forecast data.
- Keep the routes `/`, `/maps`, `/forecast`, `/alerts`, and `/about` unchanged.
- Home must display the complete forecast for all seven days; never replace it with a three-day preview.
- Keep AirVision branding, logo, bilingual support, authentication, notification behavior, station selection, and light/dark themes.
- Use `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif` as the primary UI font stack.
- Use one orange brand accent for primary actions; reserve other colors for semantic AQI, health, success, warning, and informational meanings.
- Do not introduce a new dependency or remote font dependency.
- Preserve existing data contracts and event callback signatures.
- Use visible keyboard focus states and do not communicate important AQI meaning by color alone.
- Do not silently swallow search, geolocation, chart, or notification errors; preserve existing user-visible status behavior and make new states explicit.

---

### Task 1: Establish the shared typography and visual tokens

**Files:**
- Modify: `frontend/src/index.css`
- Modify: `frontend/src/styles/theme.css`
- Test: `frontend/src/index.css`
- Test: `frontend/src/styles/theme.css`

**Interfaces:**
- Consumes: Existing Tailwind v4 setup and current `:root`/`.dark` theme variables.
- Produces: Shared system typography tokens and surface/color variables consumed by Home and existing pages.

- [ ] **Step 1: Record the current typography and token usage**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
rg -n "Fira Sans|Fira Code|font-family|--font-sans|--font-mono|--bg-primary|--bg-card|--accent-" frontend/src/index.css frontend/src/styles/theme.css
```

Expected: The command identifies the Google Fonts import, the Fira font tokens, the body font declaration, and the current light/dark color variables.

- [ ] **Step 2: Replace the primary UI font stack**

In `frontend/src/index.css`, remove the Fira Google Fonts import and set the Tailwind font tokens to:

```css
@theme {
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}
```

Keep the Tailwind import and dark variant declarations intact. Do not add another external font request.

- [ ] **Step 3: Align the body and typography roles**

In `frontend/src/styles/theme.css`, update the `body` declaration to:

```css
body {
  background-color: var(--bg-primary);
  color: var(--text-main);
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif;
  overflow-x: hidden;
  transition: background-color 0.25s ease, color 0.25s ease;
}
```

Use the following roles during later Home edits:

```text
Display: 700-800 weight, line-height 1.05-1.15, tight tracking
Heading: 650-750 weight, line-height 1.2-1.3
Body: 400-500 weight, line-height 1.45-1.6
Metadata: 500-650 weight, 12-14px, line-height 1.3-1.4
Technical data: the mono token only when alignment or raw data semantics justify it
```

- [ ] **Step 4: Add only the shared tokens needed by the redesign**

Keep existing token names used by current components. If new aliases are needed, add them without deleting existing variables:

```css
:root {
  --bg-primary: #F4F7F9;
  --bg-card: #FFFFFF;
  --bg-card-subtle: #EAF0F3;
  --bg-card-header: #EAF0F3;
  --border-color: #D7E1E5;
  --text-main: #10212B;
  --text-muted: #536671;
  --accent-orange: #E86F28;
  --accent-orange-strong: #B94F16;
  --accent-blue: #247A9B;
}
```

For `.dark`, use:

```css
.dark {
  --bg-primary: #0D171B;
  --bg-card: #142329;
  --bg-card-subtle: #1B3037;
  --bg-card-header: #1B3037;
  --border-color: #2B444C;
  --text-main: #EFF6F7;
  --text-muted: #A9BEC4;
  --accent-orange: #F18A4A;
  --accent-orange-strong: #FF9D62;
  --accent-blue: #55A9C5;
}
```

Preserve semantic AQI colors in `aqi.util.ts` and preserve existing API/data behavior. Do not globally recolor unrelated pages unless the shared token change is required for consistency.

- [ ] **Step 5: Validate the token and font changes**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH\frontend"
npm run lint
npm run build
```

Expected: TypeScript and Vite complete successfully. No Google Fonts request or Fira font reference remains in `index.css` or `theme.css`.

- [ ] **Step 6: Review the diff**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
git --no-pager diff --check
git --no-pager diff -- frontend/src/index.css frontend/src/styles/theme.css
```

Confirm that the changes are limited to typography and shared visual tokens.

### Task 2: Rebuild the Home hierarchy around current AQI and daily actions

**Files:**
- Modify: `frontend/src/pages/Home.tsx`
- Modify: `frontend/src/components/Header.tsx` only if the compact responsive header requires it
- Test: existing frontend lint and build commands

**Interfaces:**
- Consumes: `HomeProps`, `VIETNAM_STATIONS`, `SEVEN_DAY_FORECAST`, `getAQICategory`, language/theme/notification contexts, and existing navigation callbacks.
- Produces: The same `Home` component and callback behavior, with a clearer visual order and responsive layout.

- [ ] **Step 1: Record the current section order and fixed layout constraints**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
rg -n "HERO SECTION|w-\\[120px\\]|translate-y|SEVEN_DAY_FORECAST|section|onNavigateToForecast|onNavigateToAlerts" frontend/src/pages/Home.tsx
```

Expected: The command identifies the current hero, fixed-width weather cells, translated metric group, forecast rendering, and navigation handlers.

- [ ] **Step 2: Define the new presentation order without changing data behavior**

Keep the existing state, memoized values, handlers, and imported data. Reorder the rendered sections into:

```text
1. Search and location controls
2. Current station hero: station identity, AQI, category, advisory, primary actions
3. Daily decision strip: complete seven-day forecast, PM2.5 priority, best outdoor hours
4. Pollutant detail cards
5. Charts
6. Vietnam map
7. Health advice and notification settings
8. City comparisons and indoor-air tips
```

The forecast section must still render all entries in `filteredForecast`, and the filter must continue to work.

- [ ] **Step 3: Make AQI the strongest visual element**

Keep the existing `currentStation`, `category`, `AQIBadge`, `onSelectStation`, and `onNavigateToAlerts` behavior. Refine the hero so it has:

```tsx
<section aria-labelledby="current-air-quality-title">
  <h1 id="current-air-quality-title">{currentStation.name}</h1>
  <p>{currentStation.address}</p>
  <div>
    <span aria-label={`AQI ${Math.round(currentStation.aqi)}`}>
      {Math.round(currentStation.aqi)}
    </span>
    <AQIBadge aqi={currentStation.aqi} size="lg" />
  </div>
  <p>{category.description...}</p>
  <button onClick={() => onSelectStation(currentStation)}>View station details</button>
  <button onClick={onNavigateToAlerts}>View health advice</button>
</section>
```

Use the existing bilingual translation/context pattern rather than hardcoding English-only visible copy. If a translation key does not exist, add the key in the existing language resource structure instead of duplicating conditional strings inside the page.

- [ ] **Step 4: Replace fixed metric sizing with a responsive grid**

Replace each fixed `w-[120px]` weather cell and the `lg:translate-y-[50%]` layout with a responsive grid:

```tsx
<div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full">
  {/* temperature, humidity, wind, UV, visibility, pressure */}
</div>
```

Keep all existing metric values and icons. Use `min-w-0`, readable labels, and a stable cell height so long translated labels do not overflow.

- [ ] **Step 5: Reduce card repetition without removing functionality**

Use the shared surface/border classes consistently:

```text
Primary surface: bg-white dark:surface-card
Secondary surface: bg-slate-50 dark:surface-card-header
Border: border-slate-200 surface-border
```

Use stronger shadow only for the hero, dropdown, and modal-like surfaces. Keep AQI semantic colors and warning colors unchanged where they communicate meaning.

- [ ] **Step 6: Add accessible interaction semantics**

For every interactive element in the changed Home sections:

- Use a native `button` or `a` where possible.
- If a card remains a `div`, add keyboard interaction, `role="button"`, and an accessible label.
- Add `aria-label` to icon-only controls.
- Preserve visible focus using `focus-visible:ring-2 focus-visible:ring-orange-500`.
- Do not make the category color the only indication of risk.

- [ ] **Step 7: Validate the Home hierarchy**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH\frontend"
npm run lint
npm run build
```

Expected: The existing page compiles with the same callback signatures and no TypeScript errors.

### Task 3: Keep the complete seven-day forecast readable on desktop and mobile

**Files:**
- Modify: `frontend/src/pages/Home.tsx`
- Modify: language resource file only if a new forecast label is required
- Test: existing frontend lint/build; manual responsive verification

**Interfaces:**
- Consumes: `filteredForecast`, `SEVEN_DAY_FORECAST`, `selectedProvinceFilter`, `setSelectedProvinceFilter`, `onNavigateToForecast`, `getAQICategory`, and language context.
- Produces: A Home forecast section that always renders seven forecast days when seven days are available, with usable desktop and mobile layouts.

- [ ] **Step 1: Establish the seven-day requirement in the rendering logic**

Do not use `slice(0, 3)`, a three-item preview array, or any conditional that hides days 4-7. The rendered source must remain:

```tsx
{filteredForecast.map((item, index) => {
  // Render every forecast item, including days 4-7.
})}
```

If the product data can contain fewer than seven entries, show an explicit “forecast data unavailable” state rather than pretending the forecast is complete.

- [ ] **Step 2: Improve the desktop seven-day table**

Keep all seven rows and the province filter. Preserve these fields:

```text
Day and date
Location
AQI category
AQI value
Maximum/minimum temperature
Condition
Rain probability
```

Remove row numbering if it does not help users. Use a horizontally scrollable table wrapper only as a fallback for narrow desktop widths; do not allow the entire page to overflow.

- [ ] **Step 3: Improve the mobile seven-day layout**

Keep the existing mobile card approach, but render all seven cards:

```tsx
<div className="grid grid-cols-1 gap-3 md:hidden">
  {filteredForecast.map((item, index) => (
    <article key={item.id}>
      {/* day, date, location, AQI, temperature, condition, rain probability */}
    </article>
  ))}
</div>
```

Use semantic `<article>` elements or buttons when the entire card navigates. Do not hide cards behind a three-day “show more” interaction because the seven-day forecast is mandatory.

- [ ] **Step 4: Make forecast semantics independent of color**

Keep `AQIBadge` and the category label together. Ensure high-AQI row highlighting also contains text such as the category and does not rely only on a tinted background.

- [ ] **Step 5: Add explicit forecast empty/error handling**

When `filteredForecast.length === 0`, render a visible neutral state with:

```text
Forecast unavailable for the selected province.
Try another province or open the Forecast page.
```

Use the existing bilingual translation pattern. Do not render an empty table or a success-looking blank card.

- [ ] **Step 6: Verify the seven-day requirement**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
rg -n "slice\\(0, 3\\)|slice\\(0,3\\)|three-day|three days|filteredForecast\\.map|SEVEN_DAY_FORECAST" frontend/src/pages/Home.tsx
```

Expected: No three-day truncation exists. Both desktop and mobile layouts use the complete `filteredForecast.map(...)` collection.

Then run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH\frontend"
npm run lint
npm run build
```

### Task 4: Verify responsive, theme, typography, and accessibility acceptance criteria

**Files:**
- Modify only if verification finds an issue: `frontend/src/pages/Home.tsx`, `frontend/src/index.css`, `frontend/src/styles/theme.css`, `frontend/src/components/Header.tsx`
- Test: frontend build/type-check and manual browser verification

**Interfaces:**
- Consumes: Completed Home hierarchy, seven-day forecast rendering, shared tokens, and typography stack from Tasks 1-3.
- Produces: Verified implementation that meets the product and accessibility criteria below.

- [ ] **Step 1: Run static validation**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH\frontend"
npm run lint
npm run build
```

Expected: Both commands pass without TypeScript, Tailwind, or Vite errors.

- [ ] **Step 2: Verify the font stack and forecast range**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
rg -n "Fira Sans|Fira Code|font-family|SF Pro Text|filteredForecast\\.map|slice\\(0, 3\\)|three-day" frontend/src/index.css frontend/src/styles/theme.css frontend/src/pages/Home.tsx
```

Expected:

- The primary UI stack contains `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif`.
- Fira Sans/Fira Code are not used for ordinary UI text.
- Seven-day forecast rendering uses the full collection.
- No three-day truncation remains.

- [ ] **Step 3: Check desktop behavior**

Open the Home route in the existing frontend dev server and verify at a desktop viewport:

```text
The current AQI is the first dominant value.
The hero does not have an awkward translated metric group.
Search and location controls are aligned.
All seven forecast rows are visible without page-level horizontal overflow.
The province filter still changes the forecast collection.
Station selection, map navigation, forecast navigation, and alerts navigation still work.
```

- [ ] **Step 4: Check mobile behavior**

Verify at a narrow mobile viewport:

```text
The header controls do not overlap the logo.
The hero stacks into one column.
Weather metrics use a two-column grid and do not clip labels.
All seven forecast cards are reachable and understandable.
Charts do not clip their tooltip or force page-level horizontal scrolling.
The search dropdown remains within the viewport.
```

- [ ] **Step 5: Check both themes and language**

Verify light mode, dark mode, Vietnamese, and English:

```text
Text remains readable in both themes.
Brand orange is used for primary action, not every status.
AQI category and alert meaning remain visible as text.
Vietnamese diacritics render correctly in every typography role.
Long English and Vietnamese labels do not overlap or clip.
```

- [ ] **Step 6: Check keyboard and reduced motion behavior**

Use keyboard navigation and verify:

```text
Search, location, tabs, filters, forecast cards, station cards, and CTA buttons can receive focus.
Focused controls have a visible ring.
Icon-only controls have accessible names.
Reduced-motion preference disables or reduces FadeIn, map pulse, and hover movement.
```

- [ ] **Step 7: Review the final diff**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
git --no-pager diff --check
git --no-pager status --short
git --no-pager diff -- frontend/src/index.css frontend/src/styles/theme.css frontend/src/pages/Home.tsx frontend/src/components/Header.tsx
```

Confirm that the implementation does not change routes, data contracts, API behavior, or unrelated pages.

