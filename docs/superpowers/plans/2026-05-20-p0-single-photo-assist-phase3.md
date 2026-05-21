# P0 Single-Photo Assist Phase 3 Implementation Plan

## Implementation Status

- Status: Implemented.
- Primary landing commits:
  - `c5fb083 feat(photo): 增强单张照片辅助与浏览体验`
  - `2ebb909 feat(dashboard): 增加空间整理就绪度卡片`
- Verified locally on 2026-05-21:
  - `npm test -- tests/api/photo-assist-route.test.ts tests/api/organization-readiness-route.test.ts`
  - `npm test -- tests/app/dashboard/photo-detail-modal.test.ts tests/app/dashboard/dashboard.page.test.ts`

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在章节主线稳定后，重构单张照片 AI 协作能力，让无章节照片接受轻量辅助、章节内照片接受章节感知的二级微调，同时把 Dashboard 和单图弹窗从“AI 主舞台”调整为“协作辅助层”。

**Architecture:** 保留现有 `PhotoAIVariant`、单图 PATCH、局部重跑与设置页 AI 偏好，但重写其前台定位。新增“无章节单图轻协助”服务、章节感知重写入口和 Dashboard 整理提醒；单图详情从“AI 协作面板”降级为“瞬间补充与微调面板”，避免重新把主线拉回单图。

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7, PostgreSQL, next-intl, existing single-photo API routes and AI pipeline infrastructure

---

## File Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx                                  # 增加待整理章节提醒
│   │   └── albums/[albumId]/page.tsx                           # 单图在章节内/未归类状态下的不同入口
│   └── api/
│       └── couples/[coupleId]/
│           ├── publish-readiness/route.ts                      # 重新定义为“整理准备度”
│           └── photos/[photoId]/
│               ├── route.ts                                    # 单图补充信息与来源状态
│               ├── retry/route.ts                              # 单图局部重跑继续保留
│               └── assist/route.ts                             # 单图轻协助/章节感知重写
├── components/
│   ├── photo-detail-modal.tsx                                  # 从编辑器改为轻协助面板
│   ├── photo-context-form.tsx                                  # 单图补充背景输入
│   └── readiness-card.tsx                                      # Dashboard 整理准备度卡片
├── lib/
│   ├── photos/photo-assist.ts                                  # 无章节单图轻协助
│   ├── photos/photo-context.ts                                 # 单图补充语境结构
│   └── readiness/organization-readiness.ts                     # 章节整理完成度

tests/
├── api/
│   ├── photo-assist-route.test.ts                              # 单图轻协助接口
│   └── organization-readiness-route.test.ts                    # 整理准备度接口
├── app/
│   ├── dashboard/dashboard.page.test.ts                        # Dashboard 整理卡片
│   └── dashboard/photo-detail-modal.test.tsx                   # 单图轻协助面板
└── lib/
    ├── photo-assist.test.ts                                    # 单图轻协助逻辑
    └── organization-readiness.test.ts                          # 整理准备度逻辑
```

---

## Task 1: 为单张照片补充“瞬间语境”字段

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `src/app/api/couples/[coupleId]/photos/[photoId]/route.ts`
- Test: `tests/api/photo-detail-route.test.ts`

- [ ] **Step 1: 写出单图补充语境的失败测试**

在 `tests/api/photo-detail-route.test.ts` 增加：

```ts
it('stores optional moment context for a single photo', async () => {
  expect(true).toBe(false)
})

it('marks photo caption source as manual when user writes custom copy', async () => {
  expect(true).toBe(false)
})
```

- [ ] **Step 2: 运行测试，确认当前无单图语境字段**

Run: `npm test -- tests/api/photo-detail-route.test.ts`

Expected:
- FAIL

- [ ] **Step 3: 为 Photo 增加轻量语境字段**

在 `prisma/schema.prisma` 的 `Photo` 中追加：

```prisma
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
  momentContext         String?
  momentPromptAnswer    String?
  // ...其余字段保持不变
}
```

然后执行：

```bash
npx prisma format
npx prisma generate
npx prisma migrate dev --name add-photo-moment-context
```

Expected:
- schema 与迁移成功

- [ ] **Step 4: 扩展单图 PATCH 接口**

在 `src/app/api/couples/[coupleId]/photos/[photoId]/route.ts` 的 `PhotoPatchBody` 与 `buildPhotoUpdateData` 中增加：

```ts
type PhotoPatchBody = {
  userCaption?: unknown
  aiLayout?: unknown
  selectedCaptionVariantId?: unknown
  selectedLayoutVariantId?: unknown
  momentContext?: unknown
  momentPromptAnswer?: unknown
}

