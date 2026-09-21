# Neutral Dark Page Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the existing neutral dark theme tokens to every card, panel, control, and chart surface in `Maps`, `HealthAlerts`, `Forecast`, and `AboutUs` without changing page backgrounds or semantic AQI/alert colors.

**Architecture:** Keep the shared theme token definitions as the source of truth. Update only page-level utility classes and the Forecast Recharts tooltip/grid colors so all dark surfaces use `surface-card`, `surface-card-header`, `surface-border`, `var(--bg-card-header)`, and `var(--border-color)`.

**Tech Stack:** React, TypeScript, Tailwind CSS utilities, Recharts, Vite.

## Global Constraints

- Only adjust dark-mode backgrounds and borders for cards, panels, controls, inputs, and chart surfaces in the four requested pages.
- Keep the page background, text colors, AQI colors, alert colors, icon colors, and chart series colors unchanged.
- Reuse `dark:surface-card`, `dark:surface-card-header`, and `surface-border`.
- Use `var(--bg-card-header)` and `var(--border-color)` for the Forecast chart tooltip background and border.
- Do not change behavior, data, responsive layout, or light mode.

---

### Task 1: Applying neutral dark surface tokens to the requested pages

**Files:**
- Modify: `frontend/src/pages/Maps.tsx`
- Modify: `frontend/src/pages/HealthAlerts.tsx`
- Modify: `frontend/src/pages/Forecast.tsx`
- Modify: `frontend/src/pages/AboutUs.tsx`
- Test: existing frontend build/type-check command defined in `frontend/package.json`

**Interfaces:**
- Consumes: Existing CSS theme tokens from `frontend/src/styles/theme.css`.
- Produces: The same page components and behavior, with dark-mode surfaces mapped to the shared neutral tokens.

- [ ] **Step 1: Record the current targeted dark-surface occurrences**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
rg -n "dark:bg-slate|#0F172A|#334155|bg-white" frontend/src/pages/Maps.tsx frontend/src/pages/HealthAlerts.tsx frontend/src/pages/Forecast.tsx frontend/src/pages/AboutUs.tsx
```

Expected: The command lists the existing dark card/control classes and Forecast chart colors that will be replaced, while semantic red/orange/green/AQI colors remain identifiable.

- [ ] **Step 2: Update Maps surfaces without changing map or AQI colors**

In `frontend/src/pages/Maps.tsx`:

```tsx
// Layer selector and active chips
<div className="... p-1 dark:surface-card ...">
  <button className={activeLayer === 'aqi'
    ? '... bg-white dark:surface-card-header text-orange-500 ...'
    : '...'} />
</div>

// Timeline panel and station panel
<div className="... bg-white dark:surface-card border border-slate-200 surface-border ...">

// Secondary controls and search/list rows
className="... bg-slate-100 dark:surface-card-header ..."
className="... bg-slate-50 dark:surface-card ..."
className="... border-slate-100 dark:surface-border dark:bg-transparent ..."
```

Preserve the map component, orange playback button, station AQI badges, text colors, and light-mode classes. Use `surface-border` on the existing bordered panels rather than introducing new hex values.

- [ ] **Step 3: Update HealthAlerts surfaces while preserving semantic alert colors**

In `frontend/src/pages/HealthAlerts.tsx`, change only the neutral card/panel surfaces:

```tsx
className="... bg-white dark:surface-card border border-red-200 dark:border-red-950/60 ..."
className="... bg-slate-50 dark:surface-card-header border border-slate-200/80 surface-border ..."
className="... border bg-white dark:surface-card ..."
```

Keep the red alert border, red severity badge, red icon panel, and AQI category inline `backgroundColor`, `borderColor`, and `color` values unchanged because they carry meaning.

- [ ] **Step 4: Update Forecast cards and chart surfaces**

In `frontend/src/pages/Forecast.tsx`:

```tsx
// City selector, forecast cards, chart panel, and hourly cards
className="... bg-white dark:surface-card border border-slate-200 surface-border ..."

// Today's semantic highlight remains unchanged
className="... bg-orange-50/40 dark:bg-orange-950/20 ..."
```

Update the Recharts neutral chart styling without changing series colors:

```tsx
<CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.35} vertical={false} />
<Tooltip
  contentStyle={{
    backgroundColor: 'var(--bg-card-header)',
    borderColor: 'var(--border-color)',
    borderRadius: '12px',
    color: '#F8FAFC',
    fontSize: '12px',
  }}
/>
```

Use `dark:surface-card-header` for the native select option background if the existing utility remains necessary. Keep the AQI badge inline colors, orange today state, and all chart line colors unchanged.

- [ ] **Step 5: Update AboutUs cards and form controls**

In `frontend/src/pages/AboutUs.tsx`, apply the shared tokens to data source cards, team cards, contact form panel, and neutral inputs:

```tsx
className="... bg-white dark:surface-card border border-slate-200 surface-border ..."
className="... bg-slate-50 dark:surface-card-header border border-slate-200 surface-border ..."
```

Keep the orange mission badge, blue data-source badge, gradient team avatars, and green success message unchanged. Do not alter form behavior or input labels.

- [ ] **Step 6: Verify no stale dark blue surfaces remain in the four pages**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
rg -n "dark:bg-slate-(800|900|950)|backgroundColor: '#0F172A'|borderColor: '#334155'" frontend/src/pages/Maps.tsx frontend/src/pages/HealthAlerts.tsx frontend/src/pages/Forecast.tsx frontend/src/pages/AboutUs.tsx
```

Expected: No matches for the replaced neutral surfaces or Tooltip colors. Any remaining `dark:bg-slate-*` match must be a deliberately preserved semantic or non-card style; if one is found in scope, replace it with the appropriate shared token before proceeding.

- [ ] **Step 7: Run the existing frontend validation**

Inspect `frontend/package.json` and run the existing build/type-check script, for example:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH\frontend"
npm run build
```

Expected: Vite completes successfully with no TypeScript or CSS compilation errors.

- [ ] **Step 8: Review the final diff and commit the implementation**

Run:

```powershell
Set-Location "C:\.Study at Home\.NCKH\NCKH"
git --no-pager diff --check
git --no-pager status --short
git --no-pager diff -- frontend/src/pages/Maps.tsx frontend/src/pages/HealthAlerts.tsx frontend/src/pages/Forecast.tsx frontend/src/pages/AboutUs.tsx
```

Confirm only the four requested pages contain implementation changes, then commit:

```powershell
git add -- frontend/src/pages/Maps.tsx frontend/src/pages/HealthAlerts.tsx frontend/src/pages/Forecast.tsx frontend/src/pages/AboutUs.tsx
git commit -m "style: apply neutral dark surfaces to pages" -m "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
```
