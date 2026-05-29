# AI Memory Site Generator V1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a first shipping slice of the AI memory-site generator: authenticated draft generation from album or chapter content, a lightweight dashboard review flow, and a public single-page render at `/story/[slug]/site` styled as a Velvet Plum editorial variant.

**Architecture:** Keep the current public home, review pages, and album/chapter data model intact. Add a new persisted `MemorySite` draft/publish record, generate its payload server-side from existing album, chapter, photo, and couple metadata, and render it through a dedicated public route instead of replacing the current `/story/[slug]` home immediately. Publish gating in this slice uses existing plan state and a server-side entitlement check; third-party payment checkout is explicitly deferred.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Prisma/PostgreSQL, `next-intl`, `node:test`, ESLint

---

### Task 1: Add the persisted memory-site domain and builder

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `src/lib/memory-sites/site-builder.ts`
- Create: `tests/lib/memory-site-builder.test.ts`

- [ ] **Step 1: Write the failing builder test for stage selection, photo balancing, and copy fallbacks**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMemorySite } from '../../src/lib/memory-sites/site-builder'

test('buildMemorySite turns chapter content into a balanced editorial payload', () => {
  const site = buildMemorySite({
    coupleName: '月亮与晚风',
    style: 'VELVET_PLUM_EDITORIAL',
    startDate: new Date('2024-02-14T00:00:00.000Z'),
    album: {
      id: 'album_1',
      title: '在一起的第一年',
      description: '从春天到冬天，照片越来越像一本我们自己写的书。',
      coverPhotoUrl: 'https://img.example.com/cover.jpg',
    },
    chapters: [
      {
        id: 'chapter_1',
        title: '春天散步',
        aiSummary: '天气刚刚回暖，你们开始习惯一起绕远路回家。',
        photos: [
          {
            id: 'photo_1',
            displayUrl: 'https://img.example.com/1.jpg',
            thumbnailUrl: 'https://img.example.com/1-thumb.jpg',
            takenAt: new Date('2024-03-01T10:00:00.000Z'),
            locationName: '广州',
            userCaption: '一起吃完饭又走了很久。',
            aiCaption: null,
            aiMood: 'warm',
          },
          {
            id: 'photo_2',
            displayUrl: 'https://img.example.com/2.jpg',
            thumbnailUrl: 'https://img.example.com/2-thumb.jpg',
            takenAt: new Date('2024-03-01T10:30:00.000Z'),
            locationName: '广州',
            userCaption: null,
            aiCaption: '晚风把这段时间吹得很慢。',
            aiMood: 'calm',
          },
        ],
      },
      {
        id: 'chapter_2',
        title: '海边旅行',
        aiSummary: '第一次把好天气和海风一起留在同一个章节里。',
        photos: [
          {
            id: 'photo_3',
            displayUrl: 'https://img.example.com/3.jpg',
            thumbnailUrl: 'https://img.example.com/3-thumb.jpg',
            takenAt: new Date('2024-05-02T08:00:00.000Z'),
            locationName: '汕头',
            userCaption: null,
            aiCaption: '海边把你们的这一段写得更开阔。',
            aiMood: 'open',
          },
        ],
      },
    ],
  })

  assert.equal(site.sections.length, 2)
  assert.equal(site.sections[0]?.chapterId, 'chapter_1')
  assert.equal(site.sections[0]?.photos[0]?.role, 'hero')
  assert.equal(site.sections[0]?.photos.some(photo => photo.role === 'detail'), true)
  assert.equal(site.coverPhotoUrl, 'https://img.example.com/cover.jpg')
  assert.match(site.intro, /第一年|春天|冬天/)
})
```

- [ ] **Step 2: Run the test and confirm the new builder module is missing**

Run:

```bash
npm test -- tests/lib/memory-site-builder.test.ts
```

Expected: FAIL with `Cannot find module '../../src/lib/memory-sites/site-builder'` or missing export errors.

- [ ] **Step 3: Add the Prisma model and builder types**

```prisma
enum MemorySiteStyle {
  VELVET_PLUM_EDITORIAL
}

