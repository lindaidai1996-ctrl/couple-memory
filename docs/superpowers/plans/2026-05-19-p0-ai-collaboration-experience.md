# P0 AI 协作体验 Implementation Plan

## Implementation Status

- Status: Mostly implemented and later refocused into the chapter-first P0 line.
- Landed across commits on 2026-05-20 to 2026-05-21, including:
  - `d2bb487 feat(data): 补齐情侣偏好和图片AI变体结构`
  - `248c1d2 feat(settings): 支持空间AI偏好设置并修复仪表盘查询`
  - `5683f5a feat(photo): 完善照片详情变体与重试能力`
  - `5588653 feat(ai): 接入Qwen视觉并增强多模型回退`
- Follow-up direction moved to the chapter-first roadmap in [2026-05-20-p0-execution-roadmap.md](/Users/user/Documents/codes/work/docs/superpowers/plans/2026-05-20-p0-execution-roadmap.md), with single-photo AI reduced to a supporting role.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在当前情侣记忆产品中落地 P0 阶段的 AI 协作体验，让照片文案和版式从单次自动结果升级为可重生成、可切候选、可发布检查的后台交互能力。

**Architecture:** 保留现有 `processPhoto -> runAIPipeline -> applyPipelineResults` 主链路，不重写 DAG 编排。通过新增照片 AI 变体表、扩展 Couple 偏好字段、增强 `retry` 与 `photo detail` API、在照片详情弹窗和 Dashboard 中引入 AI 协作交互，完成增量升级。

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Prisma 7, PostgreSQL, next-intl, existing custom DAG pipeline

---

## 文件结构

```
prisma/
└── schema.prisma                                           # 新增 AI 变体模型与 Couple 偏好字段

src/
├── app/
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx                              # 发布前检查卡片
│   │   └── settings/page.tsx                               # AI 风格偏好表单
│   └── api/
│       └── couples/[coupleId]/
│           ├── route.ts                                    # 扩展 Couple PATCH / GET 返回的 AI 偏好字段
│           ├── publish-readiness/route.ts                  # 新增发布检查接口
│           └── photos/[photoId]/
│               ├── route.ts                                # 保存选中文案候选、手动来源字段
│               └── retry/route.ts                          # 扩展 CAPTION / LAYOUT 局部重跑
├── components/
│   ├── photo-card.tsx                                      # PhotoData 扩展候选与来源字段
│   ├── photo-detail-modal.tsx                              # 文案候选、重生成、版式切换 UI
│   └── preferences/
│       └── ai-preferences-form.tsx                         # 可选：拆出设置页 AI 偏好区块
├── lib/
│   ├── agents/
│   │   ├── caption-writer.ts                               # 输出多候选文案
│   │   ├── layout-advisor.ts                               # 输出推荐版式与备选版式
│   │   └── pipeline.ts                                     # 局部执行与结果写回
│   ├── pipeline/
│   │   ├── process-photo.ts                                # 触发局部重跑
│   │   └── run-status.ts                                   # 重跑资格与发布检查复用逻辑
│   └── preferences.ts                                      # AI 风格选项与默认值
```

---

## Task 1: 扩展 Prisma 模型以支持 AI 偏好与候选结果

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: 为 Couple 增加 P0 所需的 AI 偏好字段**

在 `model Couple` 中追加：

```prisma
  captionStylePreference String? @default("romantic")
  tonePreference         String? @default("warm")
  blockedPhrases         String[] @default([])
```

说明：
- `captionStylePreference`：默认文案风格，如 `romantic` / `poetic`
- `tonePreference`：整体语气偏好，先以字符串保存，避免过早引入新 enum
- `blockedPhrases`：禁用表达列表

- [ ] **Step 2: 为 Photo 增加来源字段，避免手动结果被 AI 覆盖叙事不清**

在 `model Photo` 中追加：

```prisma
  selectedCaptionSource String? @default("AI")
  selectedLayoutSource  String? @default("AI")
```

说明：
- 当用户手写 `userCaption` 时，`selectedCaptionSource` 应改为 `MANUAL`
- 当用户手动切换版式时，`selectedLayoutSource` 应改为 `MANUAL`

- [ ] **Step 3: 新增 PhotoAIVariant 模型，统一存储文案候选与版式候选**

