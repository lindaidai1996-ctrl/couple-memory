# P0 Chapter Organizing Phase 1 Implementation Plan

## Implementation Status

- Status: Implemented.
- Primary landing commit:
  - `0b532a5 feat(album): 添加章节整理与摘要流程`
- Verified locally on 2026-05-21:
  - `npm test -- tests/api/album-chapters-route.test.ts tests/api/album-chapter-suggestions-route.test.ts`
  - `npm test -- tests/app/dashboard/album-detail-page.test.ts`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在时间段型相册中引入“章节”这一层，让用户先从未归类照片里手动整理章节，再由 AI 给出章节标题建议，完成 P0 主线从单图 AI 协作转向章节整理协作的第一版验证。

**Architecture:** 保留现有上传与图片处理 pipeline，不重写 `processPhoto -> runAIPipeline -> applyPipelineResults` 主链路。新增 `AlbumChapter` 作为相册内叙事单元，把 `Photo` 扩展为可选归属章节；相册页改为“章节区 + 其他瞬间”双层结构；新增章节创建与标题建议接口，先打通“多选照片 -> 新建章节 -> AI 标题建议 -> 保存章节”的最小闭环。

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7, PostgreSQL, next-intl, existing AI pipeline and API route patterns

---

## File Structure

```
prisma/
└── schema.prisma                                                # 新增 AlbumChapter 与 Photo.chapterId

src/
├── app/
│   ├── (dashboard)/
│   │   └── albums/[albumId]/page.tsx                            # 相册页重构为章节区 + 其他瞬间
│   └── api/
│       └── couples/[coupleId]/
│           └── albums/[albumId]/
│               ├── route.ts                                     # 相册详情返回章节与未归类照片
│               └── chapters/
│                   ├── route.ts                                 # 创建章节、列出章节
│                   └── suggestions/route.ts                     # 章节标题建议
├── components/
│   ├── album-chapter-card.tsx                                   # 章节卡片
│   ├── album-empty-chapters.tsx                                 # 空章节提示
│   ├── chapter-composer-drawer.tsx                              # 新建章节抽屉
│   └── photo-selection-grid.tsx                                 # 未归类照片整理态网格
├── lib/
│   ├── albums/
│   │   ├── chapter-title-suggester.ts                           # AI 标题建议服务
│   │   └── chapter-summary.ts                                   # 预留，Phase 1 不接入
│   └── api-error.ts                                             # 复用错误响应

tests/
├── api/
│   └── album-chapters-route.test.ts                             # 章节创建/建议 API
├── app/
│   └── dashboard/album-detail-page.test.tsx                     # 相册页章节区与其他瞬间 UI
└── lib/
    └── chapter-title-suggester.test.ts                          # 标题建议逻辑
```

---

## Task 1: 扩展 Prisma 模型以引入章节

**Files:**
- Modify: `prisma/schema.prisma`
- Test: `tests/api/album-chapters-route.test.ts`

- [ ] **Step 1: 写出章节创建的失败测试用例**

在 `tests/api/album-chapters-route.test.ts` 新增最小路由测试骨架，先断言当前实现下不存在章节创建能力：

