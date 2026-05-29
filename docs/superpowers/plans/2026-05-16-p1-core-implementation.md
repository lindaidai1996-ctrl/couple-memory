# P1 Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the P1 core foundations and first implementation slice for photo management, public space configuration, public SEO, and AI retry observability.

**Architecture:** Start with a shared foundation layer so schema, session shape, upload purposes, and error envelopes are stable. Then implement feature slices with disjoint write scopes: photo management on dashboard album flows, public space configuration on settings and public data sources, public SEO on server metadata generation, and AI observability on pipeline run semantics and admin routes.

**Tech Stack:** Next.js App Router, TypeScript, Prisma, PostgreSQL, NextAuth v5, OSS direct upload, Node test runner via `tsx`, ESLint

---

## File Structure

- Create: `docs/superpowers/plans/2026-05-16-p1-core-implementation.md`
- Create: `tests/helpers/`
- Create: `tests/api/`
- Create: `tests/lib/`
- Modify: `package.json`
- Modify: `prisma/schema.prisma`
- Modify: `prisma/migrations/*`
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/auth.config.ts`
- Modify: `src/lib/api-middleware.ts`
- Modify: `src/app/(dashboard)/albums/[albumId]/page.tsx`
- Modify: `src/components/photo-detail-modal.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/app/story/[slug]/layout.tsx`
- Modify: `src/app/story/[slug]/page.tsx`
- Modify: `src/app/story/[slug]/photos/page.tsx`
- Modify: `src/app/story/[slug]/timeline/page.tsx`
- Modify: `src/app/api/couples/[coupleId]/route.ts`
- Modify: `src/app/api/couples/[coupleId]/photos/route.ts`
- Modify: `src/app/api/couples/[coupleId]/photos/[photoId]/route.ts`
- Modify: `src/app/api/couples/[coupleId]/photos/[photoId]/retry/route.ts`
- Create: `src/app/api/users/me/profile/route.ts`
- Create: `src/app/api/couples/[coupleId]/photos/batch/route.ts`
- Create: `src/app/api/couples/[coupleId]/albums/[albumId]/cover/route.ts`
- Create: `src/app/api/couples/[coupleId]/albums/[albumId]/photos/reorder/route.ts`
- Create: `src/app/api/couples/[coupleId]/photos/[photoId]/runs/route.ts`
- Create: `src/app/api/couples/[coupleId]/runs/route.ts`
- Create: `src/app/api/couples/[coupleId]/runs/[runId]/route.ts`
- Create: `src/lib/photos/`
- Create: `src/lib/covers/`
- Create: `src/lib/pipeline/run-status.ts`

### Task 1: Add Minimal Test Infrastructure

**Files:**
- Modify: `package.json`
- Create: `tests/lib/cover-resolution.test.ts`
- Create: `tests/lib/run-status.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveAlbumCover } from '@/lib/covers/album-cover'

