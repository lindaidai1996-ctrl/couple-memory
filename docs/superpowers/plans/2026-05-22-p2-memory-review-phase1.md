# P2 Memory Review Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first P2 review loop with yearly reviews, anniversary reviews, dashboard entry points, dashboard detail pages, and public read-only review pages.

**Architecture:** Add a persisted `MemoryReview` entity in Prisma, query and mapping helpers under `src/lib/memory-reviews`, dashboard and public routes/pages that read stable review records, and a server-side generate route that aggregates high-signal narrative inputs before saving structured review payloads.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma, `node:test`, ESLint

---

### Task 1: Add review data model and migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_memory_reviews/migration.sql`
- Test: `tests/api/couple-route.test.ts`

- [ ] **Step 1: Add the failing schema expectations in an existing test or a new schema-adjacent assertion**

```ts
assert.equal(typeof review.status, 'string')
assert.equal(review.type, 'YEARLY')
```

- [ ] **Step 2: Update Prisma schema with the new enums and model**

```prisma
enum MemoryReviewType {
  YEARLY
  ANNIVERSARY
}

enum MemoryReviewStatus {
  PROCESSING
  READY
  FAILED
}

model MemoryReview {
  id              String             @id @default(cuid())
  couple          Couple             @relation(fields: [coupleId], references: [id])
  coupleId        String
  type            MemoryReviewType
  year            Int?
  anniversaryYear Int?
  title           String
  subtitle        String?
  summary         String
  closing         String
  coverPhotoUrl   String?
  status          MemoryReviewStatus @default(PROCESSING)
  payload         Json
  publishedAt     DateTime?
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt

  @@index([coupleId, type, createdAt])
  @@unique([coupleId, type, year])
  @@unique([coupleId, type, anniversaryYear])
}
```

- [ ] **Step 3: Add the `Couple.memoryReviews` relation**

```prisma
  memoryReviews           MemoryReview[]
```

- [ ] **Step 4: Write the SQL migration**

```sql
CREATE TYPE "MemoryReviewType" AS ENUM ('YEARLY', 'ANNIVERSARY');
CREATE TYPE "MemoryReviewStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

CREATE TABLE "MemoryReview" (
  "id" TEXT NOT NULL,
  "coupleId" TEXT NOT NULL,
  "type" "MemoryReviewType" NOT NULL,
  "year" INTEGER,
  "anniversaryYear" INTEGER,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "summary" TEXT NOT NULL,
  "closing" TEXT NOT NULL,
  "coverPhotoUrl" TEXT,
  "status" "MemoryReviewStatus" NOT NULL DEFAULT 'PROCESSING',
  "payload" JSONB NOT NULL,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MemoryReview_pkey" PRIMARY KEY ("id")
);
```

- [ ] **Step 5: Regenerate Prisma client and verify the repo still type-checks through tests**

Run: `npm test -- tests/api/couple-route.test.ts`

Expected: PASS, or any failure points to missing review relation wiring rather than syntax issues.

### Task 2: Add pure review range and mapping helpers

**Files:**
- Create: `src/lib/memory-reviews/review-mappers.ts`
- Create: `src/lib/memory-reviews/review-queries.ts`
- Create: `tests/lib/memory-review-queries.test.ts`

- [ ] **Step 1: Write failing tests for range labels, published filtering, and payload mapping**

```ts
test('mapMemoryReview converts payload highlights into stable UI items', () => {
  const review = mapMemoryReview({
    id: 'review-1',
    type: 'YEARLY',
    year: 2025,
    anniversaryYear: null,
    title: '2025 年回顾',
    subtitle: '一起走过的一年',
    summary: '这一年，我们开始把日常整理成故事。',
    closing: '故事还会继续。',
    coverPhotoUrl: '/cover.jpg',
    status: 'READY',
    publishedAt: new Date('2025-12-20T00:00:00.000Z'),
    payload: {
      highlights: [
        { id: 'h1', title: '春天见面', narrative: '一起走进新的阶段。', date: '2025-03-02T00:00:00.000Z' },
      ],
    },
  })

  assert.equal(review.highlights.length, 1)
  assert.equal(review.label, '2025')
})
```

- [ ] **Step 2: Implement mapping helpers with stable output types**

```ts
export type MemoryReviewHighlight = {
  id: string
  title: string
  narrative: string
  date: string
  locationName?: string | null
  coverPhotoUrl?: string | null
}
```

- [ ] **Step 3: Implement published and dashboard query helpers**

```ts
export async function getDashboardMemoryReviewsByCoupleId(coupleId: string) {
  return prisma.memoryReview.findMany({
    where: { coupleId },
    orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
  })
}
```

- [ ] **Step 4: Re-run the focused tests**

Run: `npm test -- tests/lib/memory-review-queries.test.ts`

Expected: PASS

### Task 3: Add review builder and generate route

**Files:**
- Create: `src/lib/memory-reviews/review-builder.ts`
- Create: `src/app/api/couples/[coupleId]/memory-reviews/generate/route.ts`
- Create: `tests/api/memory-review-generate-route.test.ts`

- [ ] **Step 1: Write failing route tests for yearly generation and missing anniversary start date**

```ts
test('POST yearly review creates a ready review record', async () => {
  assert.equal(response.status, 200)
  assert.equal(body.review.type, 'YEARLY')
})

test('POST anniversary review rejects when couple has no startDate', async () => {
  assert.equal(response.status, 422)
})
```

- [ ] **Step 2: Implement review range and candidate aggregation helpers**

