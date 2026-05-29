# Memory Site Review Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reusable focus review layout and refactor `/sites/[siteId]` into a full-width memory-site review experience with a lightweight top bar, expandable edit actions, and VelvetSelect-based editing controls.

**Architecture:** Extend the dashboard shell so pages can opt into a reusable focus review layout that suppresses the normal sidebar footprint and widens the content container. Then refactor the memory-site detail route to render the public-site preview structure inside that layout while moving editing affordances into a top review bar and modal/drawer surfaces backed by the existing memory-site PATCH actions.

**Tech Stack:** Next.js App Router, React Server Components + client components, next-intl, existing Velvet Plum dashboard styles, Node test runner

---

### Task 1: Add reusable dashboard focus review layout primitives

**Files:**
- Modify: `src/components/dashboard-shell-classes.ts`
- Modify: `src/app/(dashboard)/layout.tsx`
- Create: `src/lib/dashboard-layout.ts`
- Test: `src/components/dashboard-shell-classes.test.ts`

- [ ] **Step 1: Write the failing tests for focus review layout classes**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildDashboardContentClassName,
  buildDashboardLayoutClassName,
} from './dashboard-shell-classes'

test('focus review layout drops the desktop sidebar column', () => {
  assert.doesNotMatch(
    buildDashboardLayoutClassName({ mode: 'focus-review' }),
    /\bxl:grid-cols-\[220px_minmax\(0,1fr\)\]/
  )
})

test('focus review layout expands the content width and trims top padding', () => {
  const className = buildDashboardContentClassName({ mode: 'focus-review' })

  assert.match(className, /\bmax-w-none\b/)
  assert.match(className, /\bpt-6\b/)
})
```

- [ ] **Step 2: Run the shell class tests to verify they fail**

Run: `npm test -- src/components/dashboard-shell-classes.test.ts`
Expected: FAIL because `buildDashboardLayoutClassName` and `buildDashboardContentClassName` do not exist yet.

- [ ] **Step 3: Implement reusable dashboard shell helpers and route-mode detection**

```ts
// src/lib/dashboard-layout.ts
export type DashboardLayoutMode = 'default' | 'focus-review'

export function resolveDashboardLayoutMode(pathname: string): DashboardLayoutMode {
  return /^\/sites\/[^/]+$/.test(pathname) ? 'focus-review' : 'default'
}
```

```ts
// src/components/dashboard-shell-classes.ts
export function buildDashboardLayoutClassName({
  mode = 'default',
}: {
  mode?: 'default' | 'focus-review'
} = {}) {
  return mode === 'focus-review'
    ? 'mx-auto grid h-screen w-full max-w-[1600px] gap-3 overflow-hidden px-3 py-3'
    : 'mx-auto grid h-screen w-full max-w-[1460px] gap-3 overflow-hidden px-3 py-3 xl:grid-cols-[220px_minmax(0,1fr)]'
}

export function buildDashboardContentClassName({
  mode = 'default',
}: {
  mode?: 'default' | 'focus-review'
} = {}) {
  return mode === 'focus-review'
    ? 'mx-auto min-h-full max-w-none px-0 py-6 pt-6'
    : 'mx-auto min-h-full max-w-[1180px] px-4 py-20 sm:px-6 sm:pt-24 lg:px-7 lg:py-6 lg:pt-24'
}
```

```tsx
// src/app/(dashboard)/layout.tsx
import { headers } from 'next/headers'
import { resolveDashboardLayoutMode } from '@/lib/dashboard-layout'
import {
  buildDashboardContentClassName,
  buildDashboardLayoutClassName,
} from '@/components/dashboard-shell-classes'
```

- [ ] **Step 4: Update the dashboard layout to honor focus review mode**

```tsx
const pathname = (await headers()).get('x-current-pathname') ?? '/dashboard'
const layoutMode = resolveDashboardLayoutMode(pathname)

