# Album Default Cover Design

## Summary

When a newly created album has no `coverPhotoUrl`, the album list currently renders a dark empty placeholder that reads as a broken or unfinished cover. This design replaces that fallback with a stable, decorative default cover generated from the album title and album id.

The default cover will follow the existing `velvet-plum-ui-system` palette and surface language so it feels native to the dashboard rather than like a generic placeholder.

## Goals

- Remove the black or visually dead empty-state cover for albums without a real cover photo
- Make default covers feel intentional and aesthetically aligned with the Velvet Plum dashboard
- Ensure covers are visually stable across refreshes
- Ensure albums with the same title can still receive different covers
- Keep the change scoped to presentation logic in the album list

## Non-Goals

- Do not write generated cover metadata into the database
- Do not change album creation API behavior
- Do not change the album cover selection workflow
- Do not alter the rendering path when `coverPhotoUrl` is present
- Do not expand this change to album detail pages or other surfaces in this iteration

## Final Approach

Use a deterministic fallback cover generated from `album.title + album.id`.

The implementation will hash that combined seed and map it to a small set of pre-defined Velvet Plum gradient recipes. Each recipe will use existing warm/dashboard tokens derived from the repository's Velvet Plum system rather than introducing unrelated colors.

This gives the UI three useful properties:

- Stability: the same album always gets the same fallback cover
- Differentiation: same-title albums still diverge because `album.id` participates in the seed
- Low complexity: no backend or persistence changes are needed

## Visual Direction

The default cover should not look like a plain gradient rectangle. It should read as a designed surface.

Each generated fallback cover will contain:

- A Velvet Plum gradient background based on existing accent colors
- One or two soft radial highlight layers to avoid a flat fill
- A subtle decorative overlay such as a line grid, glow bloom, or abstract shape wash with low opacity
- A small central or corner icon-like album glyph, or a restrained initial, so the card still reads as an album cover rather than a missing image

The overall feel should match the dashboard's current visual language:

- editorial
- warm
- plum-toned
- soft contrast
- slightly luminous, not saturated

## Palette Source

The fallback recipes must be derived from the existing Velvet Plum system documented in:

- [docs/design/velvet-plum-ui-system/component-tokens.md](/Users/user/Documents/codes/work/docs/design/velvet-plum-ui-system/component-tokens.md)
- [src/app/globals.css](/Users/user/Documents/codes/work/src/app/globals.css)

The implementation should primarily reuse combinations around:

- `--vp-accent-light`
- `--vp-accent-2-light`
- `--vp-accent-3-light`
- `--vp-accent-dark`
- `--vp-accent-2-dark`
- `--vp-accent-3-dark`
- `--dashboard-hero-gradient`
- `--dashboard-active-gradient`
- `--dashboard-surface-gradient`

The cover recipes should remain within the existing plum, rose, mauve, blush, and warm neutral family. No unrelated blue, neon, or generic rainbow accents should be introduced.

## Component Structure

The album list page at [src/app/(dashboard)/albums/page.tsx](/Users/user/Documents/codes/work/src/app/(dashboard)/albums/page.tsx) will be refactored so the cover rendering path is explicit:

- If `album.coverPhotoUrl` exists, render the real image as today
- Otherwise, render a dedicated fallback cover component

The fallback cover component should accept enough input to be deterministic:

- `album.id`
- `album.title`

It should return:

- the selected recipe
- the visual layers needed to render that recipe

This logic should be extracted into a focused helper rather than being embedded inline in the JSX map loop.

## Data and State Flow

No new network or persisted state is required.

The flow is:

1. Album list data arrives from the existing albums API
2. For each album card, check `coverPhotoUrl`
3. If missing, compute the fallback recipe from `title + id`
4. Render the decorative fallback cover

Because the recipe is derived from already available fields, there is no extra API dependency and no migration risk.

## Accessibility and Content Rules

- Decorative overlay layers should not add noisy text
- Any visible initial or glyph must remain decorative and secondary to the album title rendered in the content section below
- Contrast in both light and dark themes must remain readable and not collapse into muddy low-contrast fills
- Motion should stay subtle and piggyback on the existing card hover behavior rather than introducing separate animated choreography

## Implementation Notes

- Prefer a small, pure helper function for recipe selection
- Prefer a fixed recipe set over dynamic color math from arbitrary HSL values
- Keep the fallback cover implemented with CSS classes and inline style variables where needed
- Avoid adding image assets or external illustration dependencies
- Preserve the existing `group-hover` scale behavior for real image covers and mirror a softer version for fallback covers

## Testing

Add targeted tests for the deterministic fallback logic.

Expected coverage:

- The same `title + id` returns the same recipe on repeated calls
- Different ids can produce different recipes even for the same title
- Albums without `coverPhotoUrl` render the fallback cover path
- Albums with `coverPhotoUrl` still render the real image path

The tests should focus on behavior and determinism, not snapshot large decorative markup.

## Risks and Mitigations

### Risk: fallback covers look too similar

Mitigation:

- Define enough recipe variety, ideally 4 to 6 distinct Velvet Plum compositions
- Mix gradient direction, highlight placement, and decorative overlay pattern, not just raw color order

### Risk: fallback covers compete with real cover photos

Mitigation:

- Keep decorative intensity restrained
- Treat fallback covers as elegant placeholders, not hero illustrations

### Risk: implementation leaks visual logic into the page component

Mitigation:

- Extract helper and fallback cover rendering into focused functions or a small local component

## Scope Boundary for Implementation

This implementation should stop after:

- album list fallback cover generation
- supporting helper extraction
- relevant tests

Any extension into other album surfaces should be treated as a follow-up task, not bundled into this change.