enum MemorySiteStatus {
  DRAFT
  READY
  PUBLISHED
}

model MemorySite {
  id               String           @id @default(cuid())
  couple           Couple           @relation(fields: [coupleId], references: [id])
  coupleId         String
  scopeKey         String
  sourceAlbumId    String?
  sourceChapterIds String[]         @default([])
  style            MemorySiteStyle
  status           MemorySiteStatus @default(DRAFT)
  title            String
  subtitle         String?
  intro            String
  closing          String
  coverPhotoUrl    String?
  payload          Json
  publishedAt      DateTime?
  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  @@unique([coupleId, scopeKey])
  @@index([coupleId, status, publishedAt])
}
```

```ts
export type MemorySitePhotoRole = 'hero' | 'relationship' | 'scene' | 'detail'

export type BuildMemorySiteInput = {
  coupleName: string
  style: 'VELVET_PLUM_EDITORIAL'
  startDate: Date | null
  album: {
    id: string
    title: string
    description: string | null
    coverPhotoUrl: string | null
  }
  chapters: Array<{
    id: string
    title: string
    aiSummary: string | null
    photos: Array<{
      id: string
      displayUrl: string | null
      thumbnailUrl: string | null
      takenAt: Date | null
      locationName: string | null
      userCaption: string | null
      aiCaption: string | null
      aiMood: string | null
    }>
  }>
}
```

- [ ] **Step 4: Implement the minimal builder and mapper to satisfy the test**

```ts
function pickPhotoRole(index: number, total: number): MemorySitePhotoRole {
  if (index === 0) return 'hero'
  if (index === total - 1) return 'detail'
  return index % 2 === 0 ? 'scene' : 'relationship'
}

function pickPhotoNarrative(photo: BuildMemorySiteInput['chapters'][number]['photos'][number]) {
  return photo.userCaption?.trim() || photo.aiCaption?.trim() || '这一幕被保留下来，成为这一阶段最具体的注脚。'
}