return (
  <div className={buildDashboardLayoutClassName({ mode: layoutMode })}>
    {layoutMode === 'default' ? <Sidebar /> : null}
    <main className="dashboard-panel dashboard-scroll-shell relative min-h-0 min-w-0 overflow-y-scroll rounded-[22px]">
      <div className="absolute right-4 top-4 z-30 flex flex-wrap items-center justify-end gap-2 sm:right-5 sm:top-5">
        <LocaleSwitcher />
        <ThemeToggle />
      </div>
      <div className={buildDashboardContentClassName({ mode: layoutMode })}>
        {children}
      </div>
    </main>
  </div>
)
```

- [ ] **Step 5: Run the shell class tests to verify they pass**

Run: `npm test -- src/components/dashboard-shell-classes.test.ts`
Expected: PASS

### Task 2: Add failing review-mode page tests and i18n hooks

**Files:**
- Modify: `tests/app/dashboard/memory-sites.page.test.ts`
- Modify: `messages/zh-CN.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Write failing tests for the new review-mode helpers**

```ts
import {
  buildMemorySiteReviewBarState,
  buildMemorySiteReviewMode,
} from '../../../src/app/(dashboard)/sites/[siteId]/page'

test('buildMemorySiteReviewMode keeps published and draft states distinct', () => {
  assert.deepEqual(
    buildMemorySiteReviewMode({ status: 'DRAFT', publicHref: null }),
    { tone: 'draft', primaryAction: 'publish', opensPublicPage: false }
  )

  assert.deepEqual(
    buildMemorySiteReviewMode({ status: 'PUBLISHED', publicHref: '/story/test/site' }),
    { tone: 'published', primaryAction: 'openPublicPage', opensPublicPage: true }
  )
})

test('buildMemorySiteReviewBarState exposes lightweight editor actions only', () => {
  assert.deepEqual(buildMemorySiteReviewBarState(), [
    'regenerateSelection',
    'replacePhoto',
    'editCopy',
  ])
})
```

- [ ] **Step 2: Run the memory-site page tests to verify they fail**

Run: `npm test -- tests/app/dashboard/memory-sites.page.test.ts`
Expected: FAIL because the new review-mode helpers do not exist.

- [ ] **Step 3: Add the new top-bar and status copy keys to both locale files**

```json
"reviewDraft": "草稿",
"reviewPublished": "已发布",
"reviewModeHint": "先审阅成品，再决定是否微调",
"edit": "编辑",
"reviewSelectionUpdated": "已切换为另一版选图"
```

```json
"reviewDraft": "Draft",
"reviewPublished": "Published",
"reviewModeHint": "Review the artifact first, then decide whether to tweak it",
"edit": "Edit",
"reviewSelectionUpdated": "Switched to another image selection"
```

- [ ] **Step 4: Re-run the memory-site page tests and keep them red for the missing helpers**

Run: `npm test -- tests/app/dashboard/memory-sites.page.test.ts`
Expected: FAIL only on the missing exports/assertions for review-mode helpers.

### Task 3: Refactor the detail actions into a top review bar with VelvetSelect controls

**Files:**
- Modify: `src/components/memory-site-detail-actions.tsx`
- Modify: `tests/app/dashboard/memory-sites.page.test.ts`
- Test: `tests/components/velvet-select.test.tsx`

- [ ] **Step 1: Write the failing tests for VelvetSelect adoption**

```ts
test('memory site detail actions use VelvetSelect for replace-photo inputs', async () => {
  const source = await readFile('src/components/memory-site-detail-actions.tsx', 'utf8')

  assert.equal(source.includes("import { VelvetSelect } from '@/components/forms/velvet-select'"), true)
  assert.equal(source.includes('<VelvetSelect'), true)
  assert.equal(source.includes('<select'), false)
})
```

- [ ] **Step 2: Run the memory-site page tests to verify they fail**

Run: `npm test -- tests/app/dashboard/memory-sites.page.test.ts`
Expected: FAIL because the source still contains native `select` elements and no VelvetSelect import.

- [ ] **Step 3: Refactor the client component into review-bar + expandable panel behavior**

