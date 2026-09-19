# Home UI Audit and Redesign Proposal

## 1. Scope and quick conclusion

This document reviews the AirVision VN Home page, focusing on how quickly users can understand the current AQI, assess risk, and choose their next action.

This is a **preserve redesign**:

- Keep the existing station search, location detection, charts, map, forecast, alerts, notifications, and navigation.
- Keep AirVision branding, the logo, bilingual support, and light/dark themes.
- Do not change routes, form field names, or existing navigation flows.
- Improve hierarchy, information density, color usage, spacing, cards, responsive behavior, and accessibility.

**Conclusion:** The Home page has strong functional coverage, but it currently presents the dashboard as a long sequence of visually similar cards. Users see a lot of information before they can answer the three most important questions:

1. What is the current AQI?
2. What should I do today?
3. Where can I see the next forecast or station detail?

## 2. Design read and design dials

**Design read:** Home is a public health dashboard for general users. It should feel calm, trustworthy, and data-first rather than decorative or futuristic.

| Dial | Proposed value | Reason |
|---|---:|---|
| DESIGN_VARIANCE | 5/10 | Use modest asymmetry to establish hierarchy, but avoid experimental layouts for a health product |
| MOTION_INTENSITY | 3/10 | Use light reveal, hover, and state transitions without distracting from health information |
| VISUAL_DENSITY | 6/10 | This is a data dashboard, but secondary information should be reduced above the fold |

## 3. Current interface understanding

### 3.1 Header

In [Header.tsx](../frontend/src/components/Header.tsx), the header includes:

- AirVision VN branding, tagline, and five navigation items.
- Language toggle, theme toggle, login, and registration.
- A sticky 64px header with a responsive mobile menu.
- `lucide-react` icons with consistent product styling.

**Strengths**

- Navigation and active states are easy to identify.
- Dark mode, bilingual support, and authentication states are already supported.
- A sticky header is appropriate for a long data page.

**Issues**

- There are many controls competing for space, especially on narrow screens.
- Orange appears in the logo, active navigation, CTA buttons, and multiple badges. Its role as the primary action color is therefore less clear.
- The small tagline under the logo may become difficult to read on mobile.

### 3.2 Hero and selected station

In [Home.tsx](../frontend/src/pages/Home.tsx), the page begins with:

- Station search and location detection.
- A large showcase card whose border changes with the AQI category.
- Station name, address, and update time.
- Large AQI value, category badge, and primary pollutant.
- A clickable health advisory.
- Six weather micro-metrics, including temperature, humidity, wind, and UV.

**Strengths**

- AQI appears near the top of the page.
- AQI category data includes color, description, and health advice.
- Search and location detection address real user needs.

**Priority issues**

- The hero represents both current air quality and many weather metrics, so the visual focus is split.
- Fixed `w-[120px]` metric cells can become cramped on narrow screens.
- `lg:translate-y-[50%]` moves the metric group outside the main grid and can create awkward empty space.
- The hero does not make the next recommended action visually explicit.
- A category-colored border can be useful, but if it is too strong the entire hero feels like a status badge instead of a calm information surface.

### 3.3 Seven-day forecast

The Home page includes a province filter, a clickable forecast table, and a separate mobile card layout.

**Strengths**

- Desktop and mobile layouts are intentionally different.
- High-AQI days receive a visual highlight.
- AQI, temperature, condition, and rain probability appear together.

**Issues**

- The full seven-day table appears too early, before users have fully understood the current station and AQI.
- Row numbers add density without much value.
- The table has many columns and may overflow when bilingual labels are longer.
- Home must display the complete seven-day forecast and may link to the full Forecast page for deeper details. The seven-day range is a required product capability, not an optional preview.

### 3.4 Health advice by audience

The page includes audience-specific cards for children, people with heart or respiratory conditions, active users, and similar groups. Each card includes a risk label and recommendations.

**Strengths**

- This is one of the most practical sections for general users.
- Advice is easier to understand when grouped by audience rather than presented as one generic warning.

**Issues**

- The cards contain enough text to compete visually with data cards.
- “Critical” and “Caution” should not rely on color alone.
- Home should show one primary recommendation per group and link to the full health center.

### 3.5 Notification settings

The page includes an AQI threshold slider and a browser notification button.

**Strengths**

- The feature is useful and helps users act proactively.
- Threshold markers at 50, 100, 150, and 200 are easy to understand.

**Issues**

- This section is an important action but is not presented as a clear next step.
- Slider labels may collide on mobile.
- Enabled and enable states need to be visually distinct.
- Loading, permission denied, and saved states should appear as clear inline feedback.

### 3.6 Pollutants and charts

Home includes six pollutant cards and chart tabs for 24-hour AQI, pollutants, and temperature.

**Strengths**

- Users can move from summary information to detailed analysis.
- Recharts supports several useful analysis views.
- Pollutant trends and over-limit states are visible.

**Issues**

- Six pollutant cards have equal visual weight even though PM2.5 usually deserves priority.
- Too many status colors make users learn several color systems at once.
- The chart tooltip uses a fixed dark style and should be checked in both themes.
- The chart tabs need a clear focus ring, not only a background change.