function buildPhotoUpdateData(body: PhotoPatchBody) {
  const data: Record<string, unknown> = {}

  if (typeof body.userCaption === 'string') {
    data.userCaption = body.userCaption
    data.selectedCaptionSource = body.userCaption.trim() ? 'MANUAL' : 'AI'
  }

  if (typeof body.aiLayout === 'string') {
    data.aiLayout = body.aiLayout
    data.selectedLayoutSource = 'MANUAL'
  }

  if (typeof body.momentContext === 'string') {
    data.momentContext = body.momentContext.trim() || null
  }

  if (typeof body.momentPromptAnswer === 'string') {
    data.momentPromptAnswer = body.momentPromptAnswer.trim() || null
  }

  return data
}
```

- [ ] **Step 5: 运行单图详情测试**

Run: `npm test -- tests/api/photo-detail-route.test.ts`

Expected:
- PASS
- 覆盖 moment context 保存

---

## Task 2: 新增“无章节单图轻协助”接口

**Files:**
- Create: `src/lib/photos/photo-assist.ts`
- Create: `src/app/api/couples/[coupleId]/photos/[photoId]/assist/route.ts`
- Test: `tests/lib/photo-assist.test.ts`
- Test: `tests/api/photo-assist-route.test.ts`

- [ ] **Step 1: 写轻协助服务失败测试**

在 `tests/lib/photo-assist.test.ts` 新增：

```ts
import { describe, expect, it } from 'vitest'

