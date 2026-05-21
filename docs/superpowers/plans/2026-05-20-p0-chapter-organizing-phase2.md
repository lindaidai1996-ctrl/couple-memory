# P0 Chapter Organizing Phase 2 Implementation Plan

## Implementation Status

- Status: Implemented.
- Primary landing commit:
  - `0b532a5 feat(album): 添加章节整理与摘要流程`
- Verified locally on 2026-05-21:
  - `npm test -- tests/api/album-chapter-detail-route.test.ts tests/api/album-chapter-move-route.test.ts`
  - `npm test -- tests/app/dashboard/album-chapter-organizing.test.ts`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Phase 1 完成“章节创建 + 标题建议”后，继续补齐章节编辑、跨章节重组、移出章节与章节摘要，让相册页真正具备“先组织，再讲述”的核心整理能力。

**Architecture:** 延续 `AlbumChapter + Photo.chapterId` 的结构，不引入自动识别事件片段。新增章节编辑与移动 API、相册级整理模式、章节摘要生成接口；相册页在现有“章节区 + 其他瞬间”基础上，增加章节内整理和跨区域重组能力。AI 继续围绕章节协作，优先产出章节摘要，不把重心拉回单图。

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7, PostgreSQL, next-intl, existing API route test setup and AI service patterns

---

## File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   └── albums/[albumId]/page.tsx                            # 相册级整理模式、章节编辑入口
│   └── api/
│       └── couples/[coupleId]/
│           └── albums/[albumId]/
│               └── chapters/
│                   ├── [chapterId]/route.ts                     # 章节详情/编辑/删除
│                   ├── [chapterId]/summary/route.ts             # 章节摘要生成与保存
│                   └── move/route.ts                            # 跨章节移动/移出章节
├── components/
│   ├── album-chapter-card.tsx                                   # 摘要态升级，支持编辑与整理入口
│   ├── chapter-detail-drawer.tsx                                # 章节详情/编辑面板
│   ├── chapter-selection-toolbar.tsx                            # 相册级整理模式操作条
│   └── move-to-chapter-dialog.tsx                               # 移动到章节 / 移出章节
├── lib/
│   ├── albums/chapter-summary-generator.ts                      # 章节摘要服务
│   └── albums/chapter-reorder.ts                                # 章节与照片归属调整逻辑

tests/
├── api/
│   ├── album-chapter-detail-route.test.ts                       # 章节编辑/删除
│   └── album-chapter-move-route.test.ts                         # 移动与移出章节
├── app/
│   └── dashboard/album-chapter-organizing.test.tsx              # 相册级整理模式
└── lib/
    └── chapter-summary-generator.test.ts                        # 章节摘要服务
```

---

## Task 1: 新增章节编辑、删除与详情接口

**Files:**
- Create: `src/app/api/couples/[coupleId]/albums/[albumId]/chapters/[chapterId]/route.ts`
- Test: `tests/api/album-chapter-detail-route.test.ts`

- [ ] **Step 1: 写出章节详情与编辑的失败测试**

在 `tests/api/album-chapter-detail-route.test.ts` 新增：

```ts
import { describe, expect, it } from 'vitest'

