# Lighter Dark Card Surfaces Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make all separate dark-mode cards and boxed controls use lighter neutral charcoal surfaces without changing the dark page background or semantic accent colors.

**Architecture:** Update the shared dark theme tokens in `frontend/src/styles/theme.css` for the primary and secondary surfaces. Then replace dark utility classes and gradients that bypass those tokens in the frontend components/pages with the shared neutral surface colors, preserving existing borders, typography, hover states, and AQI-specific backgrounds.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vite.

## Global Constraints

- Keep the page-level dark background at `#0b0f17`.
- Use `#242933` for primary dark card surfaces.
- Use `#2d333d` for secondary dark surfaces such as metrics, inputs, and subtle controls.
- Do not alter light mode.
- Keep semantic AQI/status surfaces, alert colors, icon colors, borders, and interaction states unchanged.
- Do not add dependencies or new test tooling.

---

### Task 1: Update shared dark surface tokens

**Files:**
- Modify: `frontend/src/styles/theme.css:12-21`

**Interfaces:**
- Consumes: Existing `--bg-primary`, `--bg-card`, `--bg-card-subtle`, and `--accent-navy` custom properties.
- Produces: Shared dark-mode surface values used by token-based panels and future surface overrides.

- [ ] **Step 1: Update the dark theme values**

In the `.dark` block, keep `--bg-primary: #0B0F17` unchanged and set:

```css
--bg-card: #242933;
--bg-card-subtle: #2D333D;
--accent-navy: #2D333D;
```

Leave `--border-color`, text colors, and accent colors unchanged.

- [ ] **Step 2: Inspect the diff for light-mode safety**

Run: `git diff -- frontend/src/styles/theme.css`

Expected: Only the dark-mode surface values change; the `:root` block and semantic accent variables are untouched.

- [ ] **Step 3: Commit the token change**

```bash
git add frontend/src/styles/theme.css
git commit -m "style: lighten dark theme surface tokens"
```

### Task 2: Normalize dark utility surfaces across frontend panels

**Files:**
- Modify: `frontend/src/pages/Home.tsx`
- Modify: `frontend/src/pages/AboutUs.tsx`
- Modify: `frontend/src/pages/Forecast.tsx`
- Modify: `frontend/src/pages/HealthAlerts.tsx`
- Modify: `frontend/src/pages/Maps.tsx`
- Modify: `frontend/src/components/AuthModal.tsx`
- Modify: `frontend/src/components/Footer.tsx`
- Modify: `frontend/src/components/Header.tsx`
- Modify: `frontend/src/components/NotificationToast.tsx`
- Modify: `frontend/src/components/PrivacyModal.tsx`

**Interfaces:**
- Consumes: The surface tokens from Task 1 and existing Tailwind dark-mode utility classes.
- Produces: Consistent `#242933` primary panels and `#2d333d` secondary controls throughout dark mode.

- [ ] **Step 1: Inventory bypassing dark classes**

Run:

```bash
rg -n "dark:bg-slate-(900|800)|dark:from-slate|dark:to-slate" frontend/src
```

Classify each match as a primary card/panel, secondary control/input/metric, page/header background, or semantic colored surface. Do not change the page background or semantic colored surface categories.

- [ ] **Step 2: Replace primary card surfaces**

In `frontend/src/styles/theme.css`, add these reusable classes after the existing `.dark .glass-panel` rule:

```css
.dark .surface-card {
  background-color: var(--bg-card);
}

.dark .surface-subtle {
  background-color: var(--bg-card-subtle);
}
```

For primary cards, modals, tables, charts, and notification panels currently using `dark:bg-slate-900`, add `surface-card` and remove only the `dark:bg-slate-900` token. For secondary controls currently using `dark:bg-slate-800*`, add `surface-subtle` and remove only the dark slate background token. Keep the existing `bg-white` or `bg-slate-50` light-mode class and all border/text classes.

The resulting pattern must preserve light mode, for example:

```tsx
className="... bg-white surface-card border border-slate-200 dark:border-slate-800 ..."
```

- [ ] **Step 3: Replace secondary surfaces**

For metrics, inputs, segmented controls, table headers, and subtle boxed controls currently using `dark:bg-slate-800`, `dark:bg-slate-800/60`, `dark:bg-slate-800/80`, or `dark:bg-slate-800/50`, use the shared secondary surface mapping to `var(--bg-card-subtle)` while preserving opacity only when it is part of an intentional hover/overlay effect.

- [ ] **Step 4: Neutralize the Home notification gradient**

In `frontend/src/pages/Home.tsx`, replace the notification panel's `dark:from-slate-900 dark:to-slate-950` gradient with the primary dark card surface so it no longer renders as a blue-black block. Keep the orange glow overlay and all text/controls unchanged.

- [ ] **Step 5: Preserve semantic exceptions**

Do not replace classes under `dark:bg-orange-*`, `dark:bg-red-*`, `dark:bg-sky-*`, `dark:bg-emerald-*`, `dark:bg-purple-*`, or other AQI/status-colored backgrounds. These communicate state and are outside the neutral card-surface change.

- [ ] **Step 6: Verify all remaining dark classes are intentional**

Run:

```bash
rg -n "dark:bg-slate-(900|800)|dark:from-slate|dark:to-slate" frontend/src
```

Expected: Remaining matches are limited to page-level/header backgrounds, range-track styling, intentional hover states, or documented semantic exceptions; no primary card remains blue-black.

- [ ] **Step 7: Commit the panel normalization**

```bash
git add frontend/src/pages frontend/src/components frontend/src/styles/theme.css
git commit -m "style: use lighter charcoal surfaces across dark cards"
```

### Task 3: Validate the frontend build and type-check

**Files:**
- Test: `frontend/package.json` scripts
- Inspect: All files changed in Tasks 1-2

**Interfaces:**
- Consumes: The completed dark surface token and class changes.
- Produces: Build/type-check evidence that the UI remains compilable and type-safe.

- [ ] **Step 1: Run TypeScript validation**

Run: `npm run lint --prefix frontend`

Expected: `tsc --noEmit` completes successfully with exit code 0.

- [ ] **Step 2: Run the production build**

Run: `npm run build --prefix frontend`

Expected: Vite completes successfully and emits the existing production bundle without TypeScript, JSX, or CSS errors.

- [ ] **Step 3: Review the final worktree**

Run:

```bash
git status --short
git diff --check
```

Expected: Only the intended frontend surface files are modified, no whitespace errors are reported, and the already committed design/spec files remain unchanged.

- [ ] **Step 4: Commit validation-ready changes**

```bash
git add frontend/src
git commit -m "style: validate lighter dark card treatment"
```