在 `schema.prisma` 末尾添加：

```prisma
model PhotoAIVariant {
  id         String   @id @default(cuid())
  photo      Photo    @relation(fields: [photoId], references: [id])
  photoId    String
  type       String
  content    String
  style      String?
  reason     String?
  isSelected Boolean  @default(false)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  @@index([photoId, type, createdAt])
}
```

并在 `model Photo` 中补上关系：

```prisma
  aiVariants      PhotoAIVariant[]
```

- [ ] **Step 4: 生成并检查 Prisma 客户端**

Run:

```bash
npx prisma format
npx prisma generate
```

Expected:
- schema 格式化成功
- Prisma Client 生成成功，无 relation 或 default 值错误

---

## Task 2: 扩展 Couple 设置接口和设置页表单

**Files:**
- Modify: `src/app/api/couples/[coupleId]/route.ts`
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/lib/preferences.ts`
- Optional Create: `src/components/preferences/ai-preferences-form.tsx`

- [ ] **Step 1: 扩展 Couple PATCH body 类型与 update data builder**

在 `src/app/api/couples/[coupleId]/route.ts` 的 `CouplePatchBody` 中追加：

```ts
  captionStylePreference?: string | null
  tonePreference?: string | null
  blockedPhrases?: string[]
```

并在 `buildCoupleUpdateData` 中追加：

```ts
  if (body.captionStylePreference !== undefined) {
    data.captionStylePreference = normalizeOptionalString(body.captionStylePreference)
  }
  if (body.tonePreference !== undefined) {
    data.tonePreference = normalizeOptionalString(body.tonePreference)
  }
  if (body.blockedPhrases !== undefined) {
    data.blockedPhrases = body.blockedPhrases.filter(item => typeof item === 'string' && item.trim().length > 0)
  }
```

- [ ] **Step 2: 在偏好工具文件中集中定义可选项**

在 `src/lib/preferences.ts` 中补充：

```ts
export const captionStyleOptions = [
  { value: 'romantic', labelKey: 'captionStyleRomantic' },
  { value: 'poetic', labelKey: 'captionStylePoetic' },
  { value: 'diary', labelKey: 'captionStyleDiary' },
  { value: 'photography-note', labelKey: 'captionStylePhotographyNote' },
] as const

export const toneOptions = [
  { value: 'warm', labelKey: 'toneWarm' },
  { value: 'restrained', labelKey: 'toneRestrained' },
  { value: 'cinematic', labelKey: 'toneCinematic' },
] as const
```

- [ ] **Step 3: 设置页增加 AI 风格设定表单状态**

在 `src/app/(dashboard)/settings/page.tsx` 的 `CoupleData` 和 `CoupleUpdateInput` 相关形状中新增：

```ts
  captionStylePreference: string | null
  tonePreference: string | null
  blockedPhrases: string[]
```

在 `normalizeCoupleResponse` 中补充：

```ts
    captionStylePreference: typeof data.captionStylePreference === 'string' ? data.captionStylePreference : null,
    tonePreference: typeof data.tonePreference === 'string' ? data.tonePreference : null,
    blockedPhrases: Array.isArray(data.blockedPhrases) ? data.blockedPhrases.filter(item => typeof item === 'string') : [],