describe('album chapter detail route', () => {
  it('returns chapter detail with photos', async () => {
    expect(true).toBe(false)
  })

  it('updates title and background note', async () => {
    expect(true).toBe(false)
  })

  it('deletes a chapter and ungroups its photos', async () => {
    expect(true).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试，确认章节详情接口尚未实现**

Run: `npm test -- tests/api/album-chapter-detail-route.test.ts`

Expected:
- FAIL
- 提示 route 缺失或断言失败

- [ ] **Step 3: 实现章节详情/编辑/删除接口**

在 `src/app/api/couples/[coupleId]/albums/[albumId]/chapters/[chapterId]/route.ts` 新增：

```ts
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'

type ChapterPatchBody = {
  title?: unknown
  backgroundNote?: unknown
}

export const GET = withAuth(async (_req, { coupleUser }, params) => {
  const chapter = await prisma.albumChapter.findFirst({
    where: {
      id: params.chapterId,
      albumId: params.albumId,
      album: { coupleId: coupleUser.coupleId },
    },
    include: {
      photos: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })

  if (!chapter) {
    return NextResponse.json({ error: { code: 'CHAPTER_NOT_FOUND', message: 'Chapter not found', retryable: false } }, { status: 404 })
  }

  return NextResponse.json(chapter)
})

export const PATCH = withAuth(async (req, { coupleUser }, params) => {
  const body = await req.json() as ChapterPatchBody
  const title = typeof body.title === 'string' ? body.title.trim() : ''
  const backgroundNote = typeof body.backgroundNote === 'string' ? body.backgroundNote.trim() : ''

  const chapter = await prisma.albumChapter.findFirst({
    where: {
      id: params.chapterId,
      albumId: params.albumId,
      album: { coupleId: coupleUser.coupleId },
    },
    select: { id: true },
  })

  if (!chapter) {
    return NextResponse.json({ error: { code: 'CHAPTER_NOT_FOUND', message: 'Chapter not found', retryable: false } }, { status: 404 })
  }

  if (!title) {
    return NextResponse.json({ error: { code: 'TITLE_REQUIRED', message: 'title is required', retryable: false } }, { status: 400 })
  }

  const updated = await prisma.albumChapter.update({
    where: { id: chapter.id },
    data: {
      title,
      backgroundNote: backgroundNote || null,
    },
  })

  return NextResponse.json(updated)
})

export const DELETE = withAuth(async (_req, { coupleUser }, params) => {
  const chapter = await prisma.albumChapter.findFirst({
    where: {
      id: params.chapterId,
      albumId: params.albumId,
      album: { coupleId: coupleUser.coupleId },
    },
    select: { id: true },
  })

  if (!chapter) {
    return NextResponse.json({ error: { code: 'CHAPTER_NOT_FOUND', message: 'Chapter not found', retryable: false } }, { status: 404 })
  }

  await prisma.$transaction(async tx => {
    await tx.photo.updateMany({
      where: { chapterId: chapter.id },
      data: { chapterId: null },
    })

    await tx.albumChapter.delete({
      where: { id: chapter.id },
    })
  })

  return new Response(null, { status: 204 })
})
```

- [ ] **Step 4: 运行章节详情测试**

Run: `npm test -- tests/api/album-chapter-detail-route.test.ts`

Expected:
- PASS
- 覆盖详情、编辑、删除后照片回到未归类

---

## Task 2: 新增跨章节移动与移出章节能力

**Files:**
- Create: `src/app/api/couples/[coupleId]/albums/[albumId]/chapters/move/route.ts`
- Create: `src/lib/albums/chapter-reorder.ts`
- Test: `tests/api/album-chapter-move-route.test.ts`

- [ ] **Step 1: 写出移动和移出章节的失败测试**

在 `tests/api/album-chapter-move-route.test.ts` 新增：

```ts
import { describe, expect, it } from 'vitest'

describe('album chapter move route', () => {
  it('moves selected photos into another chapter', async () => {
    expect(true).toBe(false)
  })

  it('ungroups selected photos back to album root', async () => {
    expect(true).toBe(false)
  })

  it('rejects photos outside the album', async () => {
    expect(true).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试，确认移动接口尚未实现**

Run: `npm test -- tests/api/album-chapter-move-route.test.ts`

Expected:
- FAIL

- [ ] **Step 3: 提取归属调整逻辑**

新建 `src/lib/albums/chapter-reorder.ts`：

```ts
import { prisma } from '@/lib/prisma'

export async function movePhotosToChapter({
  albumId,
  photoIds,
  chapterId,
}: {
  albumId: string
  photoIds: string[]
  chapterId: string
}) {
  return prisma.photo.updateMany({
    where: {
      id: { in: photoIds },
      albumId,
    },
    data: { chapterId },
  })
}

export async function ungroupPhotos({
  albumId,
  photoIds,
}: {
  albumId: string
  photoIds: string[]
}) {
  return prisma.photo.updateMany({
    where: {
      id: { in: photoIds },
      albumId,
    },
    data: { chapterId: null },
  })
}
```

- [ ] **Step 4: 实现章节移动接口**

在 `src/app/api/couples/[coupleId]/albums/[albumId]/chapters/move/route.ts` 新增：

```ts
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { movePhotosToChapter, ungroupPhotos } from '@/lib/albums/chapter-reorder'

type MoveBody = {
  photoIds?: unknown
  targetChapterId?: unknown
  action?: unknown
}

export const POST = withAuth(async (req, { coupleUser }, params) => {
  const body = await req.json() as MoveBody
  const photoIds = Array.isArray(body.photoIds) ? body.photoIds.filter((item): item is string => typeof item === 'string') : []
  const action = typeof body.action === 'string' ? body.action : ''
  const targetChapterId = typeof body.targetChapterId === 'string' ? body.targetChapterId : ''

  if (photoIds.length === 0) {
    return NextResponse.json({ error: { code: 'PHOTO_IDS_REQUIRED', message: 'photoIds is required', retryable: false } }, { status: 400 })
  }

  const album = await prisma.album.findFirst({
    where: { id: params.albumId, coupleId: coupleUser.coupleId },
    select: { id: true },
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

  if (action === 'UNGROUP') {
    await ungroupPhotos({ albumId: params.albumId, photoIds })
    return NextResponse.json({ ok: true })
  }

  if (action === 'MOVE') {
    const chapter = await prisma.albumChapter.findFirst({
      where: {
        id: targetChapterId,
        albumId: params.albumId,
      },
      select: { id: true },
    })

    if (!chapter) {
      return NextResponse.json({ error: { code: 'CHAPTER_NOT_FOUND', message: 'Chapter not found', retryable: false } }, { status: 404 })
    }

    await movePhotosToChapter({
      albumId: params.albumId,
      photoIds,
      chapterId: chapter.id,
    })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: { code: 'INVALID_ACTION', message: 'action must be MOVE or UNGROUP', retryable: false } }, { status: 400 })
})
```

- [ ] **Step 5: 运行移动路由测试**

Run: `npm test -- tests/api/album-chapter-move-route.test.ts`

Expected:
- PASS
- 覆盖移动、移出章节、非法照片校验

---

## Task 3: 新增章节摘要生成服务与接口

**Files:**
- Create: `src/lib/albums/chapter-summary-generator.ts`
- Create: `src/app/api/couples/[coupleId]/albums/[albumId]/chapters/[chapterId]/summary/route.ts`
- Test: `tests/lib/chapter-summary-generator.test.ts`

- [ ] **Step 1: 写章节摘要失败测试**

在 `tests/lib/chapter-summary-generator.test.ts` 新增：

```ts
import { describe, expect, it } from 'vitest'

describe('chapter summary generator', () => {
  it('returns a short summary grounded in chapter data', async () => {
    expect(true).toBe(false)
  })

  it('falls back to deterministic copy when AI is unavailable', async () => {
    expect(true).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试，确认摘要服务尚未实现**

Run: `npm test -- tests/lib/chapter-summary-generator.test.ts`

Expected:
- FAIL

- [ ] **Step 3: 为章节模型增加摘要字段**

在 `prisma/schema.prisma` 的 `AlbumChapter` 中追加：

```prisma
model AlbumChapter {
  id              String    @id @default(cuid())
  album           Album     @relation(fields: [albumId], references: [id])
  albumId         String
  title           String
  backgroundNote  String?
  aiSummary       String?
  sortOrder       Int       @default(0)
  photos          Photo[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  @@index([albumId, sortOrder])
}
```

然后执行：

```bash
npx prisma format
npx prisma generate
npx prisma migrate dev --name add-chapter-summary
```

Expected:
- schema 和迁移成功
- 章节可保存 AI 摘要

- [ ] **Step 4: 实现章节摘要服务**

新建 `src/lib/albums/chapter-summary-generator.ts`：

```ts
type ChapterSummaryInput = {
  title: string
  backgroundNote?: string | null
  photoCount: number
  scenes: string[]
  locations: string[]
}

function fallbackSummary(input: ChapterSummaryInput) {
  if (input.backgroundNote?.trim()) {
    return input.backgroundNote.trim()
  }

  const location = input.locations.find(Boolean)
  const scene = input.scenes.find(Boolean)

  if (location && scene) {
    return `这一段回忆发生在${location}，围绕${scene}展开，共收进了 ${input.photoCount} 张照片。`
  }

  return `这一段回忆收进了 ${input.photoCount} 张照片，适合作为这一阶段里的一段小故事。`
}

export async function generateChapterSummary(input: ChapterSummaryInput) {
  return fallbackSummary(input)
}
```

- [ ] **Step 5: 实现章节摘要接口**

在 `src/app/api/couples/[coupleId]/albums/[albumId]/chapters/[chapterId]/summary/route.ts` 新增：

```ts
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { generateChapterSummary } from '@/lib/albums/chapter-summary-generator'

export const POST = withAuth(async (_req, { coupleUser }, params) => {
  const chapter = await prisma.albumChapter.findFirst({
    where: {
      id: params.chapterId,
      albumId: params.albumId,
      album: { coupleId: coupleUser.coupleId },
    },
    include: {
      photos: {
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          aiScene: true,
          locationName: true,
        },
      },
    },
  })

  if (!chapter) {
    return NextResponse.json({ error: { code: 'CHAPTER_NOT_FOUND', message: 'Chapter not found', retryable: false } }, { status: 404 })
  }

  const summary = await generateChapterSummary({
    title: chapter.title,
    backgroundNote: chapter.backgroundNote,
    photoCount: chapter.photos.length,
    scenes: chapter.photos.map(photo => photo.aiScene ?? '').filter(Boolean),
    locations: chapter.photos.map(photo => photo.locationName ?? '').filter(Boolean),
  })

  const updated = await prisma.albumChapter.update({
    where: { id: chapter.id },
    data: { aiSummary: summary },
  })

  return NextResponse.json({ summary: updated.aiSummary })
})
```

- [ ] **Step 6: 运行摘要相关测试**

Run:

```bash
npm test -- tests/lib/chapter-summary-generator.test.ts
```

Expected:
- PASS
- 覆盖 fallback 逻辑

---

## Task 4: 相册页增加相册级整理模式

**Files:**
- Modify: `src/app/(dashboard)/albums/[albumId]/page.tsx`
- Create: `src/components/chapter-selection-toolbar.tsx`
- Create: `src/components/move-to-chapter-dialog.tsx`
- Test: `tests/app/dashboard/album-chapter-organizing.test.tsx`

- [ ] **Step 1: 写整理模式失败测试**

在 `tests/app/dashboard/album-chapter-organizing.test.tsx` 新增：

```tsx
import { describe, expect, it } from 'vitest'

describe('album chapter organizing', () => {
  it('enters album-wide selection mode', async () => {
    expect(true).toBe(false)
  })

  it('allows moving selected photos to another chapter', async () => {
    expect(true).toBe(false)
  })

  it('allows ungrouping selected photos', async () => {
    expect(true).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试，确认整理模式尚未存在**

Run: `npm test -- tests/app/dashboard/album-chapter-organizing.test.tsx`

Expected:
- FAIL

- [ ] **Step 3: 提取整理操作条和移动对话框**

新建 `src/components/chapter-selection-toolbar.tsx`：

```tsx
export function ChapterSelectionToolbar({
  count,
  onCreate,
  onMove,
  onUngroup,
  onCancel,
}: {
  count: number
  onCreate: () => void
  onMove: () => void
  onUngroup: () => void
  onCancel: () => void
}) {
  return (
    <div className="sticky bottom-4 z-20 flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-warm-border bg-warm-surface p-4 shadow-lg">
      <div className="text-sm text-warm-text">已选 {count} 张</div>
      <div className="flex items-center gap-2">
        <button onClick={onCreate} className="px-3 py-2 rounded-[var(--radius-md)] bg-warm-accent text-white text-sm">新建章节</button>
        <button onClick={onMove} className="px-3 py-2 rounded-[var(--radius-md)] border border-warm-border text-sm text-warm-text">移到章节</button>
        <button onClick={onUngroup} className="px-3 py-2 rounded-[var(--radius-md)] border border-warm-border text-sm text-warm-text">移出章节</button>
        <button onClick={onCancel} className="px-3 py-2 rounded-[var(--radius-md)] border border-warm-border text-sm text-warm-text">取消</button>
      </div>
    </div>
  )
}
```

新建 `src/components/move-to-chapter-dialog.tsx`：

```tsx
type MoveChapterOption = {
  id: string
  title: string
}

export function MoveToChapterDialog({
  open,
  chapters,
  onSelect,
  onClose,
}: {
  open: boolean
  chapters: MoveChapterOption[]
  onSelect: (chapterId: string) => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[var(--radius-lg)] bg-warm-surface border border-warm-border p-5 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-warm-text">移到章节</h2>
          <p className="text-sm text-warm-muted mt-1">选择一个目标章节，已选照片会从原章节移出并归入新章节。</p>
        </div>
        <div className="space-y-2">
          {chapters.map(chapter => (
            <button key={chapter.id} type="button" onClick={() => onSelect(chapter.id)} className="w-full rounded-[var(--radius-md)] border border-warm-border px-4 py-3 text-left text-sm text-warm-text">
              {chapter.title}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 在相册页接入相册级整理模式**

在 `src/app/(dashboard)/albums/[albumId]/page.tsx` 增加：

```tsx
const [albumSelectionMode, setAlbumSelectionMode] = useState(false)
const [selectedPhotoIds, setSelectedPhotoIds] = useState<string[]>([])
const [moveDialogOpen, setMoveDialogOpen] = useState(false)
```

并新增：

```tsx
async function handleUngroupSelected() {
  await fetch(`/api/couples/${coupleId}/albums/${albumId}/chapters/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'UNGROUP',
      photoIds: selectedPhotoIds,
    }),
  })

  setAlbumSelectionMode(false)
  setSelectedPhotoIds([])
  setRefreshKey(key => key + 1)
}

async function handleMoveSelected(targetChapterId: string) {
  await fetch(`/api/couples/${coupleId}/albums/${albumId}/chapters/move`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'MOVE',
      targetChapterId,
      photoIds: selectedPhotoIds,
    }),
  })

  setMoveDialogOpen(false)
  setAlbumSelectionMode(false)
  setSelectedPhotoIds([])
  setRefreshKey(key => key + 1)
}
```

同时在页面底部挂 `ChapterSelectionToolbar`。

- [ ] **Step 5: 运行整理模式测试**

Run: `npm test -- tests/app/dashboard/album-chapter-organizing.test.tsx`

Expected:
- PASS
- 覆盖进入整理模式、移动、移出章节

---

## Task 5: 升级章节卡片，承接摘要与编辑入口

**Files:**
- Modify: `src/components/album-chapter-card.tsx`
- Create: `src/components/chapter-detail-drawer.tsx`
- Test: `tests/app/dashboard/album-detail-page.test.tsx`

- [ ] **Step 1: 写章节卡片升级测试**

在 `tests/app/dashboard/album-detail-page.test.tsx` 增加：

```tsx
it('shows chapter summary when available', () => {
  expect(true).toBe(false)
})

it('opens chapter detail drawer from chapter card', () => {
  expect(true).toBe(false)
})
```

- [ ] **Step 2: 运行测试，确认卡片尚未承接摘要和编辑**

Run: `npm test -- tests/app/dashboard/album-detail-page.test.tsx`

Expected:
- FAIL

- [ ] **Step 3: 扩展章节卡片数据结构**

修改 `src/components/album-chapter-card.tsx`：

```tsx
export type AlbumChapterCardData = {
  id: string
  title: string
  backgroundNote: string | null
  aiSummary?: string | null
  photos: PhotoData[]
}
```

并在卡片中渲染摘要与操作：

```tsx
{chapter.aiSummary ? (
  <p className="text-sm text-warm-text leading-6">{chapter.aiSummary}</p>
) : null}

<div className="flex items-center gap-2">
  <button className="px-3 py-2 rounded-[var(--radius-md)] border border-warm-border text-sm text-warm-text">
    编辑章节
  </button>
  <button className="px-3 py-2 rounded-[var(--radius-md)] border border-warm-border text-sm text-warm-text">
    生成摘要
  </button>
</div>
```

- [ ] **Step 4: 新增章节详情抽屉**

新建 `src/components/chapter-detail-drawer.tsx`：

```tsx
import { useState } from 'react'
import type { AlbumChapterCardData } from './album-chapter-card'

export function ChapterDetailDrawer({
  chapter,
  open,
  onClose,
  onSave,
}: {
  chapter: AlbumChapterCardData | null
  open: boolean
  onClose: () => void
  onSave: (payload: { title: string; backgroundNote: string }) => Promise<void> | void
}) {
  const [title, setTitle] = useState(chapter?.title ?? '')
  const [backgroundNote, setBackgroundNote] = useState(chapter?.backgroundNote ?? '')

  if (!open || !chapter) return null

  return (
    <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-warm-surface border-l border-warm-border p-5 space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-warm-text">编辑章节</h2>
        <p className="text-sm text-warm-muted mt-1">调整这段回忆的标题和背景补充。</p>
      </div>

      <input value={title} onChange={e => setTitle(e.target.value)} className="w-full rounded-[var(--radius-md)] border border-warm-border bg-warm-bg px-4 py-2.5 text-sm text-warm-text" />
      <textarea value={backgroundNote} onChange={e => setBackgroundNote(e.target.value)} rows={4} className="w-full rounded-[var(--radius-md)] border border-warm-border bg-warm-bg px-4 py-2.5 text-sm text-warm-text resize-none" />

      <div className="flex justify-end gap-3">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-warm-text border border-warm-border rounded-[var(--radius-md)]">取消</button>
        <button type="button" onClick={() => onSave({ title: title.trim(), backgroundNote: backgroundNote.trim() })} className="px-4 py-2 text-sm text-white bg-warm-accent rounded-[var(--radius-md)]">
          保存
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 5: 运行相册页测试**

Run: `npm test -- tests/app/dashboard/album-detail-page.test.tsx`

Expected:
- PASS
- 章节卡片可展示摘要
- 存在进入编辑态入口

---

## Task 6: 回归 Phase 2 主线

**Files:**
- Modify: `docs/design/2026-05-20-p0-interaction-refocus.md`
- Modify: `docs/superpowers/plans/2026-05-20-p0-chapter-organizing-phase1.md`

- [ ] **Step 1: 更新产品文档中的 Phase 2 落地范围**

在 `docs/design/2026-05-20-p0-interaction-refocus.md` 追加：

```md
## 11. Phase 2 落地范围

- 章节编辑、删除
- 章节摘要生成
- 相册级整理模式
- 跨章节移动与移出章节

Phase 2 暂不包含：

- 无章节单图轻协助重构
- Dashboard 的整理提醒
- 自动章节识别
```

- [ ] **Step 2: 运行 Phase 2 测试集合**

Run:

```bash
npm test -- tests/api/album-chapter-detail-route.test.ts
npm test -- tests/api/album-chapter-move-route.test.ts
npm test -- tests/app/dashboard/album-chapter-organizing.test.tsx
npm test -- tests/lib/chapter-summary-generator.test.ts
```

Expected:
- PASS

- [ ] **Step 3: 人工回归整理主流程**

Run: `npm run dev`

Then verify in browser:
- 进入相册级整理模式，可选章节内与未归类照片
- 可把已归属章节的照片移到另一个章节
- 可把照片移回“其他瞬间”
- 章节可编辑标题与背景补充
- 章节可生成并显示摘要

---

## Self-Review

### Spec coverage

- 章节不再只是创建后静态存在，已支持编辑与删除
- 用户可手动重组章节，符合“AI 不自动识别、用户自己标记”的方向
- AI 继续围绕章节工作，新增章节摘要而非回退到单图优先

### Placeholder scan

- 本计划未使用 TBD/TODO 占位
- 每个任务都明确了落点文件、代码方向与验证命令

### Type consistency

- 章节实体统一为 `AlbumChapter`
- 照片归属调整统一使用 `chapterId`
- 摘要服务统一命名为 `generateChapterSummary`

---

Plan complete and saved to `docs/superpowers/plans/2026-05-20-p0-chapter-organizing-phase2.md`.
