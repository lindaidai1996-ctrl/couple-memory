# Album Default Cover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the black empty album cover with a deterministic Velvet Plum fallback cover for albums without `coverPhotoUrl`.

**Architecture:** Keep the change entirely in the album list UI. Add a small pure helper that hashes `album.title + album.id` into a fixed set of Velvet Plum cover recipes, then render a dedicated fallback cover block when `coverPhotoUrl` is absent. Cover tests should verify determinism and preserve the existing real-image path.

**Tech Stack:** Next.js App Router, React, TypeScript, Tailwind utility classes, Node test runner, ESLint

---

### Task 1: Add failing tests for fallback cover selection

**Files:**
- Modify: `tests/app/dashboard/library-pages.test.ts`
- Test: `tests/app/dashboard/library-pages.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('buildAlbumFallbackCover returns a stable recipe for the same album seed', () => {
  const first = buildAlbumFallbackCover({ id: 'album_1', title: '2024 夏天' })
  const second = buildAlbumFallbackCover({ id: 'album_1', title: '2024 夏天' })

  assert.deepEqual(second, first)
})

test('buildAlbumFallbackCover can vary recipes for same-title albums with different ids', () => {
  const first = buildAlbumFallbackCover({ id: 'album_1', title: '2024 夏天' })
  const second = buildAlbumFallbackCover({ id: 'album_2', title: '2024 夏天' })

  assert.notEqual(`${first.recipeKey}:${first.accentKey}`, `${second.recipeKey}:${second.accentKey}`)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/app/dashboard/library-pages.test.ts`
Expected: FAIL because `buildAlbumFallbackCover` is not exported yet

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildAlbumFallbackCover(input: { id: string; title: string }) {
  return {
    recipeKey: 'placeholder',
    accentKey: `${input.title}:${input.id}`,
  }
}
```

- [ ] **Step 4: Run test to verify it passes or fails for the next missing behavior**

Run: `npm test tests/app/dashboard/library-pages.test.ts`
Expected: first test passes, second test still fails because different ids do not yet map to a differentiated recipe


### Task 2: Add failing tests for album list fallback rendering

**Files:**
- Modify: `tests/app/dashboard/library-pages.test.ts`
- Test: `tests/app/dashboard/library-pages.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
test('buildAlbumCardVisual returns a generated fallback cover when no coverPhotoUrl exists', () => {
  const visual = buildAlbumCardVisual({
    id: 'album_1',
    title: '2024 夏天',
    coverPhotoUrl: null,
  })

  assert.equal(visual.kind, 'fallback')
  assert.equal(typeof visual.coverClassName, 'string')
  assert.equal(visual.coverClassName.includes('bg-[linear-gradient('), true)
})

test('buildAlbumCardVisual preserves the image path when coverPhotoUrl exists', () => {
  const visual = buildAlbumCardVisual({
    id: 'album_1',
    title: '2024 夏天',
    coverPhotoUrl: 'https://example.com/cover.jpg',
  })

  assert.deepEqual(visual, {
    kind: 'image',
    url: 'https://example.com/cover.jpg',
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test tests/app/dashboard/library-pages.test.ts`
Expected: FAIL because `buildAlbumCardVisual` does not exist yet

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildAlbumCardVisual(album: { id: string; title: string; coverPhotoUrl: string | null }) {
  if (album.coverPhotoUrl) {
    return { kind: 'image', url: album.coverPhotoUrl } as const
  }

  return {
    kind: 'fallback',
    coverClassName: 'bg-[linear-gradient(135deg,#4a2f42_0%,#8f607a_52%,#d7bbb7_100%)]',
  } as const
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test tests/app/dashboard/library-pages.test.ts`
Expected: PASS for the new rendering-logic tests


### Task 3: Implement Velvet Plum fallback recipes in the albums page

**Files:**
- Modify: `src/app/(dashboard)/albums/page.tsx`
- Test: `tests/app/dashboard/library-pages.test.ts`

- [ ] **Step 1: Replace placeholder helper with deterministic recipe selection**

```ts
const ALBUM_FALLBACK_RECIPES = [
  {
    recipeKey: 'plum-dawn',
    coverClassName: 'bg-[linear-gradient(135deg,#4a2f42_0%,#8f607a_46%,#d7bbb7_100%)]',
    overlayClassName: 'bg-[radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.32),transparent_32%),radial-gradient(circle_at_82%_72%,rgba(255,240,248,0.18),transparent_30%)]',
  },
]
```

- [ ] **Step 2: Add a small deterministic hash function and return a recipe by index**

```ts
function hashAlbumSeed(seed: string) {
  let hash = 0
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return hash
}
```

- [ ] **Step 3: Add a focused fallback cover renderer inside the albums page module**

```tsx
function AlbumFallbackCover({ album }: { album: Pick<Album, 'id' | 'title' | 'coverPhotoUrl'> }) {
  const visual = buildAlbumCardVisual(album)
  if (visual.kind !== 'fallback') return null

  return <div className={visual.coverClassName}>...</div>
}
```

- [ ] **Step 4: Switch the album card JSX to use the image path or fallback cover path explicitly**

```tsx
const coverVisual = buildAlbumCardVisual(album)
```

- [ ] **Step 5: Run targeted tests**

Run: `npm test tests/app/dashboard/library-pages.test.ts`
Expected: PASS


### Task 4: Verify and clean up

**Files:**
- Modify: `src/app/(dashboard)/albums/page.tsx`
- Modify: `tests/app/dashboard/library-pages.test.ts`

- [ ] **Step 1: Run lint for touched files**

Run: `npm run lint -- 'src/app/(dashboard)/albums/page.tsx' tests/app/dashboard/library-pages.test.ts`
Expected: exit 0

- [ ] **Step 2: Re-run targeted tests as final verification**

Run: `npm test tests/app/dashboard/library-pages.test.ts`
Expected: PASS with 0 failures

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-05-24-album-default-cover-design.md docs/superpowers/plans/2026-05-24-album-default-cover.md tests/app/dashboard/library-pages.test.ts 'src/app/(dashboard)/albums/page.tsx'
git commit -m "feat(albums): 添加默认渐变封面"
```