describe('photo assist', () => {
  it('returns short moment-first suggestions for ungrouped photos', async () => {
    expect(true).toBe(false)
  })

  it('returns chapter-aware hints when photo already belongs to a chapter', async () => {
    expect(true).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试，确认轻协助服务尚未实现**

Run: `npm test -- tests/lib/photo-assist.test.ts`

Expected:
- FAIL

- [ ] **Step 3: 实现轻协助服务**

新建 `src/lib/photos/photo-assist.ts`：

```ts
type PhotoAssistInput = {
  chapterTitle?: string | null
  momentContext?: string | null
  momentPromptAnswer?: string | null
  aiScene?: string | null
  locationName?: string | null
}

export function buildUngroupedSuggestions(input: PhotoAssistInput) {
  const base = input.momentContext?.trim() || input.momentPromptAnswer?.trim()

  if (base) {
    return [
      base,
      `想把这一刻留下来${input.locationName ? `，在${input.locationName}` : ''}。`,
    ].filter(Boolean)
  }

  if (input.aiScene?.trim()) {
    return [
      `那天的${input.aiScene?.trim()}，值得单独留下。`,
      '这张照片可以先作为一个还没归进章节的小瞬间。',
    ]
  }

  return [
    '这是一个值得先留下来的瞬间。',
    '如果你愿意，也可以补一句这张照片为什么重要。',
  ]
}

export function buildChapterAwareSuggestions(input: PhotoAssistInput) {
  if (!input.chapterTitle) {
    return buildUngroupedSuggestions(input)
  }

  return [
    `这张照片属于“${input.chapterTitle}”这一段回忆。`,
    input.momentContext?.trim() || '它可以在章节里作为一个更具体的瞬间表达。',
  ]
}
```

- [ ] **Step 4: 实现单图轻协助接口**

在 `src/app/api/couples/[coupleId]/photos/[photoId]/assist/route.ts` 新增：

```ts
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { buildChapterAwareSuggestions, buildUngroupedSuggestions } from '@/lib/photos/photo-assist'

export const POST = withAuth(async (_req, { coupleUser }, params) => {
  const photo = await prisma.photo.findFirst({
    where: {
      id: params.photoId,
      album: { coupleId: coupleUser.coupleId },
    },
    include: {
      chapter: {
        select: { title: true },
      },
    },
  })

  if (!photo) {
    return NextResponse.json({ error: { code: 'PHOTO_NOT_FOUND', message: 'Photo not found', retryable: false } }, { status: 404 })
  }

  const suggestions = photo.chapter
    ? buildChapterAwareSuggestions({
        chapterTitle: photo.chapter.title,
        momentContext: photo.momentContext,
        momentPromptAnswer: photo.momentPromptAnswer,
        aiScene: photo.aiScene,
        locationName: photo.locationName,
      })
    : buildUngroupedSuggestions({
        momentContext: photo.momentContext,
        momentPromptAnswer: photo.momentPromptAnswer,
        aiScene: photo.aiScene,
        locationName: photo.locationName,
      })

  return NextResponse.json({ suggestions })
})
```

- [ ] **Step 5: 运行轻协助相关测试**

Run:

```bash
npm test -- tests/lib/photo-assist.test.ts
npm test -- tests/api/photo-assist-route.test.ts
```

Expected:
- PASS
- 覆盖无章节与有章节两类建议

---

## Task 3: 重构单图详情弹窗为“轻协助面板”

**Files:**
- Modify: `src/components/photo-detail-modal.tsx`
- Create: `src/components/photo-context-form.tsx`
- Test: `tests/app/dashboard/photo-detail-modal.test.tsx`

- [ ] **Step 1: 写单图弹窗重构失败测试**

在 `tests/app/dashboard/photo-detail-modal.test.tsx` 新增：

```tsx
import { describe, expect, it } from 'vitest'

describe('photo detail modal', () => {
  it('shows moment context inputs for ungrouped photos', () => {
    expect(true).toBe(false)
  })

  it('de-emphasizes layout editing for ungrouped photos', () => {
    expect(true).toBe(false)
  })

  it('shows chapter-aware helper copy for grouped photos', () => {
    expect(true).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试，确认当前弹窗仍是编辑器心智**

Run: `npm test -- tests/app/dashboard/photo-detail-modal.test.tsx`

Expected:
- FAIL

- [ ] **Step 3: 提取单图语境表单**

新建 `src/components/photo-context-form.tsx`：

```tsx
export function PhotoContextForm({
  momentContext,
  momentPromptAnswer,
  onMomentContextChange,
  onMomentPromptAnswerChange,
}: {
  momentContext: string
  momentPromptAnswer: string
  onMomentContextChange: (value: string) => void
  onMomentPromptAnswerChange: (value: string) => void
}) {
  return (
    <div className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-warm-text">这张照片想留住什么</span>
        <textarea
          value={momentContext}
          onChange={e => onMomentContextChange(e.target.value)}
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-warm-border bg-warm-bg px-4 py-2.5 text-sm text-warm-text resize-none"
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-sm font-medium text-warm-text">如果要补一句给 AI</span>
        <textarea
          value={momentPromptAnswer}
          onChange={e => onMomentPromptAnswerChange(e.target.value)}
          rows={3}
          className="w-full rounded-[var(--radius-md)] border border-warm-border bg-warm-bg px-4 py-2.5 text-sm text-warm-text resize-none"
        />
      </label>
    </div>
  )
}
```

- [ ] **Step 4: 调整单图弹窗主结构**

在 `src/components/photo-detail-modal.tsx`：

1. 保留 `info / exif`，把 `edit` 改为 `assist`
2. 如果 `photo.chapterId` 不存在，展示轻协助说明和 `PhotoContextForm`
3. 如果 `photo.chapterId` 存在，展示“这张照片属于某个章节”的说明，以及更少的单图微调入口
4. 把版式编辑区从主区降到次级折叠块，不再是默认主要内容

建议文案结构：

```tsx
{!photo.chapterId ? (
  <div className="space-y-4">
    <p className="text-sm text-warm-muted">
      这张照片还没有整理进章节。你可以先补一句背景，让 AI 帮你留住这个瞬间。
    </p>
    <PhotoContextForm ... />
  </div>
) : (
  <div className="space-y-4">
    <p className="text-sm text-warm-muted">
      这张照片已经属于某个章节。这里更适合补充它在这段回忆里的具体意义。
    </p>
    <PhotoContextForm ... />
  </div>
)}
```

- [ ] **Step 5: 运行单图弹窗测试**

Run: `npm test -- tests/app/dashboard/photo-detail-modal.test.tsx`

Expected:
- PASS
- 弹窗主心智从编辑器变成轻协助面板

---

## Task 4: Dashboard 增加“整理准备度”卡片

**Files:**
- Create: `src/lib/readiness/organization-readiness.ts`
- Create: `src/components/readiness-card.tsx`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`
- Create: `src/app/api/couples/[coupleId]/publish-readiness/route.ts`
- Test: `tests/lib/organization-readiness.test.ts`
- Test: `tests/api/organization-readiness-route.test.ts`

- [ ] **Step 1: 写整理准备度失败测试**

在 `tests/lib/organization-readiness.test.ts` 新增：

```ts
import { describe, expect, it } from 'vitest'

describe('organization readiness', () => {
  it('scores albums with more chapter coverage higher than ungrouped-only albums', () => {
    expect(true).toBe(false)
  })
})
```

- [ ] **Step 2: 运行测试，确认准备度逻辑尚未实现**

Run: `npm test -- tests/lib/organization-readiness.test.ts`

Expected:
- FAIL

- [ ] **Step 3: 实现准备度逻辑**

新建 `src/lib/readiness/organization-readiness.ts`：

```ts
export function buildOrganizationReadiness({
  totalPhotos,
  chapterPhotoCount,
  chapterCount,
}: {
  totalPhotos: number
  chapterPhotoCount: number
  chapterCount: number
}) {
  if (totalPhotos === 0) {
    return {
      score: 0,
      suggestions: ['先上传一些照片，再开始整理这一阶段的回忆。'],
    }
  }

  const chapterCoverage = Math.round((chapterPhotoCount / totalPhotos) * 100)
  const suggestions: string[] = []

  if (chapterCount === 0) {
    suggestions.push('还没有章节，可以先从几张相关照片开始整理出一段回忆。')
  }
  if (chapterCoverage < 40) {
    suggestions.push('还有不少照片停留在“其他瞬间”，可以继续整理章节。')
  }

  return {
    score: Math.min(100, Math.max(0, Math.round((chapterCoverage * 0.7) + (Math.min(chapterCount, 5) * 6)))),
    suggestions,
  }
}
```

- [ ] **Step 4: 实现准备度接口与 Dashboard 卡片**

新建 `src/app/api/couples/[coupleId]/publish-readiness/route.ts`：

```ts
import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/api-middleware'
import { prisma } from '@/lib/prisma'
import { buildOrganizationReadiness } from '@/lib/readiness/organization-readiness'

export const GET = withAuth(async (_req, { coupleUser }, params) => {
  const [totalPhotos, chapterPhotoCount, chapterCount] = await Promise.all([
    prisma.photo.count({ where: { album: { coupleId: coupleUser.coupleId } } }),
    prisma.photo.count({ where: { album: { coupleId: coupleUser.coupleId }, chapterId: { not: null } } }),
    prisma.albumChapter.count({ where: { album: { coupleId: coupleUser.coupleId } } }),
  ])

  return NextResponse.json(buildOrganizationReadiness({
    totalPhotos,
    chapterPhotoCount,
    chapterCount,
  }))
})
```

然后新增 `src/components/readiness-card.tsx` 并在 `src/app/(dashboard)/dashboard/page.tsx` 渲染。

- [ ] **Step 5: 运行准备度测试**

Run:

```bash
npm test -- tests/lib/organization-readiness.test.ts
npm test -- tests/api/organization-readiness-route.test.ts
```

Expected:
- PASS
- Dashboard 可拿到整理准备度结果

---

## Task 5: 收口现有单图 AI 能力的定位

**Files:**
- Modify: `src/app/api/couples/[coupleId]/photos/[photoId]/retry/route.ts`
- Modify: `src/lib/agents/pipeline.ts`
- Modify: `docs/design/2026-05-20-p0-interaction-refocus.md`
- Modify: `docs/superpowers/plans/2026-05-19-p0-ai-collaboration-experience.md`

- [ ] **Step 1: 记录现有单图 AI 能力的新定位**

在 `docs/design/2026-05-20-p0-interaction-refocus.md` 增加：

```md
## 12. Phase 3 对单图 AI 的重新定位

- 无章节照片：轻协助、轻候选、轻提问
- 章节内照片：章节感知的二级微调
- 单图 AI 不再作为主线入口，而是作为章节整理之后的辅助层
```

- [ ] **Step 2: 调整 pipeline 产物的前台使用说明**

在 `docs/superpowers/plans/2026-05-19-p0-ai-collaboration-experience.md` 末尾追加：

```md
## Phase 3 Note

单图 caption/layout 候选能力保留，但其产品优先级已下调：

- 不再作为相册页主交互中心
- 优先服务于无章节照片的轻协助
- 在章节内仅作为二级微调入口
```

- [ ] **Step 3: 校验局部重跑接口仍兼容新定位**

检查 `src/app/api/couples/[coupleId]/photos/[photoId]/retry/route.ts` 是否继续满足：

- `CAPTION_ONLY` 可用于无章节单图轻重写
- `LAYOUT_ONLY` 保留但不再是主交互焦点

如果需要，补充注释：

```ts
// Phase 3: single-photo retry is now a secondary assist capability.
```

- [ ] **Step 4: 检查 pipeline 的单图结果写回是否不阻碍章节主线**

在 `src/lib/agents/pipeline.ts` 审查并补充注释：

```ts
// Phase 3: aiCaption remains available for ungrouped photo assist,
// but chapter-level collaboration is the primary frontstage experience.
```

---

## Task 6: 回归 Phase 3 主线

**Files:**
- Modify: `docs/design/2026-05-20-p0-interaction-refocus.md`

- [ ] **Step 1: 运行 Phase 3 测试集合**

Run:

```bash
npm test -- tests/lib/photo-assist.test.ts
npm test -- tests/api/photo-assist-route.test.ts
npm test -- tests/app/dashboard/photo-detail-modal.test.tsx
npm test -- tests/lib/organization-readiness.test.ts
npm test -- tests/api/organization-readiness-route.test.ts
```

Expected:
- PASS

- [ ] **Step 2: 人工回归单图与 Dashboard**

Run: `npm run dev`

Then verify in browser:
- 无章节照片详情以“轻协助”而不是“重编辑”呈现
- 已归类照片能看到章节感知提示
- Dashboard 显示整理准备度和改进建议
- 旧的单图 AI 能力仍可用，但不再抢占主线

- [ ] **Step 3: 记录 Phase 3 之后的剩余风险**

记录以下风险：

- 轻协助建议仍偏 deterministic，后续可逐步引入更好的模型
- Dashboard 准备度只是组织层面的提示，不等于最终公开页质量
- 单图与章节间的双向同步文案策略还需要继续打磨

---

## Self-Review

### Spec coverage

- 无章节单图获得轻协助，不再和章节主线冲突
- Dashboard 从“纯统计”迈向“整理提示”
- 现有单图 AI 能力被保留并重新定位，而不是粗暴废弃

### Placeholder scan

- 本计划未使用 TBD/TODO 占位
- 每个任务都提供了明确文件方向与验证步骤

### Type consistency

- 单图轻协助服务统一命名为 `photo-assist`
- 整理准备度逻辑统一命名为 `organization-readiness`
- `momentContext` / `momentPromptAnswer` 作为单图轻语境字段

---

Plan complete and saved to `docs/superpowers/plans/2026-05-20-p0-single-photo-assist-phase3.md`.