```

- [ ] **Step 4: 在设置页渲染 AI 偏好区块**

在设置页主表单中加入一个独立 section，字段最小集如下：

```tsx
<section className="bg-warm-surface rounded-[var(--radius-lg)] p-5 border border-warm-border space-y-4">
  <div>
    <h2 className="text-base font-semibold text-warm-text">{t('aiPreferencesTitle')}</h2>
    <p className="text-sm text-warm-muted mt-1">{t('aiPreferencesDescription')}</p>
  </div>

  <label className="block space-y-1.5">
    <span className="text-sm font-medium text-warm-text">{t('captionStyleLabel')}</span>
    <select
      value={couple.captionStylePreference ?? 'romantic'}
      onChange={e => setCouple(prev => prev ? { ...prev, captionStylePreference: e.target.value } : prev)}
      className={inputClass}
    >
      <option value="romantic">{t('captionStyleRomantic')}</option>
      <option value="poetic">{t('captionStylePoetic')}</option>
      <option value="diary">{t('captionStyleDiary')}</option>
      <option value="photography-note">{t('captionStylePhotographyNote')}</option>
    </select>
  </label>

  <label className="block space-y-1.5">
    <span className="text-sm font-medium text-warm-text">{t('toneLabel')}</span>
    <select
      value={couple.tonePreference ?? 'warm'}
      onChange={e => setCouple(prev => prev ? { ...prev, tonePreference: e.target.value } : prev)}
      className={inputClass}
    >
      <option value="warm">{t('toneWarm')}</option>
      <option value="restrained">{t('toneRestrained')}</option>
      <option value="cinematic">{t('toneCinematic')}</option>
    </select>
  </label>

  <label className="block space-y-1.5">
    <span className="text-sm font-medium text-warm-text">{t('blockedPhrasesLabel')}</span>
    <textarea
      value={couple.blockedPhrases.join('\n')}
      onChange={e => setCouple(prev => prev ? {
        ...prev,
        blockedPhrases: e.target.value.split('\n').map(item => item.trim()).filter(Boolean),
      } : prev)}
      rows={4}
      className={inputClass}
    />
  </label>
</section>
```

- [ ] **Step 5: 手动验证 Couple 偏好保存**

Run:

```bash
npm run lint
```

Then verify in browser:
- 设置页能加载当前偏好
- 修改后保存成功
- `/api/couples/mine` 返回新字段

---

## Task 3: 扩展 Pipeline 输出，写入文案候选与版式候选

**Files:**
- Modify: `src/lib/agents/caption-writer.ts`
- Modify: `src/lib/agents/layout-advisor.ts`
- Modify: `src/lib/agents/pipeline.ts`

- [ ] **Step 1: CaptionWriter 输出改为 variants 结构**

把 `captionWriter` 输出从单个 `caption` 扩成：

```ts
type CaptionVariant = {
  text: string
  style: string
}

type CaptionWriterOutput = {
  caption: string
  keywords: string[]
  variants: CaptionVariant[]
}
```

最小策略：
- 按 Couple 默认偏好生成 1 条
- 再生成 1 条相邻风格候选
- `caption` 字段继续保留为首选结果，避免打断现有兼容逻辑

- [ ] **Step 2: LayoutAdvisor 输出明确保留 alternatives**

在 `layout-advisor.ts` 确保输出结构至少包含：

```ts
type LayoutAdvisorOutput = {
  layout: string
  reason: string
  alternatives: string[]
}
```

如果当前 Prompt 已能返回备选项，优先复用，不要新增无必要模型调用。

- [ ] **Step 3: 在 applyPipelineResults 中写入 Photo 与 PhotoAIVariant**

在 `src/lib/agents/pipeline.ts` 的 `applyPipelineResults` 中新增两段逻辑：

1. 更新 Photo 主字段，继续保留当前兼容输出
2. 重建当前 photo 的 AI 候选结果

推荐伪代码：

```ts
await prisma.photo.update({
  where: { id: photoId },
  data: {
    aiCaption: caption?.caption,
    aiKeywords: caption?.keywords || [],
    aiLayout: layout?.layout || 'side-by-side',
    selectedCaptionSource: 'AI',
    selectedLayoutSource: 'AI',
    aiScene: analysis?.scene,
    aiMood: analysis?.mood,
    aiComposition: analysis?.composition,
    aiColorTone: analysis?.colorTone,
  },
})

await prisma.photoAIVariant.deleteMany({
  where: { photoId, type: { in: ['CAPTION', 'LAYOUT'] } },
})

