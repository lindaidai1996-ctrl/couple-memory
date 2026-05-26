# Image Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a reusable full-screen image viewer with Velvet Plum styling, shared viewer controls, loading/error states, and integrate it into album detail, timeline, and settings avatar preview flows.

**Architecture:** Add a focused `photo-viewer` component plus small pure helpers for navigation, transform state, and toolbar composition. Keep business-specific actions outside the component by passing extra toolbar actions from pages, then wire album/timeline/settings pages to the shared viewer with page-owned open state.

**Tech Stack:** Next.js 16, React 19, TypeScript, framer-motion, next-intl, node:test

---

### Task 1: Define viewer state and coverage

**Files:**
- Create: `tests/components/photo-viewer.test.tsx`
- Modify: `tests/app/dashboard/album-detail-page.test.ts`
- Modify: `tests/app/dashboard/timeline.page.test.ts`
- Modify: `tests/app/dashboard/settings.page.test.ts`

- [ ] Add failing tests for viewer helpers: navigation boundaries, transform clamping/reset, toolbar action composition, loading/error copy exposure, and markup hooks for custom actions.
- [ ] Run focused tests and confirm they fail for missing exports or missing behavior.

### Task 2: Build reusable image viewer

**Files:**
- Create: `src/components/photo-viewer.tsx`
- Modify: `src/components/ui/button.tsx`
- Modify: `src/app/globals.css`

- [ ] Implement shared viewer types, helper builders, and the full-screen React component.
- [ ] Add missing icon exports needed by common viewer controls.
- [ ] Add Velvet Plum viewer shell styles, toolbar styles, loading surface, and failure surface.
- [ ] Run focused component tests and confirm they pass.

### Task 3: Integrate album detail preview

**Files:**
- Modify: `src/app/(dashboard)/albums/[albumId]/page.tsx`
- Modify: `src/components/photo-selection-grid.tsx`
- Modify: `tests/app/dashboard/album-detail-page.test.ts`

- [ ] Add album-level preview state, open/close helpers, and toolbar actions for preview, delete, and edit.
- [ ] Add the hover preview icon to photo tiles to the left of delete.
- [ ] Route edit from viewer back into the existing right-side photo workspace and keep delete confirmation behavior.
- [ ] Run focused album detail tests and confirm they pass.

### Task 4: Integrate timeline and settings avatar preview

**Files:**
- Modify: `src/components/timeline-view.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `tests/app/dashboard/timeline.page.test.ts`
- Modify: `tests/app/dashboard/settings.page.test.ts`

- [ ] Add shared viewer open state for clicked timeline photos.
- [ ] Make the uploaded avatar previewable through the same viewer in settings.
- [ ] Run focused timeline/settings tests and confirm they pass.

### Task 5: Copy and verification

**Files:**
- Modify: `messages/zh-CN.json`
- Modify: `messages/en.json`

- [ ] Add translation keys for viewer controls, loading, failure, preview action, edit action, and confirm copy.
- [ ] Run the targeted test suite covering the new viewer and the three updated pages.
- [ ] Run a final broader test sweep for touched dashboard areas before claiming completion.
