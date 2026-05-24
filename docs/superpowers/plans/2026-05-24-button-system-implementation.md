# Velvet Plum Button System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared button component for Velvet Plum and film surfaces, then migrate existing app buttons to it with context-appropriate variants and icons.

**Architecture:** Create one reusable `Button` primitive plus a shared `buttonClassName()` helper so both `<button>` and `<Link>` surfaces can use the same visual system. Store the material/variant behavior in global CSS classes, then replace repeated inline Tailwind button styling across auth, dashboard, dialogs, and public pages.

**Tech Stack:** Next.js 16, React 19, TypeScript, Tailwind 4 utility classes, node:test, react-dom/server

---

### Task 1: Define the shared Button API and regression tests

**Files:**
- Create: `src/components/ui/button.tsx`
- Create: `tests/components/button.test.tsx`

- [ ] Add tests for class generation, loading state, and icon slots.
- [ ] Run `npm test -- tests/components/button.test.tsx` and confirm the module is missing or tests fail for the expected reason.

### Task 2: Add shared button material styles

**Files:**
- Modify: `src/app/globals.css`
- Create: `src/components/ui/button.tsx`

- [ ] Add `cm-button` base classes and scheme/variant/size modifiers for Velvet Plum and film surfaces.
- [ ] Implement `Button` and `buttonClassName()` using those classes, including loading and icon wrappers.
- [ ] Re-run `npm test -- tests/components/button.test.tsx`.

### Task 3: Migrate app buttons to the shared primitive

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/register/page.tsx`
- Modify: `src/app/(dashboard)/albums/page.tsx`
- Modify: `src/app/(dashboard)/albums/[albumId]/page.tsx`
- Modify: `src/app/(dashboard)/pipeline/page.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/app/(dashboard)/timeline/page.tsx`
- Modify: `src/app/error.tsx`
- Modify: `src/app/global-error.tsx`
- Modify: `src/app/invite/[code]/page.tsx`
- Modify: `src/app/s/[slug]/error.tsx`
- Modify: `src/components/*` button-owning files

- [ ] Replace repeated action/cancel/delete buttons with `Button`.
- [ ] Use `buttonClassName()` on `Link` surfaces that visually behave like buttons.
- [ ] Choose variants and icons by context rather than doing one-for-one mechanical swaps.

### Task 4: Verify migration coverage

**Files:**
- Modify: tests as needed for touched pages/helpers

- [ ] Search for remaining repeated warm/film button class patterns and replace or consciously leave only non-button controls.
- [ ] Run focused tests for touched modules and a broader lint/build check if time allows.
- [ ] Reload key pages in the browser and confirm dark/light button behavior matches the approved mockup direction.