```tsx
const [editorOpen, setEditorOpen] = useState(false)

<div className="sticky top-3 z-20 rounded-[22px] border border-white/45 bg-white/72 shadow-[0_18px_40px_rgba(69,46,54,0.12)] backdrop-blur-xl">
  <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
    ...
    <Button variant="secondary" onClick={() => setEditorOpen(current => !current)}>
      {text.edit}
    </Button>
  </div>
  {editorOpen ? (
    <div className="border-t border-warm-border/70 px-4 py-4">
      ...
    </div>
  ) : null}
</div>
```

- [ ] **Step 4: Replace native selects with VelvetSelect**

```tsx
import { VelvetSelect } from '@/components/forms/velvet-select'

<VelvetSelect
  ariaLabel={text.replaceChapterLabel}
  fullWidth
  value={replaceChapterId}
  options={site.payload.sections.map(section => ({
    value: section.chapterId,
    label: section.title,
  }))}
  onChange={nextChapterId => {
    setReplaceChapterId(nextChapterId)
    ...
  }}
/>
```

- [ ] **Step 5: Run the memory-site tests to verify they pass**

Run: `npm test -- tests/app/dashboard/memory-sites.page.test.ts`
Expected: PASS

### Task 4: Rebuild `/sites/[siteId]` around the public-site preview shell

**Files:**
- Modify: `src/app/(dashboard)/sites/[siteId]/page.tsx`
- Modify: `src/app/story/[slug]/site/page.tsx`
- Modify: `src/components/memory-site/site-hero.tsx`
- Modify: `src/components/memory-site/site-footer.tsx`
- Test: `tests/app/public-memory-site-page.test.ts`

#### Publish Handoff Addendum

**Files:**
- Modify: `src/app/api/couples/[coupleId]/memory-sites/[siteId]/route.ts`
- Modify: `src/app/(dashboard-focus)/sites/[siteId]/page.tsx`
- Modify: `src/app/(dashboard)/sites/page.tsx`
- Modify: `messages/zh-CN.json`
- Modify: `messages/en.json`
- Test: `tests/api/memory-site-routes.test.ts`
- Test: `tests/app/dashboard/memory-sites.page.test.ts`

- [ ] **Step 1: Write the failing tests for free publish and published CTA routing**

```ts
test('PATCH publish route allows free-plan publish attempts', async () => {
  assert.equal(response.status, 200)
  assert.equal(payload.site.status, 'PUBLISHED')
})

test('buildMemorySiteCardAction sends published sites to the public page when available', () => {
  assert.deepEqual(
    buildMemorySiteCardAction({ id: 'site_1', status: 'PUBLISHED' }, '/story/demo/site'),
    { href: '/story/demo/site', label: 'openPublicPage', external: true }
  )
})
```

- [ ] **Step 2: Run the targeted tests to verify they fail on the old gating**

Run:

```bash
npm test -- tests/api/memory-site-routes.test.ts
npm test -- tests/app/dashboard/memory-sites.page.test.ts
```

Expected:

1. API test still returns `402` because `publish` was blocked by plan.
2. UI test cannot find `openPublicPage`/`buildMemorySiteCardAction`.

- [ ] **Step 3: Remove the paid-plan gate and make publish ensure a public target exists**

```ts
const site = await prismaClient.memorySite.update({
  where: { id: existing.id },
  data: {
    status: 'PUBLISHED',
    publishedAt: new Date(),
  },
})

await prismaClient.couple.update({
  where: { id: coupleId },
  data: {
    isPublic: true,
  },
})
```

- [ ] **Step 4: Update detail/list entry points so published sites open the public page**

```ts
export function buildMemorySiteCardAction(site, publicHref) {
  if (site.status === 'PUBLISHED' && publicHref) {
    return { href: publicHref, label: 'openPublicPage', external: true }
  }

  return { href: `/sites/${site.id}`, label: 'openDraft', external: false }
}
```

```tsx
publicHref={coupleUser.couple.slug ? `/story/${coupleUser.couple.slug}/site` : null}
```