test('resolveAlbumCover uses first ready photo in auto mode', () => {
  const result = resolveAlbumCover({
    coverMode: 'AUTO',
    coverPhotoId: null,
    photos: [
      { id: 'p1', status: 'READY', displayUrl: 'https://cdn/p1.jpg', sortOrder: 1 },
    ],
  })

  assert.equal(result?.photoId, 'p1')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/lib/cover-resolution.test.ts`
Expected: FAIL with module not found for `@/lib/covers/album-cover`

- [ ] **Step 3: Write minimal implementation**

```ts
export function resolveAlbumCover(input: {
  coverMode: 'AUTO' | 'MANUAL'
  coverPhotoId: string | null
  photos: Array<{
    id: string
    status: 'READY' | 'FAILED' | 'PROCESSING' | 'UPLOADING'
    displayUrl: string | null
    sortOrder: number
  }>
}) {
  return input.photos.find(photo => photo.status === 'READY' && photo.displayUrl) ?? null
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/lib/cover-resolution.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json tests/lib/cover-resolution.test.ts tests/lib/run-status.test.ts src/lib/covers/
git commit -m "test: add minimal node test harness for P1 foundations"
```

### Task 2: Implement Shared Schema and Auth Foundations

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/lib/auth.ts`
- Modify: `src/lib/auth.config.ts`
- Modify: `src/lib/api-middleware.ts`
- Create: `src/lib/covers/album-cover.ts`
- Create: `src/lib/pipeline/run-status.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { resolvePipelineOutcome } from '@/lib/pipeline/run-status'

test('resolvePipelineOutcome returns FAILED when latest run failed', () => {
  const result = resolvePipelineOutcome({
    latestRunStatus: 'FAILED',
    hasDisplayAssets: true,
  })

  assert.equal(result.photoStatus, 'FAILED')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/lib/run-status.test.ts`
Expected: FAIL with module not found for `@/lib/pipeline/run-status`

- [ ] **Step 3: Write minimal implementation**

```ts
export function resolvePipelineOutcome(input: {
  latestRunStatus: 'COMPLETED' | 'FAILED' | 'DEGRADED'
  hasDisplayAssets: boolean
}) {
  if (input.latestRunStatus === 'FAILED') {
    return { photoStatus: 'FAILED' as const }
  }

  return { photoStatus: input.hasDisplayAssets ? 'READY' as const : 'FAILED' as const }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/lib/run-status.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/lib/auth.ts src/lib/auth.config.ts src/lib/api-middleware.ts src/lib/covers/ src/lib/pipeline/run-status.ts tests/lib/run-status.test.ts
git commit -m "feat: add shared P1 schema and auth foundations"
```

### Task 3: Implement Photo Management Backend and Dashboard Flows

**Files:**
- Modify: `src/app/(dashboard)/albums/[albumId]/page.tsx`
- Modify: `src/components/photo-detail-modal.tsx`
- Modify: `src/app/api/couples/[coupleId]/photos/route.ts`
- Modify: `src/app/api/couples/[coupleId]/photos/[photoId]/route.ts`
- Create: `src/app/api/couples/[coupleId]/photos/batch/route.ts`
- Create: `src/app/api/couples/[coupleId]/albums/[albumId]/photos/reorder/route.ts`
- Create: `src/app/api/couples/[coupleId]/albums/[albumId]/cover/route.ts`
- Create: `tests/api/photo-batch-route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

test('batch move requires targetAlbumId for MOVE action', async () => {
  const { POST } = await import('@/app/api/couples/[coupleId]/photos/batch/route')
  const req = new Request('http://localhost/api/couples/c1/photos/batch', {
    method: 'POST',
    body: JSON.stringify({ action: 'MOVE', photoIds: ['p1'] }),
    headers: { 'Content-Type': 'application/json' },
  })

  const res = await POST(req as never, { params: Promise.resolve({ coupleId: 'c1' }) } as never)
  assert.equal(res.status, 400)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/api/photo-batch-route.test.ts`
Expected: FAIL because route file does not exist

- [ ] **Step 3: Write minimal implementation**

```ts
if (action === 'MOVE' && !targetAlbumId) {
  return NextResponse.json({ error: { code: 'TARGET_ALBUM_REQUIRED', message: 'targetAlbumId is required', retryable: false } }, { status: 400 })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/api/photo-batch-route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/albums/[albumId]/page.tsx src/components/photo-detail-modal.tsx src/app/api/couples/[coupleId]/photos/route.ts src/app/api/couples/[coupleId]/photos/[photoId]/route.ts src/app/api/couples/[coupleId]/photos/batch/route.ts src/app/api/couples/[coupleId]/albums/[albumId]/photos/reorder/route.ts src/app/api/couples/[coupleId]/albums/[albumId]/cover/route.ts tests/api/photo-batch-route.test.ts
git commit -m "feat: add photo management workbench foundations"
```

### Task 4: Implement Public Space Configuration

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/app/api/couples/[coupleId]/route.ts`
- Create: `src/app/api/users/me/profile/route.ts`
- Modify: `src/lib/auth.config.ts`
- Create: `tests/api/user-profile-route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

test('profile route rejects avatar update when no avatar provided', async () => {
  const { PATCH } = await import('@/app/api/users/me/profile/route')
  const req = new Request('http://localhost/api/users/me/profile', {
    method: 'PATCH',
    body: JSON.stringify({}),
    headers: { 'Content-Type': 'application/json' },
  })

  const res = await PATCH(req)
  assert.equal(res.status, 400)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/api/user-profile-route.test.ts`
Expected: FAIL because route file does not exist

- [ ] **Step 3: Write minimal implementation**

```ts
if (!body.avatar) {
  return NextResponse.json({ error: { code: 'AVATAR_REQUIRED', message: 'avatar is required', retryable: false } }, { status: 400 })
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/api/user-profile-route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/(dashboard)/settings/page.tsx src/app/api/couples/[coupleId]/route.ts src/app/api/users/me/profile/route.ts src/lib/auth.config.ts tests/api/user-profile-route.test.ts
git commit -m "feat: add public space configuration flows"
```

### Task 5: Implement Public Space SEO

**Files:**
- Modify: `src/app/story/[slug]/layout.tsx`
- Modify: `src/app/story/[slug]/page.tsx`
- Modify: `src/app/story/[slug]/photos/page.tsx`
- Modify: `src/app/story/[slug]/timeline/page.tsx`
- Create: `tests/lib/public-metadata.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildPublicMetadata } from '@/lib/public-metadata'

test('buildPublicMetadata uses coverPhotoUrl as og image when present', () => {
  const metadata = buildPublicMetadata({
    path: '/story/our-story',
    name: 'Our Story',
    bio: 'hello',
    coverPhotoUrl: 'https://cdn/cover.jpg',
  })

  assert.equal(metadata.openGraph?.images?.[0]?.url, 'https://cdn/cover.jpg')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/lib/public-metadata.test.ts`
Expected: FAIL because helper does not exist

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildPublicMetadata(input: { path: string; name: string; bio: string | null; coverPhotoUrl: string | null }) {
  return {
    title: `${input.name} | Couple Memory`,
    description: input.bio ?? '我们一起记录的照片与时间',
    openGraph: input.coverPhotoUrl ? { images: [{ url: input.coverPhotoUrl }] } : undefined,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/lib/public-metadata.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/app/story/[slug]/layout.tsx src/app/story/[slug]/page.tsx src/app/story/[slug]/photos/page.tsx src/app/story/[slug]/timeline/page.tsx src/lib/public-metadata.ts tests/lib/public-metadata.test.ts
git commit -m "feat: add public space metadata generation"
```

### Task 6: Implement AI Retry and Observability Surfaces

**Files:**
- Modify: `src/lib/pipeline/process-photo.ts`
- Modify: `src/lib/agents/pipeline.ts`
- Modify: `src/app/api/couples/[coupleId]/photos/[photoId]/retry/route.ts`
- Modify: `src/app/api/couples/[coupleId]/photos/[photoId]/route.ts`
- Create: `src/app/api/couples/[coupleId]/photos/[photoId]/runs/route.ts`
- Create: `src/app/api/couples/[coupleId]/runs/route.ts`
- Create: `src/app/api/couples/[coupleId]/runs/[runId]/route.ts`
- Create: `tests/api/photo-retry-route.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import test from 'node:test'
import assert from 'node:assert/strict'

test('retry route rejects retry when photo is already processing', async () => {
  const { buildRetryGuard } = await import('@/lib/pipeline/run-status')
  const guard = buildRetryGuard({ photoStatus: 'PROCESSING', latestRunStatus: 'RUNNING' })
  assert.equal(guard.allowed, false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import tsx --test tests/api/photo-retry-route.test.ts`
Expected: FAIL because helper does not exist

- [ ] **Step 3: Write minimal implementation**

```ts
export function buildRetryGuard(input: { photoStatus: string; latestRunStatus: string | null }) {
  if (input.photoStatus === 'PROCESSING' || input.latestRunStatus === 'RUNNING') {
    return { allowed: false, code: 'PIPELINE_ALREADY_RUNNING' as const }
  }

  return { allowed: true as const }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import tsx --test tests/api/photo-retry-route.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/pipeline/process-photo.ts src/lib/agents/pipeline.ts src/app/api/couples/[coupleId]/photos/[photoId]/retry/route.ts src/app/api/couples/[coupleId]/photos/[photoId]/route.ts src/app/api/couples/[coupleId]/photos/[photoId]/runs/route.ts src/app/api/couples/[coupleId]/runs/route.ts src/app/api/couples/[coupleId]/runs/[runId]/route.ts tests/api/photo-retry-route.test.ts
git commit -m "feat: add AI retry and pipeline run observability"
```

## Self-Review

- Spec coverage:
  - Photo management spec is covered by Tasks 2 and 3.
  - Public space configuration spec is covered by Tasks 2 and 4.
  - Public SEO spec is covered by Task 5.
  - AI retry and observability spec is covered by Tasks 2 and 6.
- Placeholder scan:
  - No `TODO`, `TBD`, or "implement later" placeholders are left in tasks.
- Type consistency:
  - Shared names are normalized around `coverMode`, `coverPhotoId`, `triggerType`, `attemptNumber`, and `PIPELINE_ALREADY_RUNNING`.

## Execution Mode

This plan will be executed in the current session using subAgent-parallel implementation where write scopes are disjoint and shared foundation work is completed first.