### 3.7 Map, insights, and supporting content

Home includes the Vietnam station map, best outdoor hours, city comparisons, and health tips.

**Strengths**

- The map is a strong content anchor and supports station selection.
- Insights turn AQI data into daily decisions.
- These features are useful and should remain available on Home.

**Issues**

- The page is long and repeats rounded cards, borders, and shadows across nearly every section.
- The map, chart, table, and insights compete for attention instead of forming a clear reading flow.
- Insights should be grouped into a “What you should know today” section with three action-oriented conclusions.

## 4. Current color system

The current palette is defined in [theme.css](../frontend/src/styles/theme.css):

| Role | Current color | Assessment |
|---|---|---|
| Light background | `#F8FAFC` | Clean and appropriate for data |
| Light card | `#FFFFFF` | Good, but repeated too often |
| Dark background | `#0A0A0D` | Strong base, but needs clearer surface levels |
| Main text | `#0F172A` | Good contrast on light surfaces |
| Muted text | `#64748B` | Check small 11-12px text carefully |
| Orange accent | `#F97316` | Strong brand signal, currently overused |
| Blue accent | `#0284C7` | Useful for weather data, but should not compete with the brand accent |

Home also uses red, green, blue, sky, and orange directly for status states. This is appropriate for AQI, but the roles should be separated:

- **Brand accent:** AirVision orange, reserved for primary CTA, active state, and key emphasis.
- **Semantic AQI colors:** green, yellow/orange, red, and purple-red where required by the AQI category. Use these for risk and category meaning.
- **Neutral data colors:** slate tones for grids, text, dividers, and chart scaffolding.

## 5. Recommended color palette

Keep AirVision orange. Reduce the saturation of supporting surfaces and define one clear brand accent.

### Light mode

| Token | Proposed value | Use |
|---|---|---|
| `--bg-primary` | `#F4F7F9` | Page background |
| `--bg-surface` | `#FFFFFF` | Primary surface |
| `--bg-subtle` | `#EAF0F3` | Secondary surface, tabs, grouped metrics |
| `--text-primary` | `#10212B` | Headings and primary values |
| `--text-secondary` | `#536671` | Descriptions and labels |
| `--border` | `#D7E1E5` | Subtle borders |
| `--brand` | `#E86F28` | CTA and active state |
| `--brand-strong` | `#B94F16` | Hover and strong CTA on light surfaces |
| `--info` | `#247A9B` | Weather information and secondary links |

### Dark mode

| Token | Proposed value | Use |
|---|---|---|
| `--bg-primary` | `#0D171B` | Page background |
| `--bg-surface` | `#142329` | Primary surface |
| `--bg-subtle` | `#1B3037` | Secondary surface |
| `--text-primary` | `#EFF6F7` | Headings and primary values |
| `--text-secondary` | `#A9BEC4` | Descriptions and labels |
| `--border` | `#2B444C` | Borders |
| `--brand` | `#F18A4A` | CTA and active state |
| `--brand-strong` | `#FF9D62` | Hover on dark surfaces |
| `--info` | `#55A9C5` | Weather information and secondary links |

This palette feels clean and connected to air and public health without turning Home into an orange-heavy interface. Avoid purple gradients, neon glow, and AI-style gradient backgrounds as the main visual language.

## 6. Recommended Home layout after refinement

### Layer 1: recognition within five seconds

1. Make the sticky header more compact.
2. Keep search and location on one row on desktop and stack them on mobile.
3. Use a split hero:
   - Left: station name, update time, large AQI, category, and advisory.
   - Right: four important metrics without fixed-width cells.
4. Add one clear action row:
   - `View station details`
   - `Enable alerts`

Do not place the full forecast table before the hero. The current AQI must be the first visual priority.

### Layer 2: daily decisions

Use one horizontal section with three blocks:

- **Seven-day forecast:** the next seven days with AQI, temperature, condition, and rain probability.
- **Current PM2.5:** value, safe limit, and trend.
- **Best outdoor hours:** recommended time window and reason.

The goal is to answer what the user should do, not simply show more data.

### Layer 3: deeper exploration

Place these after the action-oriented content:

- 24-hour chart and detailed chart tabs.
- Vietnam station map.
- City comparison.
- Audience-specific health advice.
- Notification settings.

Do not remove these features. Reduce their visual priority so they support, rather than compete with, current AQI.

## 7. Component and shape rules

- Use one primary radius system: 16px cards, 12px inputs/buttons, and pill badges. Do not use `rounded-2xl` and `rounded-3xl` indiscriminately.
- Reduce `shadow-xl` and `shadow-lg` in favor of borders and surface contrast. Keep stronger shadows for the hero, dropdown, and modal.
- Use cards when they create hierarchy. For data rows, prefer light dividers and whitespace.
- Do not use `w-[120px]` for metrics. Use `grid-cols-2 sm:grid-cols-4` so cells can grow and shrink.
- Each section should have one clear title and a short description. Avoid repeating small uppercase eyebrows.
- Use one consistent label and orange treatment for the primary CTA.
- Pair AQI colors with text labels and icons/trends; do not communicate meaning through color alone.
- Buttons, clickable cards, and sliders need visible focus states.