export function buildMemorySite(input: BuildMemorySiteInput) {
  const sections = input.chapters
    .filter(chapter => chapter.photos.some(photo => photo.displayUrl || photo.thumbnailUrl))
    .slice(0, 7)
    .map(chapter => {
      const photos = chapter.photos
        .filter(photo => photo.displayUrl || photo.thumbnailUrl)
        .slice(0, 7)
        .map((photo, index, all) => ({
          id: photo.id,
          imageUrl: photo.displayUrl ?? photo.thumbnailUrl!,
          locationName: photo.locationName,
          takenAt: photo.takenAt?.toISOString() ?? null,
          narrative: pickPhotoNarrative(photo),
          role: pickPhotoRole(index, all.length),
        }))

      return {
        chapterId: chapter.id,
        title: chapter.title,
        summary: chapter.aiSummary?.trim() || input.album.description?.trim() || '这一阶段被整理成一个可以继续阅读的篇章。',
        photos,
      }
    })

  if (sections.length === 0) {
    throw new Error('NOT_ENOUGH_MEMORY_SITE_CONTENT')
  }

  return {
    title: input.album.title,
    subtitle: `${input.coupleName} 的纪念站`,
    intro: input.album.description?.trim() || `${input.coupleName} 把这段时间整理成了一页可以反复回看的纪念站。`,
    closing: '这一页先停在这里，剩下的内容会继续在你们的回忆里生长。',
    coverPhotoUrl: input.album.coverPhotoUrl ?? sections[0]?.photos[0]?.imageUrl ?? null,
    payload: {
      style: input.style,
      sectionCount: sections.length,
      sections,
    },
    sections,
  }
}
```

- [ ] **Step 5: Run the builder test and create the migration**

Run:

```bash
npm test -- tests/lib/memory-site-builder.test.ts
npx prisma migrate dev --name add_memory_site
```

Expected: the test PASSes and Prisma prints `Applying migration` plus a generated client update.

### Task 2: Add draft generation queries and authenticated API routes

**Files:**
- Create: `src/lib/memory-sites/site-queries.ts`
- Create: `src/app/api/couples/[coupleId]/memory-sites/route.ts`
- Create: `src/app/api/couples/[coupleId]/memory-sites/generate/route.ts`
- Create: `src/app/api/couples/[coupleId]/memory-sites/[siteId]/route.ts`
- Create: `tests/api/memory-site-routes.test.ts`

- [ ] **Step 1: Write failing route tests for listing, generating, and publishing memory sites**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { createGenerateMemorySiteHandler } from '../../src/app/api/couples/[coupleId]/memory-sites/generate/route'
import { createListMemorySitesHandler } from '../../src/app/api/couples/[coupleId]/memory-sites/route'
import { createPublishMemorySiteHandler } from '../../src/app/api/couples/[coupleId]/memory-sites/[siteId]/route'

test('POST generate route creates a READY draft from album content', async () => {
  const response = await createGenerateMemorySiteHandler({
    prisma: {
      coupleUser: { findFirst: async () => ({ coupleId: 'couple_1' }) },
      album: {
        findFirst: async () => ({
          id: 'album_1',
          title: '在一起的第一年',
          description: 'desc',
          coverPhotoUrl: 'https://img.example.com/cover.jpg',
          couple: { name: '月亮与晚风', startDate: new Date('2024-02-14T00:00:00.000Z') },
          chapters: [],
        }),
      },
      memorySite: {
        upsert: async ({ create }: { create: { title: string } }) => ({
          id: 'site_1',
          status: 'READY',
          title: create.title,
        }),
      },
    } as never,
  })(
    new Request('http://localhost/api/couples/couple_1/memory-sites/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ albumId: 'album_1', style: 'VELVET_PLUM_EDITORIAL' }),
    }),
    { coupleId: 'couple_1', userId: 'user_1' }
  )

  const body = await response.json()
  assert.equal(response.status, 200)
  assert.equal(body.site.status, 'READY')
})

test('PATCH publish route rejects free-plan publish attempts', async () => {
  const response = await createPublishMemorySiteHandler({
    prisma: {
      coupleUser: { findFirst: async () => ({ coupleId: 'couple_1', couple: { plan: 'free' } }) },
    } as never,
  })(
    new Request('http://localhost/api/couples/couple_1/memory-sites/site_1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish' }),
    }),
    { coupleId: 'couple_1', siteId: 'site_1', userId: 'user_1' }
  )

  assert.equal(response.status, 402)
})
```

- [ ] **Step 2: Run the route tests and confirm the handlers do not exist**

Run:

```bash
npm test -- tests/api/memory-site-routes.test.ts
```

Expected: FAIL with missing route modules or missing exports.

- [ ] **Step 3: Add query helpers and generation handler that reuse the builder**

```ts
export async function getMemorySiteGenerationSource(
  coupleId: string,
  albumId: string,
  prismaClient = prisma
) {
  return prismaClient.album.findFirst({
    where: { id: albumId, coupleId },
    select: {
      id: true,
      title: true,
      description: true,
      coverPhotoUrl: true,
      couple: { select: { name: true, startDate: true } },
      chapters: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          title: true,
          aiSummary: true,
          photos: {
            where: { status: 'READY' },
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
            select: {
              id: true,
              displayUrl: true,
              thumbnailUrl: true,
              takenAt: true,
              locationName: true,
              userCaption: true,
              aiCaption: true,
              aiMood: true,
            },
          },
        },
      },
    },
  })
}
```