await prisma.photoAIVariant.createMany({
  data: [
    ...(caption?.variants ?? []).map((item, index) => ({
      photoId,
      type: 'CAPTION',
      content: item.text,
      style: item.style,
      isSelected: index === 0,
    })),
    {
      photoId,
      type: 'LAYOUT',
      content: layout?.layout || 'side-by-side',
      reason: layout?.reason ?? null,
      isSelected: true,
    },
    ...((layout?.alternatives ?? []).map(item => ({
      photoId,
      type: 'LAYOUT',
      content: item,
      isSelected: false,
    }))),
  ],
})
```

- [ ] **Step 4: 验证现有全量处理链路未回退**

Run:

```bash
npm run test
npm run lint
```

Expected:
- 现有 pipeline 相关测试继续通过
- 新增字段不会导致 `applyPipelineResults` 类型错误

---

## Task 4: 扩展照片详情与重试 API，支持局部重跑和候选选择

**Files:**
- Modify: `src/app/api/couples/[coupleId]/photos/[photoId]/route.ts`
- Modify: `src/app/api/couples/[coupleId]/photos/[photoId]/retry/route.ts`
- Modify: `src/components/photo-card.tsx`

- [ ] **Step 1: 扩展 GET /photos/[photoId] 返回候选结果**

在 `photo detail route` 的 `findFirst` 中 include：

```ts
        aiVariants: {
          orderBy: [{ type: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            type: true,
            content: true,
            style: true,
            reason: true,
            isSelected: true,
          },
        },
```

并让响应返回：

```ts
return NextResponse.json({
  ...photoData,
  latestRun: latestRun ?? null,
  captionVariants: aiVariants.filter(item => item.type === 'CAPTION'),
  layoutVariants: aiVariants.filter(item => item.type === 'LAYOUT'),
})
```

- [ ] **Step 2: 扩展 PATCH /photos/[photoId] 支持候选选择**

在 `PATCH` 中不要直接透传整个 body；改为白名单更新：

```ts
const data: Record<string, unknown> = {}

if (typeof body.userCaption === 'string') {
  data.userCaption = body.userCaption
  data.selectedCaptionSource = body.userCaption.trim() ? 'MANUAL' : 'AI'
}

if (typeof body.aiLayout === 'string') {
  data.aiLayout = body.aiLayout
  data.selectedLayoutSource = 'MANUAL'
}
```

如果 body 里有 `selectedCaptionVariantId`，则：
- 查询该 variant
- 写入 `photo.aiCaption = variant.content`
- `selectedCaptionSource = 'AI'`
- 重置同类 variant 的 `isSelected`

同理，如果 body 里有 `selectedLayoutVariantId`：
- 写入 `photo.aiLayout = variant.content`
- `selectedLayoutSource = 'AI'`

- [ ] **Step 3: 扩展 retry scope，让重跑更贴近 P0 交互**

当前 retry route 只支持：

```ts
type RetryScope = 'FULL' | 'CAPTION_ONLY'
```

扩展为：

```ts
type RetryScope = 'FULL' | 'CAPTION_ONLY' | 'LAYOUT_ONLY'
```

并把 `resolveRetryTriggerType` 改为：

```ts
function resolveRetryTriggerType(scope: RetryScope) {
  if (scope === 'CAPTION_ONLY') return 'CAPTION_REGEN' as const
  if (scope === 'LAYOUT_ONLY') return 'LAYOUT_REGEN' as const
  return 'MANUAL_RETRY' as const
}
```

同时放宽允许条件：
- `FAILED` 照片允许 `FULL`
- `READY` 或 `DEGRADED` 照片允许 `CAPTION_ONLY` / `LAYOUT_ONLY`

- [ ] **Step 4: PhotoCard 类型补充来源与候选字段**

在 `src/components/photo-card.tsx` 的 `PhotoData` 中新增：

```ts
  selectedCaptionSource?: string | null
  selectedLayoutSource?: string | null
  captionVariants?: Array<{ id: string; content: string; style?: string | null; isSelected: boolean }>
  layoutVariants?: Array<{ id: string; content: string; reason?: string | null; isSelected: boolean }>
```

说明：
- 这一步先扩展类型，保证详情弹窗可消费完整数据
- PhotoCard 视觉本身不必立即展示所有字段

---

## Task 5: 改造照片详情弹窗为 AI 协作面板

**Files:**
- Modify: `src/components/photo-detail-modal.tsx`

- [ ] **Step 1: 弹窗初始化使用照片详情接口而不是只用列表数据**

增加局部 state：

```ts
const [detail, setDetail] = useState<PhotoData | null>(null)
const [detailLoading, setDetailLoading] = useState(true)
```

在 `useEffect` 中请求：

```ts
useEffect(() => {
  let active = true

  async function fetchDetail() {
    setDetailLoading(true)
    const res = await fetch(`/api/couples/${coupleId}/photos/${photo.id}`)
    const data = await res.json()
    if (active) {
      setDetail(data)
      setCaption(data.userCaption || data.aiCaption || '')
      setLayout(data.aiLayout || 'side-by-side')
      setDetailLoading(false)
    }
  }

  fetchDetail()
  return () => { active = false }
}, [coupleId, photo.id])
```

- [ ] **Step 2: 为 edit tab 增加文案候选列表与切换操作**

在 `edit` tab 中加入：

```tsx
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <label className="text-sm font-medium text-warm-text">{t('captionVariants')}</label>
    <button
      onClick={() => handleRetry('CAPTION_ONLY')}
      disabled={retrying}
      className="text-sm text-warm-accent hover:text-warm-accent-hover"
    >
      {retrying ? t('retrying') : t('regenerateCaption')}
    </button>
  </div>

  <div className="space-y-2">
    {(detail?.captionVariants ?? []).map(variant => (
      <button
        key={variant.id}
        onClick={() => handleSelectCaptionVariant(variant.id)}
        className={`w-full text-left rounded-[var(--radius-md)] border p-3 transition-colors ${
          variant.isSelected
            ? 'border-warm-accent bg-warm-accent/10'
            : 'border-warm-border hover:border-warm-accent/40'
        }`}
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-warm-muted">{variant.style || t('defaultStyle')}</span>
          {variant.isSelected && <span className="text-xs text-warm-accent">{t('selected')}</span>}
        </div>
        <p className="mt-2 text-sm text-warm-text leading-6">{variant.content}</p>
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 3: 为 edit tab 增加版式候选列表**

版式区块改造为：

```tsx
<div className="space-y-2">
  <div className="flex items-center justify-between">
    <label className="text-sm font-medium text-warm-text">{t('layoutTemplate')}</label>
    <button
      onClick={() => handleRetry('LAYOUT_ONLY')}
      disabled={retrying}
      className="text-sm text-warm-accent hover:text-warm-accent-hover"
    >
      {retrying ? t('retrying') : t('regenerateLayout')}
    </button>
  </div>

  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
    {(detail?.layoutVariants ?? []).map(variant => (
      <button
        key={variant.id}
        onClick={() => handleSelectLayoutVariant(variant.id, variant.content)}
        className={`rounded-[var(--radius-md)] border p-3 text-left transition-colors ${
          variant.isSelected
            ? 'border-warm-accent bg-warm-accent/10'
            : 'border-warm-border hover:border-warm-accent/40'
        }`}
      >
        <p className="text-sm font-medium text-warm-text">{variant.content}</p>
        {variant.reason && <p className="mt-1 text-xs text-warm-muted">{variant.reason}</p>}
      </button>
    ))}
  </div>
</div>
```

- [ ] **Step 4: 保留手动编辑能力，但明确来源切换**

`handleSave` 改为只提交白名单字段：

```ts
await fetch(`/api/couples/${coupleId}/photos/${photo.id}`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userCaption: caption,
    aiLayout: layout,
  }),
})
```

保存后重新拉取详情，确保：
- 手动文案会把 `selectedCaptionSource` 置为 `MANUAL`
- 手动切版式会把 `selectedLayoutSource` 置为 `MANUAL`

- [ ] **Step 5: 验证弹窗核心交互**

验证清单：
- 打开弹窗后能看到候选文案
- 点击候选能切换当前 AI 文案
- 可以触发仅文案重生成
- 可以触发仅版式重推荐
- 手写文案后重新打开仍能展示手动结果

---

## Task 6: 新增发布前检查接口与 Dashboard 卡片

**Files:**
- Create: `src/app/api/couples/[coupleId]/publish-readiness/route.ts`
- Modify: `src/app/(dashboard)/dashboard/page.tsx`

- [ ] **Step 1: 新增发布准备度接口**

创建 `src/app/api/couples/[coupleId]/publish-readiness/route.ts`，返回：

```ts
{
  score: number,
  checks: {
    hasCover: boolean,
    hasBio: boolean,
    enoughReadyPhotos: boolean,
    missingCaptions: number,
    processingPhotos: number,
    hasTimelineMilestones: boolean,
  },
  suggestions: string[],
}
```

最小评分逻辑建议：

```ts
const score =
  (hasCover ? 20 : 0) +
  (hasBio ? 15 : 0) +
  (readyPhotoCount >= 6 ? 25 : readyPhotoCount > 0 ? 10 : 0) +
  (missingCaptions === 0 ? 20 : Math.max(0, 20 - missingCaptions * 3)) +
  (processingPhotos === 0 ? 10 : 0) +
  (milestoneCount > 0 ? 10 : 0)
```

- [ ] **Step 2: Dashboard 拉取并展示 readiness 结果**

在 `dashboard/page.tsx` 中，在已有统计卡片下方增加：

```tsx
<section className="mt-8 bg-warm-surface rounded-[var(--radius-lg)] p-5 border border-warm-border">
  <div className="flex items-start justify-between gap-4">
    <div>
      <h2 className="text-base font-semibold text-warm-text">{t('publishReadinessTitle')}</h2>
      <p className="text-sm text-warm-muted mt-1">{t('publishReadinessSubtitle')}</p>
    </div>
    <div className="text-right">
      <p className="text-3xl font-bold text-warm-text">{readiness.score}</p>
      <p className="text-xs text-warm-muted">{t('publishReadinessScore')}</p>
    </div>
  </div>

  <ul className="mt-4 space-y-2">
    {readiness.suggestions.map(item => (
      <li key={item} className="text-sm text-warm-muted">{item}</li>
    ))}
  </ul>
</section>
```

如果当前页面为 server component，优先在服务端直接请求统计所需的 Prisma 数据，而不是从自身 API 二次 fetch。

- [ ] **Step 3: 验证 readiness 结果与当前空间状态匹配**

验证场景：
- 无简介、无封面时分数较低
- 补充简介和公开封面后分数上升
- 存在处理中图片时会有提示

---

## Task 7: 文案与计划收尾验证

**Files:**
- Modify: i18n 消息文件（按现有目录结构补文案）
- Verify: changed files above

- [ ] **Step 1: 补全新增 UI 文案 key**

为以下 key 补充中英文本：

```txt
aiPreferencesTitle
aiPreferencesDescription
captionStyleLabel
blockedPhrasesLabel
captionVariants
regenerateCaption
regenerateLayout
publishReadinessTitle
publishReadinessSubtitle
publishReadinessScore
selected
defaultStyle
```

说明：
- 按现有 `next-intl` 目录结构补，不新建第二套消息组织方式

- [ ] **Step 2: 跑 lint 和测试**

Run:

```bash
npm run lint
npm run test
```

Expected:
- lint 全绿
- 现有测试通过
- 若新增测试，至少覆盖 retry scope、photo patch 白名单、publish readiness 评分

- [ ] **Step 3: 人工回归主流程**

回归路径：
- 设置页保存 AI 偏好
- 上传图片并等待 AI 处理完成
- 在照片详情弹窗中切换文案候选
- 重生成文案和版式
- 查看 Dashboard 的发布前检查卡片
- 发布公开页并检查已有数据不回退

---

## 计划备注

### 本计划刻意不做的事情

- 不重写现有 DAG 引擎
- 不在 P0 就引入相册级摘要生成
- 不在 P0 处理长期记忆和专题页
- 不为“模型热门度”强行替换为 LangChain / LangGraph

### 风险点

1. `PhotoDetailModal` 当前以列表数据为输入，需要补单图详情拉取，避免 detail 数据不完整
2. retry 路由目前对 `FAILED` 状态假设较重，扩展局部重跑时要避免误伤已有 guard
3. 现有 `PATCH /photos/[photoId]` 直接透传 body，P0 改造后必须换成白名单更新，避免污染数据库字段
4. `applyPipelineResults` 增加候选写入后，要保证重复执行时不会累积脏 variant 数据

### 完成定义

P0 完成时，至少满足以下条件：

- 用户可以设置空间级默认文案风格
- 用户可以为单张照片切换至少 2 个 AI 文案候选
- 用户可以只重生成文案或只重推荐版式
- 用户可以手动接管文案和版式，并保留来源语义
- Dashboard 可以展示发布前完成度与修复建议

## Phase 3 Note

单图 caption/layout 候选能力保留，但其产品优先级已下调：

- 不再作为相册页主交互中心
- 优先服务于无章节照片的轻协助
- 在章节内仅作为二级微调入口
