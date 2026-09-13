# Dark Card Color Design

## Goal

Make individual cards and boxed panels in dark mode feel lighter and less blue-black, while preserving the dark page background, existing text contrast, AQI colors, alert colors, and interaction states.

## Scope

- Apply consistently across the frontend's dark-mode cards, metrics, inputs, tables, modals, and secondary boxed controls.
- Keep the page-level dark background at `#0b0f17` so cards remain visually separated.
- Keep semantic AQI/status surfaces and icon colors unchanged.
- Do not alter light mode.

## Color treatment

- Primary dark card surface: `#242933`.
- Secondary dark surface for metrics, inputs, and subtle controls: `#2d333d`.
- Existing border colors remain in place to preserve structure and focus states.
- Existing translucent/gradient surfaces should resolve to the new neutral charcoal tones rather than blue-black.

## Implementation direction

Use the shared dark theme tokens in `frontend/src/styles/theme.css` as the source of truth, then adjust isolated utility classes or gradients only where they bypass those tokens. This keeps the change consistent across pages and avoids changing semantic accent colors. Verify that the hero, weather metric cards, pollutant cards, charts, forecast/table panels, alerts, navigation controls, and modals all use the lighter charcoal treatment.

## Validation

- Run the existing frontend build/type-check command.
- Inspect the changed class/token usage to ensure light mode and accent surfaces were not changed.
- Confirm no unrelated files are modified.