```ts
export const POST = withCoupleAccess(async (req, { couple }) => {
  const body = await req.json()
  const source = await getMemorySiteGenerationSource(couple.id, body.albumId)

  if (!source) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  }

  const built = buildMemorySite({
    coupleName: source.couple.name,
    style: body.style ?? 'VELVET_PLUM_EDITORIAL',
    startDate: source.couple.startDate,
    album: source,
    chapters: source.chapters,
  })

  const scopeKey = `album:${source.id}:style:${body.style ?? 'VELVET_PLUM_EDITORIAL'}`
  const site = await prisma.memorySite.upsert({
    where: { coupleId_scopeKey: { coupleId: couple.id, scopeKey } },
    update: {
      title: built.title,
      subtitle: built.subtitle,
      intro: built.intro,
      closing: built.closing,
      coverPhotoUrl: built.coverPhotoUrl,
      payload: built.payload,
      sourceAlbumId: source.id,
      sourceChapterIds: source.chapters.map(chapter => chapter.id),
      style: 'VELVET_PLUM_EDITORIAL',
      status: 'READY',
      publishedAt: null,
    },
    create: {
      coupleId: couple.id,
      scopeKey,
      sourceAlbumId: source.id,
      sourceChapterIds: source.chapters.map(chapter => chapter.id),
      style: 'VELVET_PLUM_EDITORIAL',
      status: 'READY',
      title: built.title,
      subtitle: built.subtitle,
      intro: built.intro,
      closing: built.closing,
      coverPhotoUrl: built.coverPhotoUrl,
      payload: built.payload,
    },
  })

  return NextResponse.json({ site })
})
```

- [ ] **Step 4: Add list and publish handlers with a plan gate**

```ts
function canPublishMemorySite(plan: string) {
  return plan !== 'free'
}

export const GET = withCoupleAccess(async (_req, { couple }) => {
  const sites = await prisma.memorySite.findMany({
    where: { coupleId: couple.id },
    orderBy: [{ updatedAt: 'desc' }],
  })

  return NextResponse.json({ sites })
})

export const PATCH = withCoupleAccess(async (req, { couple, params }) => {
  const body = await req.json()
  if (body.action !== 'publish') {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  }

  if (!canPublishMemorySite(couple.plan)) {
    return NextResponse.json({ error: 'Publishing requires a paid plan' }, { status: 402 })
  }

  const site = await prisma.memorySite.update({
    where: { id: params.siteId },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  })

  return NextResponse.json({ site })
})
```

- [ ] **Step 5: Run the focused route tests**

Run:

```bash
npm test -- tests/api/memory-site-routes.test.ts
```

Expected: PASS with generation, listing, and plan-gated publish behavior covered.

### Task 3: Build the dashboard generate-and-review surface

**Files:**
- Create: `src/app/(dashboard)/sites/page.tsx`
- Create: `src/app/(dashboard)/sites/[siteId]/page.tsx`
- Modify: `src/app/api/couples/[coupleId]/albums/route.ts`
- Modify: `messages/zh-CN.json`
- Modify: `messages/en.json`
- Create: `tests/app/dashboard/memory-sites.page.test.ts`

**Dashboard UX scope correction:**

The product spec requires lightweight range confirmation, so the V1 dashboard surface cannot silently choose `albums[0]`. This task must now include:

1. A visible album selection surface on `/sites`.
2. Per-album readiness state (`eligible` vs `ineligible`).
3. User-readable ineligible reasons before submit.
4. Inline error feedback when generation still fails.
5. Correct parsing of the existing albums API response shape instead of assuming a bare array.

- [ ] **Step 1: Write failing dashboard tests for generation CTA, album selection readiness, error copy, and lightweight review actions**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import { buildMemorySitesUiText } from '../../../src/app/(dashboard)/sites/page'
import { buildMemorySiteReviewActions } from '../../../src/app/(dashboard)/sites/[siteId]/page'

test('buildMemorySitesUiText exposes generation and publish copy', () => {
  const uiText = buildMemorySitesUiText(key => key)

  assert.equal(uiText.title, 'title')
  assert.equal(uiText.generate, 'generate')
  assert.equal(uiText.publishLocked, 'publishLocked')
})