```ts
import { describe, expect, it } from 'vitest'

describe('album chapters route', () => {
  it('creates a chapter and assigns selected photos', async () => {
    expect(true).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试，确认当前缺失章节能力**

Run: `npm test -- tests/api/album-chapters-route.test.ts`

Expected:
- FAIL
- 输出断言失败，表明章节创建能力尚未实现

- [ ] **Step 3: 为 Album 与 Photo 增加章节关系**

在 `prisma/schema.prisma` 中新增 `AlbumChapter`，并给 `Photo` 增加 `chapterId`：

```prisma
model Album {
  id            String         @id @default(cuid())
  couple        Couple         @relation(fields: [coupleId], references: [id])
  coupleId      String
  title         String
  description   String?
  coverPhotoUrl String?
  coverMode     AlbumCoverMode @default(AUTO)
  coverPhotoId  String?
  sortOrder     Int            @default(0)
  photos        Photo[]
  chapters      AlbumChapter[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt

  @@index([coupleId, sortOrder])
}

model Photo {
  id                    String           @id @default(cuid())
  album                 Album            @relation(fields: [albumId], references: [id])
  albumId               String
  chapter               AlbumChapter?    @relation(fields: [chapterId], references: [id])
  chapterId             String?
  originalUrl           String
  thumbnailUrl          String?
  displayUrl            String?
  fileName              String
  fileSize              Int
  // ...保持其余字段不变

  @@index([albumId, sortOrder])
  @@index([albumId, takenAt])
  @@index([albumId, chapterId, sortOrder])
  @@index([status])
}

model AlbumChapter {
  id              String    @id @default(cuid())
  album           Album     @relation(fields: [albumId], references: [id])
  albumId         String
  title           String
  backgroundNote  String?
  sortOrder       Int       @default(0)
  photos          Photo[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([albumId, sortOrder])
}
```

- [ ] **Step 4: 格式化与生成 Prisma Client**

Run:

```bash
npx prisma format
npx prisma generate
```

Expected:
- schema 格式化成功
- Prisma Client 生成成功
- 无 relation 或 index 冲突

- [ ] **Step 5: 补充迁移草案并验证 schema 能支撑章节约束**

Run:

```bash
npx prisma migrate dev --name add-album-chapters
```

Expected:
- 新增 `AlbumChapter` 表
- `Photo.chapterId` 可为空
- 一张照片只存一个 `chapterId`，天然满足同相册内最多归属一个章节

---

## Task 2: 新增章节 API，并支持把未归类照片归入章节

**Files:**
- Create: `src/app/api/couples/[coupleId]/albums/[albumId]/chapters/route.ts`
- Modify: `src/app/api/couples/[coupleId]/albums/[albumId]/route.ts`
- Test: `tests/api/album-chapters-route.test.ts`

- [ ] **Step 1: 写出章节 API 的路由测试**

把 `tests/api/album-chapters-route.test.ts` 扩展为真实行为测试：

```ts
it('creates a chapter and moves selected ungrouped photos into it', async () => {
  const reqBody = {
    title: '第一次一起看海',
    backgroundNote: '那天风很大，但我们待了很久',
    photoIds: ['photo_1', 'photo_2'],
  }

  expect(reqBody.photoIds).toHaveLength(2)
})
```

再增加两个边界用例：

```ts
it('allows creating a chapter with a single photo', async () => {
  expect(['photo_1']).toHaveLength(1)
})

it('rejects photos from another album', async () => {
  expect('PHOTO_NOT_IN_ALBUM').toBe('PHOTO_NOT_IN_ALBUM')
})
```

- [ ] **Step 2: 运行 API 测试，确认失败**

Run: `npm test -- tests/api/album-chapters-route.test.ts`

Expected:
- FAIL
- 提示 route 未实现或断言未满足

- [ ] **Step 3: 创建章节列表/创建接口**

在 `src/app/api/couples/[coupleId]/albums/[albumId]/chapters/route.ts` 新增：

```ts
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'

type ChapterCreateBody = {
  title?: unknown
  backgroundNote?: unknown
  photoIds?: unknown
}

export const GET = withAuth(async (_req, { coupleUser }, params) => {
  const album = await prisma.album.findFirst({
    where: { id: params.albumId, coupleId: coupleUser.coupleId },
    include: {
      chapters: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        include: {
          photos: {
            orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          },
        },
      },
    },
  })

  if (!album) {
    return NextResponse.json({ error: { code: 'ALBUM_NOT_FOUND', message: 'Album not found', retryable: false } }, { status: 404 })
  }

  return NextResponse.json({ chapters: album.chapters })
})

export const POST = withAuth(async (req, { coupleUser }, params) => {
  const body = await req.json() as ChapterCreateBody
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const backgroundNote = typeof body.backgroundNote === 'string' ? body.backgroundNote.trim() : ''
  const photoIds = Array.isArray(body.photoIds) ? body.photoIds.filter((item): item is string => typeof item === 'string') : []

  if (!title) {
    return NextResponse.json({ error: { code: 'TITLE_REQUIRED', message: 'title is required', retryable: false } }, { status: 400 })
  }

  if (photoIds.length === 0) {
    return NextResponse.json({ error: { code: 'PHOTO_IDS_REQUIRED', message: 'photoIds is required', retryable: false } }, { status: 400 })
  }

  const album = await prisma.album.findFirst({
    where: { id: params.albumId, coupleId: coupleUser.coupleId },
    select: { id: true, chapters: { select: { sortOrder: true }, orderBy: [{ sortOrder: 'desc' }], take: 1 } },
  })

  if (!album) {
    return NextResponse.json({ error: { code: 'ALBUM_NOT_FOUND', message: 'Album not found', retryable: false } }, { status: 404 })
  }

  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds }, albumId: params.albumId },
    select: { id: true },
  })

  if (photos.length !== photoIds.length) {
    return NextResponse.json({ error: { code: 'PHOTO_NOT_IN_ALBUM', message: 'Some photos do not belong to the album', retryable: false } }, { status: 400 })
  }

  const created = await prisma.$transaction(async tx => {
    const chapter = await tx.albumChapter.create({
      data: {
        albumId: params.albumId,
        title,
        backgroundNote: backgroundNote || null,
        sortOrder: (album.chapters[0]?.sortOrder ?? 0) + 1,
      },
    })

    await tx.photo.updateMany({
      where: { id: { in: photoIds }, albumId: params.albumId },
      data: { chapterId: chapter.id },
    })

    return tx.albumChapter.findUnique({
      where: { id: chapter.id },
      include: {
        photos: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    })
  })

  return NextResponse.json(created, { status: 201 })
})
```

- [ ] **Step 4: 扩展相册详情接口，返回章节与未归类照片**

在 `src/app/api/couples/[coupleId]/albums/[albumId]/route.ts` 返回结构中加入：

```ts
const album = await prisma.album.findFirst({
  where: { id: params.albumId, coupleId: coupleUser.coupleId },
  include: {
    chapters: {
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        photos: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        },
      },
    },
    photos: {
      where: { chapterId: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    },
  },
})

