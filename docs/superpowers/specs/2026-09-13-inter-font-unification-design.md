# Inter Font Unification Design

## Goal

Standardize all frontend typography under `frontend/src` on the Inter font family while preserving the existing visual theme and fallback behavior.

## Scope

- Add the Google Fonts import for Inter weights 400, 500, 600, and 700 to `frontend/src/styles/theme.css`.
- Set the base `body` font stack to `'Inter', -apple-system, sans-serif`.
- Register the same stack as Tailwind's `font-sans` token through `@theme` in `frontend/src/index.css`.
- Remove any component-level font-family overrides if discovered during implementation.
- Leave every color variable in `:root` and `.dark` unchanged.

## Current Audit

The audit of `frontend/src` found one explicit `font-family` declaration, in `styles/theme.css`. No inline `fontFamily` declarations or component-specific font-family overrides were found. Existing Tailwind classes such as `font-bold`, `font-semibold`, and `font-black` control weight only and do not introduce another font family.

## Implementation

1. Place the Inter Google Fonts `@import` at the beginning of `styles/theme.css`.
2. Replace the existing system font stack in the `body` rule with `'Inter', -apple-system, sans-serif`.
3. Add an `@theme` block to `index.css` defining `--font-sans: 'Inter', -apple-system, sans-serif`.
4. Re-run the font-family audit after editing to confirm no other font-family overrides exist.
5. Run the existing frontend type-check/lint command and production build.

## Validation

- Confirm the `:root` and `.dark` color variable blocks are byte-for-byte unchanged.
- Confirm the only font family is Inter with the requested fallback stack.
- Confirm Tailwind's `font-sans` token resolves to the Inter stack.
- Run `npm run lint` and `npm run build` from `frontend`.
