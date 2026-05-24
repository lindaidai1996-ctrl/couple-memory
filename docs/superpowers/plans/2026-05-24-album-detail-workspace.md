# Album Detail Workspace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the dashboard album detail page so photo details and chapter editing use one responsive workspace surface: a sticky right-side inspector on desktop and a full-screen sheet on mobile.

**Architecture:** Keep the current album data fetching and mutation routes unchanged. Introduce a page-level detail-surface state keyed by entity IDs, derive the active photo or chapter from fresh album data, and render both photo and chapter editing through one shared workspace shell while leaving chapter creation and move dialogs unchanged.

**Tech Stack:** Next.js App Router, React 19, TypeScript, `next-intl`, `node:test`, ESLint

---

### Task 1: Lock the workspace state model with tests

**Files:**
- Modify: `tests/app/dashboard/album-detail-page.test.ts`
- Modify: `src/app/(dashboard)/albums/[albumId]/page.tsx`

- [ ] **Step 1: Add failing tests for a page-level detail surface state**
- [ ] **Step 2: Run `npm test -- tests/app/dashboard/album-detail-page.test.ts` and confirm the new helpers are missing**
- [ ] **Step 3: Add minimal helper exports for the detail surface state**
- [ ] **Step 4: Re-run the same test until the failure is narrowed to the intended behavior**

### Task 2: Introduce a shared album detail workspace component

**Files:**
- Create: `src/components/album-detail-workspace.tsx`
- Modify: `src/components/photo-detail-modal.tsx`
- Modify: `src/components/chapter-detail-drawer.tsx`
- Test: `tests/app/dashboard/photo-detail-modal.test.ts`

- [ ] **Step 1: Add failing tests for any newly exported photo-detail helper copy or behavior needed by the shared workspace**
- [ ] **Step 2: Build a shared workspace shell with desktop sidebar and mobile sheet variants**
- [ ] **Step 3: Move photo-detail content into the shared shell without changing the underlying PATCH / retry / cover actions**
- [ ] **Step 4: Move chapter-edit content into the shared shell and keep title/background note save semantics**
- [ ] **Step 5: Run the targeted photo-detail and album-detail tests**

### Task 3: Rewire the album page to use the shared workspace

**Files:**
- Modify: `src/app/(dashboard)/albums/[albumId]/page.tsx`
- Modify: `src/components/album-chapter-card.tsx`
- Modify: `src/components/photo-selection-grid.tsx`

- [ ] **Step 1: Replace `photoPreview` and `editingChapter` with one `detailSurface` state keyed by IDs**
- [ ] **Step 2: Derive the active photo or chapter from the latest album payload**
- [ ] **Step 3: Restructure the page into `main content + inspector` on desktop while preserving the current section order**
- [ ] **Step 4: Mount the mobile full-screen sheet only when the shared workspace is active**
- [ ] **Step 5: Keep chapter composer and move dialog flows working beside the new workspace**

### Task 4: Update copy, responsive polish, and verification

**Files:**
- Modify: `messages/zh-CN.json`
- Modify: `messages/en.json`
- Modify: `tests/app/i18n-surface-copy.test.ts`
- Test: `tests/app/dashboard/album-detail-page.test.ts`

- [ ] **Step 1: Add any new workspace empty-state or action copy needed by the inspector**
- [ ] **Step 2: Update translation tests to cover the new copy surface**
- [ ] **Step 3: Run `npm test -- tests/app/dashboard/album-detail-page.test.ts tests/app/dashboard/photo-detail-modal.test.ts tests/app/i18n-surface-copy.test.ts`**
- [ ] **Step 4: Run `npm run lint -- src/app/(dashboard)/albums/[albumId]/page.tsx src/components/album-detail-workspace.tsx src/components/album-chapter-card.tsx src/components/photo-selection-grid.tsx src/components/photo-detail-modal.tsx src/components/chapter-detail-drawer.tsx`**
- [ ] **Step 5: Reload the local app and verify the desktop inspector plus mobile sheet in the in-app browser**