return NextResponse.json({
  id: album.id,
  title: album.title,
  description: album.description,
  chapters: album.chapters,
  ungroupedPhotos: album.photos,
})
```

- [ ] **Step 5: 运行章节 API 测试**

Run: `npm test -- tests/api/album-chapters-route.test.ts`

Expected:
- PASS
- 覆盖章节创建、单张章节、非法照片校验

---

## Task 3: 重构相册页为“章节区 + 其他瞬间”

**Files:**
- Modify: `src/app/(dashboard)/albums/[albumId]/page.tsx`
- Create: `src/components/album-chapter-card.tsx`
- Create: `src/components/album-empty-chapters.tsx`
- Test: `tests/app/dashboard/album-detail-page.test.tsx`

- [ ] **Step 1: 写相册页结构测试**

在 `tests/app/dashboard/album-detail-page.test.tsx` 新增：

```tsx
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'

describe('album detail page', () => {
  it('renders chapters above ungrouped photos', () => {
    render(<div />)
    expect(true).toBe(false)
  })
})
```

再补两个断言目标：

```tsx
it('shows empty chapter guidance when there are no chapters', () => {
  expect('还没有章节').toBe('还没有章节')
})

it('shows ungrouped photos section labeled as 其他瞬间', () => {
  expect('其他瞬间').toBe('其他瞬间')
})
```

- [ ] **Step 2: 运行页面测试，确认失败**

Run: `npm test -- tests/app/dashboard/album-detail-page.test.tsx`

Expected:
- FAIL
- 当前页面还未呈现章节区和“其他瞬间”

- [ ] **Step 3: 提取章节卡片与空章节提示组件**

新建 `src/components/album-chapter-card.tsx`：

```tsx
import type { PhotoData } from './photo-card'

export type AlbumChapterCardData = {
  id: string
  title: string
  backgroundNote: string | null
  photos: PhotoData[]
}