```ts
export function buildYearlyRange(year: number) {
  return {
    start: new Date(Date.UTC(year, 0, 1)),
    end: new Date(Date.UTC(year + 1, 0, 1)),
  }
}

export function buildAnniversaryRange(startDate: Date, anniversaryYear: number) {
  const start = new Date(startDate)
  start.setUTCFullYear(start.getUTCFullYear() + anniversaryYear - 1)
  const end = new Date(startDate)
  end.setUTCFullYear(end.getUTCFullYear() + anniversaryYear)
  return { start, end }
}
```

- [ ] **Step 3: Implement a deterministic first-pass builder**

```ts
return {
  title,
  subtitle,
  summary,
  closing,
  coverPhotoUrl,
  payload: {
    highlights,
    albumIds,
    chapterIds,
    milestoneIds,
  },
}
```

- [ ] **Step 4: Implement the generate route with auth and upsert-like replacement logic**

Run: `npm test -- tests/api/memory-review-generate-route.test.ts`

Expected: PASS

### Task 4: Add dashboard list route, detail route, and dashboard pages

**Files:**
- Create: `src/app/api/couples/[coupleId]/memory-reviews/route.ts`
- Create: `src/app/api/couples/[coupleId]/memory-reviews/[reviewId]/route.ts`
- Create: `src/app/(dashboard)/reviews/page.tsx`
- Create: `src/app/(dashboard)/reviews/[reviewId]/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`
- Create: `tests/api/memory-review-routes.test.ts`
- Create: `tests/app/dashboard/reviews.page.test.ts`
- Modify: `tests/app/dashboard/dashboard.page.test.ts`

- [ ] **Step 1: Add failing tests for dashboard review card state and route filtering**

```ts
test('buildDashboardReviewCard shows available yearly and anniversary reviews', () => {
  assert.equal(card.hasYearlyReview, true)
  assert.equal(card.hasAnniversaryReview, false)
})
```

- [ ] **Step 2: Add a dashboard card builder and wire it into the dashboard page**

```ts
export function buildDashboardReviewCard(reviews: MemoryReviewListItem[]) {
  const yearlyReview = reviews.find(review => review.type === 'YEARLY')
  const anniversaryReview = reviews.find(review => review.type === 'ANNIVERSARY')
  return {
    hasYearlyReview: Boolean(yearlyReview),
    hasAnniversaryReview: Boolean(anniversaryReview),
    yearlyReview,
    anniversaryReview,
  }
}
```

- [ ] **Step 3: Add the dashboard review list page and detail page**

```tsx
<section>
  <h1>{t('reviewsTitle')}</h1>
  {reviews.map(review => (
    <a key={review.id} href={`/reviews/${review.id}`}>{review.title}</a>
  ))}
</section>
```

- [ ] **Step 4: Re-run focused tests**

Run: `npm test -- tests/app/dashboard/dashboard.page.test.ts tests/app/dashboard/reviews.page.test.ts tests/api/memory-review-routes.test.ts`

Expected: PASS

### Task 5: Add public review queries, routes, and public pages

**Files:**
- Modify: `src/lib/public-metadata.ts`
- Create: `src/app/api/public/[slug]/memory-reviews/route.ts`
- Create: `src/app/s/[slug]/reviews/page.tsx`
- Create: `src/app/s/[slug]/reviews/[reviewId]/page.tsx`
- Modify: `src/app/s/[slug]/page.tsx`
- Create: `tests/app/public-reviews-page.test.ts`
- Modify: `tests/app/public-home-page.test.ts`

- [ ] **Step 1: Write failing tests for public review list mapping and home-page entry visibility**

```ts
test('buildPublicHomeReviewSection exposes a review entry when published reviews exist', () => {
  assert.equal(section.hasReviews, true)
  assert.equal(section.items.length, 1)
})
```

- [ ] **Step 2: Extend `public-metadata` helpers with review queries and metadata kind**

```ts
export type PublicPageKind = 'home' | 'photos' | 'timeline' | 'reviews'
```

- [ ] **Step 3: Add public review list/detail pages and a small home-page entry card**

```tsx
<NavCard
  href={`/s/${slug}/reviews`}
  title={uiText.reviews}
  subtitle={uiText.reviewsSubtitle}
  icon={...}
/>
```

- [ ] **Step 4: Re-run focused public-page tests**

Run: `npm test -- tests/app/public-home-page.test.ts tests/app/public-reviews-page.test.ts`

Expected: PASS

### Task 6: Add i18n copy, run verification, and clean up

**Files:**
- Modify: `messages/en.json`
- Modify: `messages/zh-CN.json`
- Optionally Modify: `tests/app/i18n-surface-copy.test.ts`

- [ ] **Step 1: Add dashboard and public review copy keys**

```json
"reviews": "Reviews",
"reviewsSubtitle": "Read the yearly and anniversary stories gathered from your space.",
"reviewEmpty": "No review is ready yet."
```

- [ ] **Step 2: Run the targeted test suite**

Run: `npm test -- tests/lib/memory-review-queries.test.ts tests/api/memory-review-generate-route.test.ts tests/api/memory-review-routes.test.ts tests/app/dashboard/dashboard.page.test.ts tests/app/dashboard/reviews.page.test.ts tests/app/public-home-page.test.ts tests/app/public-reviews-page.test.ts`

Expected: PASS

- [ ] **Step 3: Run lint on touched files**

Run: `npm run lint -- src/app/(dashboard)/dashboard/page.tsx src/app/s/[slug]/page.tsx src/lib/public-metadata.ts src/lib/memory-reviews/review-builder.ts src/lib/memory-reviews/review-queries.ts src/lib/memory-reviews/review-mappers.ts`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add prisma/schema.prisma prisma/migrations src/app src/lib/memory-reviews messages tests
git commit -m "feat(memory-review): 完成P2首批回顾页闭环"
```