- [ ] **Step 5: Replace the old upgrade copy with direct publish/open-page copy**

```json
"openDraft": "继续审阅",
"openPublicPage": "查看公开页"
```

- [ ] **Step 6: Re-run the targeted tests and keep them green**

Run:

```bash
npm test -- tests/api/memory-site-routes.test.ts
npm test -- tests/app/dashboard/memory-sites.page.test.ts
```

Expected: PASS

- [ ] **Step 1: Write the failing tests for a reusable preview model**

```ts
import {
  buildMemorySitePreviewModel,
  buildMemorySiteReviewMode,
} from '../../../src/app/(dashboard)/sites/[siteId]/page'

test('buildMemorySitePreviewModel reuses the public-site section model', () => {
  const model = buildMemorySitePreviewModel({
    title: '标题',
    subtitle: '副标题',
    intro: '引子',
    closing: '结尾',
    coverPhotoUrl: null,
    payload: {
      style: 'VELVET_PLUM_EDITORIAL',
      sections: [{ chapterId: 'chapter_1', title: '第一章', summary: '摘要', photos: [] }],
      sectionCount: 1,
    },
  })

  assert.equal(model.sections[0]?.kicker, 'Chapter 01')
})
```

- [ ] **Step 2: Run the public memory-site tests to verify they fail**

Run: `npm test -- tests/app/public-memory-site-page.test.ts tests/app/dashboard/memory-sites.page.test.ts`
Expected: FAIL because the reusable preview helper does not exist.

- [ ] **Step 3: Extract the public-site model builder and reuse it in both routes**

```ts
// src/app/story/[slug]/site/page.tsx
export function buildMemorySitePreviewModel(site: MemorySitePageRecord) {
  const sections = site.payload.sections.slice(0, 7)
  return {
    ...site,
    sections: sections.map((section, index) => ({
      ...section,
      kicker: `Chapter ${String(index + 1).padStart(2, '0')}`,
      layout: index % 2 === 0 ? 'imageLeft' : 'imageRight',
    })),
  }
}
```

```tsx
// src/app/(dashboard)/sites/[siteId]/page.tsx
const previewModel = buildMemorySitePreviewModel(site)

return (
  <div className="min-h-full">
    <MemorySiteDetailActions ... />
    <main className={buildMemorySiteShellClassName()}>
      <SiteHero ... />
      ...
      <SiteFooter ... />
    </main>
  </div>
)
```

- [ ] **Step 4: Preserve the public-page behavior while enabling review-mode embedding**

```tsx
<SiteHero
  model={{ ... }}
  backHref="/sites"
  backLabel={t('back')}
  mode="review"
/>
```

- [ ] **Step 5: Run the public and dashboard memory-site tests to verify they pass**

Run: `npm test -- tests/app/public-memory-site-page.test.ts tests/app/dashboard/memory-sites.page.test.ts`
Expected: PASS

### Task 5: Run focused verification for the new review-mode flow

**Files:**
- Verify only

- [ ] **Step 1: Run the targeted dashboard shell and memory-site test suite**

Run: `npm test -- src/components/dashboard-shell-classes.test.ts tests/app/dashboard/memory-sites.page.test.ts tests/app/public-memory-site-page.test.ts tests/components/velvet-select.test.tsx`
Expected: PASS

- [ ] **Step 2: Run lint on the touched layout and memory-site files**

Run: `npm run lint -- src/app/(dashboard)/layout.tsx src/app/(dashboard)/sites/[siteId]/page.tsx src/app/story/[slug]/site/page.tsx src/components/dashboard-shell-classes.ts src/components/memory-site-detail-actions.tsx src/components/memory-site/site-hero.tsx src/components/memory-site/site-footer.tsx src/lib/dashboard-layout.ts`
Expected: PASS

- [ ] **Step 3: Start the local prototype or app and verify the route manually if needed**

Run: `npm run dev`
Expected: App serves locally so `/sites/[siteId]` can be checked for full-width review mode, sticky review bar, and working VelvetSelect surfaces.