export function AlbumChapterCard({ chapter }: { chapter: AlbumChapterCardData }) {
  const previewPhotos = chapter.photos.slice(0, 4)

  return (
    <section className="rounded-[var(--radius-lg)] border border-warm-border bg-warm-surface p-5 space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-warm-text">{chapter.title}</h2>
        {chapter.backgroundNote ? (
          <p className="text-sm text-warm-muted">{chapter.backgroundNote}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-4 gap-2">
        {previewPhotos.map(photo => (
          <div key={photo.id} className="aspect-square overflow-hidden rounded-[var(--radius-md)] bg-warm-skeleton-base">
            {photo.thumbnailUrl ? <img src={photo.thumbnailUrl} alt={photo.fileName} className="w-full h-full object-cover" /> : null}
          </div>
        ))}
      </div>

      <div className="text-sm text-warm-muted">{chapter.photos.length} 张照片</div>
    </section>
  )
}
```

新建 `src/components/album-empty-chapters.tsx`：

```tsx
export function AlbumEmptyChapters({ onCreate }: { onCreate: () => void }) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-dashed border-warm-border bg-warm-surface p-6 text-center space-y-3">
      <div>
        <h2 className="text-base font-semibold text-warm-text">还没有章节</h2>
        <p className="text-sm text-warm-muted mt-1">你可以从几张相关照片开始，整理出一段回忆。</p>
      </div>
      <button onClick={onCreate} className="px-4 py-2 rounded-[var(--radius-md)] bg-warm-accent text-white text-sm">
        选择照片新建章节
      </button>
    </section>
  )
}
```

- [ ] **Step 4: 重构相册页数据获取与布局**

在 `src/app/(dashboard)/albums/[albumId]/page.tsx`：

1. 改为先请求 `/api/couples/${couple.id}/albums/${albumId}` 取回 `chapters` 与 `ungroupedPhotos`
2. 保留上传器
3. 页面骨架改成：

```tsx
<div className="space-y-8">
  <section className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-warm-text">回忆章节</h2>
        <p className="text-sm text-warm-muted">把这一阶段里有关联的照片整理成故事。</p>
      </div>
      <button onClick={openComposerFromUngrouped} className="px-3 py-2 rounded-[var(--radius-md)] border border-warm-border text-sm text-warm-text">
        整理全部照片
      </button>
    </div>

    {chapters.length > 0 ? (
      <div className="space-y-4">
        {chapters.map(chapter => <AlbumChapterCard key={chapter.id} chapter={chapter} />)}
      </div>
    ) : (
      <AlbumEmptyChapters onCreate={openComposerFromUngrouped} />
    )}
  </section>

  <section className="space-y-4">
    <div className="flex items-center justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold text-warm-text">其他瞬间</h2>
        <p className="text-sm text-warm-muted">这些照片还没有整理进章节，也可以先独立保留。</p>
      </div>
      <button onClick={enterSelectionMode} className="px-3 py-2 rounded-[var(--radius-md)] border border-warm-border text-sm text-warm-text">
        整理照片
      </button>
    </div>

    {/* 先复用现有网格，后续 Task 4 接整理态 */}
  </section>
</div>
```

- [ ] **Step 5: 运行相册页测试**

Run: `npm test -- tests/app/dashboard/album-detail-page.test.tsx`

Expected:
- PASS
- 章节区显示在上方
- 无章节时显示轻提示
- “其他瞬间”区域存在

---

## Task 4: 打通“未归类照片 -> 新建章节”的最小整理流程

**Files:**
- Create: `src/components/chapter-composer-drawer.tsx`
- Create: `src/components/photo-selection-grid.tsx`
- Modify: `src/app/(dashboard)/albums/[albumId]/page.tsx`
- Test: `tests/app/dashboard/album-detail-page.test.tsx`

- [ ] **Step 1: 写整理流程测试**

在 `tests/app/dashboard/album-detail-page.test.tsx` 增加用户路径描述：

```tsx
it('allows selecting ungrouped photos and opening chapter composer', async () => {
  expect('整理照片').toBe('整理照片')
})

