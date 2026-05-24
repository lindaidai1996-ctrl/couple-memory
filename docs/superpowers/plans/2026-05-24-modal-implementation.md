# Modal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a shared Velvet Plum `Modal` component under `src/components/ui` with configurable title, width, overlay, and optional built-in confirm footer.

**Architecture:** Keep the public component small and portal-based. Expose a testable modal surface renderer plus a few pure helpers so behavior and class wiring can be verified without adding a browser-only test harness.

**Tech Stack:** React 19, Next.js, TypeScript, node:test, shared global CSS tokens

---

### Task 1: Add modal tests first

**Files:**
- Create: `tests/components/modal.test.tsx`
- Modify: `tests/app/theme-styles.test.ts`
- Test: `tests/components/modal.test.tsx`

- [ ] **Step 1: Write the failing test**
- [ ] **Step 2: Run the modal tests to verify they fail**
- [ ] **Step 3: Add a theme style assertion for modal classes**

### Task 2: Implement the shared modal

**Files:**
- Create: `src/components/ui/modal.tsx`
- Modify: `src/app/globals.css`
- Test: `tests/components/modal.test.tsx`

- [ ] **Step 1: Implement width helper, surface renderer, and public portal wrapper**
- [ ] **Step 2: Add shared modal classes and theme-aware tokens in global CSS**
- [ ] **Step 3: Run modal tests to verify they pass**

### Task 3: Verify integration surface

**Files:**
- Test: `tests/components/modal.test.tsx`
- Test: `tests/app/theme-styles.test.ts`

- [ ] **Step 1: Run `npm test -- tests/components/modal.test.tsx tests/app/theme-styles.test.ts`**
- [ ] **Step 2: Run `npm run lint -- src/components/ui/modal.tsx tests/components/modal.test.tsx tests/app/theme-styles.test.ts`**