test('buildMemorySiteReviewActions only exposes light-touch editing controls', () => {
  assert.deepEqual(buildMemorySiteReviewActions(), [
    'regenerateSelection',
    'replacePhoto',
    'editCopy',
    'publish',
  ])
})
```

- [ ] **Step 2: Run the dashboard test and confirm the page helpers do not exist**

Run:

```bash
npm test -- tests/app/dashboard/memory-sites.page.test.ts
```

Expected: FAIL with missing dashboard route module or helper exports.

- [ ] **Step 3: Build the dashboard list page modeled after the review flow**

```tsx
export function buildMemorySitesUiText(t: (key: string) => string) {
  return {
    title: t('title'),
    subtitle: t('subtitle'),
    generate: t('generate'),
    empty: t('empty'),
    publishLocked: t('publishLocked'),
  }
}

export default function MemorySitesPage() {
  const t = useTranslations('MemorySitesPage')
  const uiText = buildMemorySitesUiText(t)
  const [sites, setSites] = useState<MemorySiteListItem[]>([])

  return (
    <div className="space-y-6">
      <section className="dashboard-surface-card rounded-[28px] px-6 py-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-warm-muted">Memory Sites</p>
            <h1 className="mt-3 font-[var(--font-dashboard-title)] text-[clamp(2rem,4vw,3rem)] leading-none tracking-[-0.04em] text-warm-text">
              {uiText.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-warm-muted">{uiText.subtitle}</p>
          </div>
          <Button variant="brand" pill leadingIcon={<SparklesIcon />}>
            {uiText.generate}
          </Button>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Build the review detail page with only the approved edit surface**

```ts
export function buildMemorySiteReviewActions() {
  return ['regenerateSelection', 'replacePhoto', 'editCopy', 'publish'] as const
}
```

```tsx
<aside className="dashboard-surface-card-strong rounded-[24px] p-5">
  <h2 className="font-[var(--font-dashboard-title)] text-[26px] leading-none tracking-[-0.04em] text-warm-text">
    {t('reviewPanelTitle')}
  </h2>
  <div className="mt-4 space-y-3">
    <Button variant="secondary">{t('regenerateSelection')}</Button>
    <Button variant="secondary">{t('replacePhoto')}</Button>
    <Button variant="secondary">{t('editCopy')}</Button>
    <Button variant="brand" disabled={!canPublish}>{canPublish ? t('publish') : t('publishLocked')}</Button>
  </div>
</aside>
```

- [ ] **Step 5: Add translation keys and run the dashboard test**

```json
"MemorySitesPage": {
  "title": "AI 纪念站",
  "subtitle": "从相册和章节里生成一个可分享的摄影师风格成品页。",
  "generate": "生成纪念站",
  "empty": "先选择一个相册生成第一版纪念站。",
  "publishLocked": "升级方案后可发布"
}
```

Run:

```bash
npm test -- tests/app/dashboard/memory-sites.page.test.ts
```

Expected: PASS and only the approved lightweight actions are exposed.

### Task 4: Render the public single-page site as a Velvet Plum editorial variant

**Files:**
- Create: `src/components/memory-site/site-hero.tsx`
- Create: `src/components/memory-site/site-section.tsx`
- Create: `src/components/memory-site/site-footer.tsx`
- Create: `src/app/story/[slug]/site/page.tsx`
- Modify: `src/lib/public-metadata.ts`
- Create: `tests/app/public-memory-site-page.test.ts`

- [ ] **Step 1: Write failing public-page tests for section count, alternating layouts, and token-driven shell classes**

```ts
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildMemorySitePageModel,
  buildMemorySiteShellClassName,
} from '../../src/app/story/[slug]/site/page'

test('buildMemorySitePageModel keeps only the first seven sections and alternates editorial layouts', () => {
  const model = buildMemorySitePageModel({
    title: '在一起的第一年',
    subtitle: '副标题',
    intro: '引子',
    closing: '收尾',
    coverPhotoUrl: 'https://img.example.com/cover.jpg',
    payload: {
      style: 'VELVET_PLUM_EDITORIAL',
      sections: Array.from({ length: 8 }, (_, index) => ({
        chapterId: `chapter_${index}`,
        title: `阶段 ${index + 1}`,
        summary: 'summary',
        photos: [{ id: `photo_${index}`, imageUrl: 'https://img.example.com/a.jpg', role: 'hero', narrative: 'narrative', locationName: null, takenAt: null }],
      })),
    },
  })

  assert.equal(model.sections.length, 7)
  assert.equal(model.sections[0]?.layout, 'imageLeft')
  assert.equal(model.sections[1]?.layout, 'imageRight')
})

test('buildMemorySiteShellClassName references Velvet Plum surfaces instead of the old warm shell', () => {
  assert.match(buildMemorySiteShellClassName(), /vp-memory-site-shell/)
})
```

- [ ] **Step 2: Run the public-page test and confirm the route helpers are missing**

Run:

```bash
npm test -- tests/app/public-memory-site-page.test.ts
```

Expected: FAIL with missing page route module or helper exports.

- [ ] **Step 3: Add the page model helpers and public metadata support**

```ts
export type PublicPageKind = 'home' | 'photos' | 'timeline' | 'review' | 'topics' | 'site'

export function buildMemorySiteShellClassName() {
  return 'vp-memory-site-shell min-h-screen bg-[var(--vp-bg-light)] text-[var(--vp-text-light)]'
}

export function buildMemorySitePageModel(site: {
  title: string
  subtitle: string | null
  intro: string
  closing: string
  coverPhotoUrl: string | null
  payload: { style: string; sections: Array<Record<string, unknown>> }
}) {
  const sections = (site.payload.sections as Array<{
    chapterId: string
    title: string
    summary: string
    photos: Array<Record<string, unknown>>
  }>).slice(0, 7)

  return {
    ...site,
    sections: sections.map((section, index) => ({
      ...section,
      layout: index % 2 === 0 ? 'imageLeft' : 'imageRight',
    })),
  }
}
```

- [ ] **Step 4: Build the public route and dedicated presentational components**

```tsx
export default async function PublicMemorySitePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const space = await getPublicSpacePageDataBySlug(slug)
  if (!space || !space.isPublic) notFound()

  const site = await getPublishedMemorySiteByCoupleId(space.id)
  if (!site) notFound()

  const model = buildMemorySitePageModel(site)

  return (
    <main className={buildMemorySiteShellClassName()}>
      <SiteHero model={model} />
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-6 pb-24">
        {model.sections.map(section => (
          <SiteSection key={section.chapterId} section={section} />
        ))}
        <SiteFooter closing={model.closing} slug={slug} />
      </div>
    </main>
  )
}
```

```tsx
export function SiteSection({ section }: { section: MemorySiteSectionModel }) {
  return (
    <section className="rounded-[var(--vp-radius-xl)] border border-[var(--vp-border-light)] bg-[var(--vp-panel-light)] p-[clamp(18px,2vw,28px)] shadow-[var(--vp-shadow-soft)]">
      <div className={section.layout === 'imageLeft' ? 'grid gap-6 md:grid-cols-[1.2fr_0.8fr]' : 'grid gap-6 md:grid-cols-[0.8fr_1.2fr]'}>
        <div className="overflow-hidden rounded-[var(--vp-radius-lg)]">
          <img src={section.photos[0].imageUrl} alt={section.title} className="h-full w-full object-cover" />
        </div>
        <div className="space-y-4">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--vp-text-soft-light)]">{section.kicker}</p>
          <h2 className="font-[var(--vp-font-display)] text-[clamp(28px,3.2vw,42px)] leading-none tracking-[-0.04em]">
            {section.title}
          </h2>
          <p className="text-[13px] leading-[1.7] text-[var(--vp-text-soft-light)]">{section.summary}</p>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 5: Run the public-page test**

Run:

```bash
npm test -- tests/app/public-memory-site-page.test.ts
```

Expected: PASS and the public route keeps the section cap plus alternating editorial rhythm.

### Task 5: Add token styling, navigation entry points, and end-to-end verification

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/story/[slug]/page.tsx`
- Modify: `tests/app/public-home-page.test.ts`
- Modify: `tests/app/dashboard/settings.page.test.ts`

- [ ] **Step 1: Add the Velvet Plum memory-site shell tokens to global CSS**

```css
.vp-memory-site-shell {
  --vp-memory-site-max-width: 1180px;
  --vp-memory-site-hero-overlay: linear-gradient(180deg, rgba(22, 17, 22, 0.12), rgba(22, 17, 22, 0.58));
}

.vp-memory-site-shell .vp-memory-site-hero-title {
  font-family: var(--vp-font-display);
  font-size: var(--vp-text-hero);
  line-height: 0.92;
  letter-spacing: -0.05em;
}

.vp-memory-site-shell .vp-memory-site-action {
  min-height: var(--vp-control-height-md);
  border-radius: var(--vp-radius-md);
  transition: var(--vp-transition-base);
}
```

- [ ] **Step 2: Add a public-home entry point only when a published memory site exists**

```ts
export function buildPublicHomeTopicSection({ slug, reviews, hasMemorySite }: {
  slug: string
  reviews: PublicReviewPair
  hasMemorySite: boolean
}) {
  const siteItem = hasMemorySite
    ? [{ id: 'memory-site', href: `/story/${slug}/site`, kind: 'memorySite' as const, title: '' }]
    : []

  const items = [
    ...siteItem,
    // existing topic items
  ]

  return { hasTopics: items.length > 0, items }
}
```

```ts
test('buildPublicHomeTopicSection adds the memory-site entry when a published site exists', () => {
  const section = buildPublicHomeTopicSection({
    slug: 'sun-moon',
    hasMemorySite: true,
    reviews: { yearlyReview: null, anniversaryReview: null },
  })

  assert.equal(section.items[0]?.href, '/story/sun-moon/site')
})
```

- [ ] **Step 3: Add a settings/dashboard helper for preview-link copy if needed**

```ts
export function buildMemorySitePreviewUrl(origin: string, slug: string) {
  return `${origin.replace(/\/$/, '')}/story/${slug}/site`
}
```

- [ ] **Step 4: Run the focused verification suite**

Run:

```bash
npm test -- tests/lib/memory-site-builder.test.ts tests/api/memory-site-routes.test.ts tests/app/dashboard/memory-sites.page.test.ts tests/app/public-memory-site-page.test.ts tests/app/public-home-page.test.ts tests/app/dashboard/settings.page.test.ts
npx prisma validate
npm run lint -- src/lib/memory-sites/site-builder.ts src/lib/memory-sites/site-queries.ts 'src/app/api/couples/[coupleId]/memory-sites/route.ts' 'src/app/api/couples/[coupleId]/memory-sites/generate/route.ts' 'src/app/api/couples/[coupleId]/memory-sites/[siteId]/route.ts' 'src/app/(dashboard)/sites/page.tsx' 'src/app/(dashboard)/sites/[siteId]/page.tsx' 'src/app/story/[slug]/site/page.tsx' src/components/memory-site/site-hero.tsx src/components/memory-site/site-section.tsx src/components/memory-site/site-footer.tsx src/app/globals.css
```

Expected: tests PASS, lint PASS, and no unrelated dashboard/public-home regressions appear.

- [ ] **Step 5: Reload the local app and verify the two key manual flows**

Run:

```bash
npm run dev
```

Manual checks:

1. In the dashboard, generate a draft from a real album, confirm only regenerate/replace-copy/publish actions are exposed.
2. As a public visitor, open `/story/<slug>/site`, confirm the page uses Velvet Plum token language, keeps editorial spacing, and never spills into an infinite photo stream.

## Scope notes

This plan intentionally includes:

1. Draft generation
2. Dashboard review
3. Publish gating
4. Public single-page rendering

This plan intentionally excludes:

1. Third-party payment checkout
2. Multi-page memory sites
3. Arbitrary drag-and-drop editing
4. Full chapter-level manual photo curation UI

Those should be separate follow-up plans after this slice is validated.