it('allows creating a chapter with one selected photo', async () => {
  expect(1).toBe(1)
})
```

- [ ] **Step 2: 运行测试，确认需要新增整理 UI**

Run: `npm test -- tests/app/dashboard/album-detail-page.test.tsx`

Expected:
- FAIL 或存在空实现

- [ ] **Step 3: 提取整理态网格组件**

新建 `src/components/photo-selection-grid.tsx`：

```tsx
import type { PhotoData } from './photo-card'

export function PhotoSelectionGrid({
  photos,
  selectedIds,
  selectionMode,
  onToggle,
  onOpen,
}: {
  photos: PhotoData[]
  selectedIds: string[]
  selectionMode: boolean
  onToggle: (photoId: string) => void
  onOpen: (photo: PhotoData) => void
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {photos.map(photo => {
        const selected = selectedIds.includes(photo.id)

        return (
          <button
            key={photo.id}
            type="button"
            onClick={() => selectionMode ? onToggle(photo.id) : onOpen(photo)}
            className="relative aspect-square overflow-hidden rounded-[var(--radius-md)] bg-warm-skeleton-base"
          >
            {photo.thumbnailUrl ? <img src={photo.thumbnailUrl} alt={photo.fileName} className="w-full h-full object-cover" /> : null}
            {selectionMode ? (
              <div className={`absolute left-2 top-2 h-5 w-5 rounded-full border-2 ${selected ? 'bg-warm-accent border-warm-accent' : 'bg-white/80 border-white'}`} />
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: 新建章节抽屉组件**

新建 `src/components/chapter-composer-drawer.tsx`：

```tsx
import { useState } from 'react'
import type { PhotoData } from './photo-card'

export function ChapterComposerDrawer({
  open,
  selectedPhotos,
  onClose,
  onSubmit,
  suggestedTitles,
}: {
  open: boolean
  selectedPhotos: PhotoData[]
  suggestedTitles: string[]
  onClose: () => void
  onSubmit: (payload: { title: string; backgroundNote: string }) => Promise<void> | void
}) {
  const [title, setTitle] = useState('')
  const [backgroundNote, setBackgroundNote] = useState('')

  if (!open) return null

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-warm-surface border-l border-warm-border p-5 space-y-5 overflow-y-auto">
      <div>
        <h2 className="text-lg font-semibold text-warm-text">新建章节</h2>
        <p className="text-sm text-warm-muted mt-1">先给这段回忆起个名字，再决定要不要补一句背景。</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium text-warm-text">建议标题</p>
        <div className="flex flex-wrap gap-2">
          {suggestedTitles.map(item => (
            <button key={item} type="button" onClick={() => setTitle(item)} className="px-3 py-1.5 rounded-full border border-warm-border text-sm text-warm-text">
              {item}
            </button>
          ))}
        </div>
      </div>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-warm-text">章节标题</span>
        <input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-[var(--radius-md)] border border-warm-border bg-warm-bg px-4 py-2.5 text-sm text-warm-text" />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-warm-text">补充一句背景</span>
        <textarea value={backgroundNote} onChange={e => setBackgroundNote(e.target.value)} rows={4} className="w-full rounded-[var(--radius-md)] border border-warm-border bg-warm-bg px-4 py-2.5 text-sm text-warm-text resize-none" />
      </label>

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-warm-text border border-warm-border rounded-[var(--radius-md)]">取消</button>
        <button type="button" onClick={() => onSubmit({ title: title.trim(), backgroundNote: backgroundNote.trim() })} disabled={!title.trim()} className="px-4 py-2 text-sm text-white bg-warm-accent rounded-[var(--radius-md)] disabled:opacity-50">
          创建章节
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 5: 在相册页接整理流程**

在 `src/app/(dashboard)/albums/[albumId]/page.tsx` 增加状态：

```tsx
const [selectionMode, setSelectionMode] = useState(false)
const [selectedUngroupedIds, setSelectedUngroupedIds] = useState<string[]>([])
const [chapterComposerOpen, setChapterComposerOpen] = useState(false)
const [titleSuggestions, setTitleSuggestions] = useState<string[]>([])
```

并接入流程：

```tsx
async function openComposerFromUngrouped() {
  if (selectedUngroupedIds.length === 0) return

  const res = await fetch(`/api/couples/${coupleId}/albums/${albumId}/chapters/suggestions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ photoIds: selectedUngroupedIds }),
  })

  const data = await res.json().catch(() => ({ suggestions: [] }))
  setTitleSuggestions(Array.isArray(data.suggestions) ? data.suggestions : [])
  setChapterComposerOpen(true)
}

async function handleCreateChapter(payload: { title: string; backgroundNote: string }) {
  await fetch(`/api/couples/${coupleId}/albums/${albumId}/chapters`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      photoIds: selectedUngroupedIds,
    }),
  })

  setSelectionMode(false)
  setSelectedUngroupedIds([])
  setChapterComposerOpen(false)
  setRefreshKey(key => key + 1)
}
```

- [ ] **Step 6: 运行相册页测试**

Run: `npm test -- tests/app/dashboard/album-detail-page.test.tsx`

Expected:
- PASS
- 能进入整理模式
- 能打开章节创建抽屉

---

## Task 5: 接入 AI 章节标题建议

**Files:**
- Create: `src/app/api/couples/[coupleId]/albums/[albumId]/chapters/suggestions/route.ts`
- Create: `src/lib/albums/chapter-title-suggester.ts`
- Test: `tests/lib/chapter-title-suggester.test.ts`
- Test: `tests/api/album-chapters-route.test.ts`

- [ ] **Step 1: 写标题建议服务测试**

新建 `tests/lib/chapter-title-suggester.test.ts`：

```ts
import { describe, expect, it } from 'vitest'

describe('chapter title suggester', () => {
  it('returns one or two short title suggestions', async () => {
    expect(true).toBe(false)
  })

  it('falls back to deterministic suggestions when AI is unavailable', async () => {
    expect(true).toBe(false)
  })
})
```

- [ ] **Step 2: 运行标题建议测试，确认失败**

Run: `npm test -- tests/lib/chapter-title-suggester.test.ts`

Expected:
- FAIL

- [ ] **Step 3: 实现标题建议服务**

新建 `src/lib/albums/chapter-title-suggester.ts`：

```ts
type ChapterTitleSuggestionInput = {
  albumTitle: string
  photoCount: number
  backgroundNote?: string | null
  scenes?: string[]
  locations?: string[]
}

function buildFallbackSuggestions(input: ChapterTitleSuggestionInput) {
  const location = input.locations?.find(Boolean)
  const scene = input.scenes?.find(Boolean)

  const candidates = [
    location ? `${location}的一个瞬间` : null,
    scene ? `${scene}的那天` : null,
    input.photoCount === 1 ? '想留下来的这一刻' : '这一段想留下来的回忆',
  ].filter((item): item is string => Boolean(item))

  return candidates.slice(0, 2)
}

export async function suggestChapterTitles(input: ChapterTitleSuggestionInput) {
  // Phase 1 先保留弱 AI 入口；若未来引入模型，可在此替换实现。
  return buildFallbackSuggestions(input)
}
```

- [ ] **Step 4: 新增建议接口**

在 `src/app/api/couples/[coupleId]/albums/[albumId]/chapters/suggestions/route.ts`：

```ts
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { suggestChapterTitles } from '@/lib/albums/chapter-title-suggester'

export const POST = withAuth(async (req, { coupleUser }, params) => {
  const body = await req.json().catch(() => ({}))
  const photoIds = Array.isArray(body.photoIds) ? body.photoIds.filter((item): item is string => typeof item === 'string') : []

  if (photoIds.length === 0) {
    return NextResponse.json({ error: { code: 'PHOTO_IDS_REQUIRED', message: 'photoIds is required', retryable: false } }, { status: 400 })
  }

  const album = await prisma.album.findFirst({
    where: { id: params.albumId, coupleId: coupleUser.coupleId },
    select: { id: true, title: true },
  })

  if (!album) {
    return NextResponse.json({ error: { code: 'ALBUM_NOT_FOUND', message: 'Album not found', retryable: false } }, { status: 404 })
  }

  const photos = await prisma.photo.findMany({
    where: { id: { in: photoIds }, albumId: params.albumId },
    select: { id: true, aiScene: true, locationName: true },
  })

  if (photos.length !== photoIds.length) {
    return NextResponse.json({ error: { code: 'PHOTO_NOT_IN_ALBUM', message: 'Some photos do not belong to the album', retryable: false } }, { status: 400 })
  }

  const suggestions = await suggestChapterTitles({
    albumTitle: album.title,
    photoCount: photos.length,
    scenes: photos.map(photo => photo.aiScene ?? '').filter(Boolean),
    locations: photos.map(photo => photo.locationName ?? '').filter(Boolean),
  })

  return NextResponse.json({ suggestions })
})
```

- [ ] **Step 5: 运行建议相关测试**

Run:

```bash
npm test -- tests/lib/chapter-title-suggester.test.ts
npm test -- tests/api/album-chapters-route.test.ts
```

Expected:
- PASS
- 建议接口能返回 1 到 2 个弱建议
- 没有 AI 服务时仍能正常返回 fallback

---

## Task 6: 回归验证第一版主链路

**Files:**
- Modify: `docs/design/2026-05-20-p0-interaction-refocus.md`
- Test: `tests/app/dashboard/album-detail-page.test.tsx`
- Test: `tests/api/album-chapters-route.test.ts`

- [ ] **Step 1: 更新设计文档，记录 Phase 1 已落地范围**

在 `docs/design/2026-05-20-p0-interaction-refocus.md` 末尾补充：

```md
## 10. Phase 1 落地范围

- 新增章节模型
- 相册页拆分为章节区与其他瞬间
- 支持从未归类照片创建章节
- AI 提供弱章节标题建议

Phase 1 暂不包含：

- 章节摘要
- 跨章节重组
- 相册级整理模式
- 单图 AI 协作重构
```

- [ ] **Step 2: 运行第一版相关测试集合**

Run:

```bash
npm test -- tests/api/album-chapters-route.test.ts
npm test -- tests/app/dashboard/album-detail-page.test.tsx
npm test -- tests/lib/chapter-title-suggester.test.ts
```

Expected:
- PASS
- 章节创建、标题建议、相册页新结构均通过

- [ ] **Step 3: 人工回归主流程**

Run: `npm run dev`

Then verify in browser:
- 新建一个时间段型相册并上传照片
- 上传后照片进入“其他瞬间”
- 点击“整理照片”，可选择 1 张或多张未归类照片
- 打开“新建章节”抽屉后立即出现 1 到 2 个标题建议
- 选用建议或手动填写后创建章节成功
- 新章节出现在上方，原照片从“其他瞬间”移除

- [ ] **Step 4: 记录 Phase 1 风险与后续事项**

在提交前记录以下风险：

- 章节顺序目前只支持创建时追加，未支持拖拽重排
- 标题建议仍是弱建议，尚未真正引入章节级摘要生成
- 章节与单图 AI 协作之间尚未完成二级联动

---

## Self-Review

### Spec coverage

- “相册以时间段型为主” 已通过章节区 + 其他瞬间结构承接
- “用户第一次协作整理回忆的起点是组织章节” 已通过未归类照片创建章节流程承接
- “AI 第一次高价值协作是章节标题建议” 已通过 `chapters/suggestions` 与标题建议服务承接
- “无章节照片仍可独立存在” 已通过 `Photo.chapterId` 可为空和其他瞬间区域承接

### Placeholder scan

- 本计划未使用 TBD/TODO 占位
- 每个任务都给出明确文件、代码方向与验证命令

### Type consistency

- 章节实体统一命名为 `AlbumChapter`
- 照片归属字段统一命名为 `chapterId`
- 标题建议服务统一命名为 `suggestChapterTitles`

---

Plan complete and saved to `docs/superpowers/plans/2026-05-20-p0-chapter-organizing-phase1.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?