## 8. Typography system

Use the following system-first font stack across the application:

```css
-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", sans-serif
```

This stack is appropriate for a Vietnamese AQI dashboard because it uses the native UI font on Apple platforms, Windows, and other supported environments without adding a remote font dependency. It should replace the current Fira Sans/Fira Code import for the main product interface unless a monospace face is explicitly needed for technical data.

### Font roles

| Role | Recommended treatment | Use |
|---|---|---|
| Display | `font-family: inherit`, 700-800 weight, tight line-height around `1.05-1.15`, slightly negative letter spacing | Current AQI, hero station name, major page statement |
| Heading | `font-family: inherit`, 650-750 weight, line-height around `1.2-1.3`, neutral letter spacing | Section titles, card titles, navigation labels |
| Body | `font-family: inherit`, 400-500 weight, line-height around `1.45-1.6`, normal letter spacing | Descriptions, advisory text, forecast details, health recommendations |
| Label and metadata | `font-family: inherit`, 500-650 weight, 12-14px, line-height around `1.3-1.4` | Station ID, update time, units, category labels, table metadata |
| Technical data | `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace` | Optional use for raw pollutant values, timestamps, or developer-facing diagnostic values only |

### Typography rules

- Use the same system font family for display, headings, and body so the interface feels coherent.
- Do not use Fira Code for ordinary UI text; reserve monospace for technical values where alignment or data semantics justify it.
- Keep the current AQI value visually dominant, but avoid extreme font sizes that push the advisory below the fold.
- Avoid all-caps for sentences and health advice. Use uppercase only for short metadata labels.
- Keep important AQI, category, and advisory text at a readable size on mobile; do not use 10px text for decision-critical content.
- Test Vietnamese diacritics in every weight used by the design. The fallback stack must remain readable if SF Pro Text is unavailable.

## 9. Responsive and accessibility recommendations

### Mobile

- Stack the hero into one column, with AQI and category before metrics.
- Use a two-column metric grid and remove vertical transforms.
- Keep all seven forecast days visible on mobile using stacked cards or an intentionally scrollable forecast strip. Do not reduce the required forecast range to three days.
- Give charts a stable minimum height and prevent tooltip clipping.
- Give the search dropdown a maximum height, focus behavior, and clear close behavior.
- Prioritize logo, theme, language, and menu in the header; place authentication actions inside the menu.

### Accessibility

- Add `aria-label` to icon-only theme, language, close, and menu buttons.
- Replace clickable `div` elements with buttons, or provide complete keyboard interaction.
- Do not use 10px text for important information. AQI, category, and warning text must remain readable on mobile.
- Check muted text contrast in both light and dark themes against WCAG AA.
- Respect `prefers-reduced-motion` for `FadeIn`, map pin pulses, and hover transforms.
- Add loading, empty, and error states for search, location, forecast, and notification permission.

## 10. Implementation priority

### P0: high impact, low risk

1. Rebuild the hero hierarchy around AQI, category, advisory, and action.
2. Reduce card and shadow density and standardize radius.
3. Replace fixed metric sizing and the translated metric group.
4. Define orange as the brand accent and reserve other colors for semantic AQI states.
5. Check contrast, focus states, and keyboard behavior for clickable elements.

### P1: improve decision-making

1. Keep the complete seven-day forecast visible on Home, but move it below the hero and the daily decision section.
2. Move PM2.5 and best outdoor hours into an action section near the hero.
3. Shorten health cards to a preview with an expanded detail link.
4. Turn insights into three action-oriented conclusions.

### P2: polish and performance

1. Add restrained motion with reduced-motion support.
2. Optimize chart tooltips for both themes.
3. Split Home into smaller components if the file continues to grow.
4. Run Lighthouse checks for LCP, CLS, and INP after changing the hero.

## 11. Acceptance criteria

- Users can identify current AQI, category, and advisory within the first viewport.
- The hero does not overflow on desktop or mobile.
- No metric is clipped, overlapped, or dependent on horizontal scrolling.
- The primary CTA has one clear label and WCAG AA contrast.
- Light and dark themes preserve the same hierarchy.
- On mobile, search, AQI, and category are visible before the user scrolls.
- All seven forecast days are visible and understandable on Home, either as stacked mobile cards or an intentionally scrollable forecast layout.
- Forecast, pollutants, map, and health advice remain accessible without competing with current AQI.
- Loading, empty, error, and permission-denied states never look like successful data states.

## 12. Out of scope for this redesign

- Do not change `/`, `/maps`, `/forecast`, `/alerts`, or `/about`.
- Do not rename primary navigation without a separate product decision.
- Do not replace the AirVision logo or brand identity.
- Do not remove bilingual support, theme toggle, authentication, notifications, or station detail modal.
- Do not change form field names or analytics events used by other surfaces.
