# P2 回顾能力 Phase 1 设计

## Current Status

- Written on 2026-05-22 to start `P2：让回忆可沉淀` with the narrowest user-visible slice.
- This phase intentionally limits scope to review pages, not long-term memory tuning or share-image generation.

相关文档：
- [产品阶段任务清单](/Users/user/Documents/codes/work/docs/design/2026-05-22-product-stage-task-checklist.md)
- [下一阶段产品规划](/Users/user/Documents/codes/work/docs/design/2026-05-19-next-stage-product-roadmap.md)
- [P1 收口结论](/Users/user/Documents/codes/work/docs/design/2026-05-22-p1-closure-summary.md)

---

## 1. 目标

把 `P2` 的第一批能力收敛成“可生成、可查看、可公开展示”的回顾页闭环。

本阶段只交付：

- `年度回顾`
- `周年回顾`
- Dashboard 回顾入口
- 公开回顾展示页

本阶段明确不做：

- 回顾逐段编辑
- 摘要图 / 传播素材
- “我们的第一次”专题页
- 高频地点与足迹专题页
- AI 长期记忆偏好查看与重置

---

## 2. 设计结论

采用“预计算回顾实体 + 只读展示页”的方案。

原因：

- 回顾是相册、章节、里程碑的再组织结果，不适合让页面每次实时拼装。
- 后续要补分享图、重生成、回顾列表时，都需要稳定实体和状态字段。
- 当前代码库已经有服务端读模型 + 公共映射层的模式，新增实体最顺。

本次不采用“实时查询拼装”方案，因为它会把聚合规则、AI 组织逻辑和展示逻辑混进页面与 route，后续迭代成本更高。

---

## 3. 用户体验

### 3.1 Dashboard

Dashboard 新增一个 `Memory Reviews` 区块。

它承担三件事：

- 展示年度回顾与周年回顾是否已经可用
- 提供进入后台回顾详情页的入口
- 在没有回顾时给出生成动作

这里不做复杂管理台，不展示历史版本，不支持人工排序。

### 3.2 后台回顾页

新增后台回顾详情页，首版只读。

页面内容固定为四段：

1. 标题与副标题
2. 一段总述
3. 3 到 6 个精选回忆节点
4. 结尾摘要

后台页主要职责是“确认这份回顾是否值得展示”，不是进行精修编辑。

### 3.3 公开回顾页

公开空间新增独立回顾页，而不是把回顾直接塞进公开首页。

原因：

- 回顾内容比首页叙事层更长，独立页面阅读节奏更清楚。
- 年度回顾与周年回顾都需要独立 URL，后续分享和 SEO 更自然。
- 首页只需要提供回顾入口卡片，不必承载全文。

公开首页本轮只补一个回顾入口，不重做首页结构。

---

## 4. 数据模型

### 4.1 新增实体

新增 `MemoryReview` 模型，表示一次已经生成的回顾成品。

建议字段：

- `id`
- `coupleId`
- `type`：`YEARLY` / `ANNIVERSARY`
- `year`：用于自然年回顾
- `anniversaryYear`：用于第 N 周年回顾
- `title`
- `subtitle`
- `summary`
- `closing`
- `coverPhotoUrl`
- `status`：`PROCESSING` / `READY` / `FAILED`
- `payload`：结构化 JSON
- `publishedAt`
- `createdAt`
- `updatedAt`

`payload` 用于存放展示层结构化数据，而不是把全文都拆成很多表。首版建议包含：

- `highlights`: 精选节点数组
- `albumIds`: 关联相册
- `chapterIds`: 关联章节
- `milestoneIds`: 关联里程碑
- `locationSummary`: 可选地点统计

### 4.2 唯一性

需要限制同一情侣空间的同一回顾类型只有一条当前记录：

- `YEARLY + year`
- `ANNIVERSARY + anniversaryYear`

首版不做版本历史表，重复生成直接覆盖当前记录。

---

## 5. 生成输入与规则

### 5.1 数据来源

首版只使用高信号数据：

- 已确认 milestones
- 有摘要的 chapters
- album title / description
- couple startDate

本轮不直接使用“所有照片”作为正文候选来源，避免噪声过高。

### 5.2 年度回顾时间范围

年度回顾按自然年筛选：

- 起点：`YYYY-01-01`
- 终点：`YYYY-12-31`

首版优先生成“当前年”与“最近一个已完成自然年”之一，但代码结构应允许显式传入年份。

### 5.3 周年回顾时间范围

周年回顾以 `couple.startDate` 为锚点。

例如：

- 第 1 周年：开始日期后满 1 年
- 第 2 周年：开始日期后满 2 年

如果没有 `startDate`，则不允许生成周年回顾，只在 Dashboard 给出缺失提示。

### 5.4 内容组织规则

首版采用“规则筛选 + AI 组织表达”：

- 规则先筛出候选节点
- AI 再负责把候选整理成标题、总述、结尾和精选节点文案

规则层至少保证：

- 精选节点数量控制在 3 到 6 个
- 节点优先使用有标题、日期、地点、正文的 milestone
- milestone 不足时允许补充 chapter summary

AI 输出必须是结构化 JSON，避免直接拼长文本。

---

## 6. 代码结构

### 6.1 Prisma

在 [prisma/schema.prisma](/Users/user/Documents/codes/work/prisma/schema.prisma) 新增：

- `MemoryReviewType`
- `MemoryReviewStatus`
- `MemoryReview`

并把 `Couple` 关联到 `memoryReviews`。

### 6.2 Lib 层

新增一组聚焦回顾的 helpers：

- `src/lib/memory-reviews/review-builder.ts`
- `src/lib/memory-reviews/review-queries.ts`
- `src/lib/memory-reviews/review-mappers.ts`

职责拆分：

- `review-builder`：聚合输入、生成结构化回顾结果
- `review-queries`：后台与公开页查询
- `review-mappers`：把 Prisma 结果映射成页面稳定数据

### 6.3 路由

新增后台 route：

- `src/app/api/couples/[coupleId]/memory-reviews/route.ts`
- `src/app/api/couples/[coupleId]/memory-reviews/[reviewId]/route.ts`
- `src/app/api/couples/[coupleId]/memory-reviews/generate/route.ts`

新增公开 route：

- `src/app/api/public/[slug]/memory-reviews/route.ts`

### 6.4 页面

新增后台页面：

- `src/app/(dashboard)/reviews/page.tsx`
- `src/app/(dashboard)/reviews/[reviewId]/page.tsx`

新增公开页面：

- `src/app/s/[slug]/reviews/page.tsx`
- `src/app/s/[slug]/reviews/[reviewId]/page.tsx`

公开首页 [src/app/s/[slug]/page.tsx](/Users/user/Documents/codes/work/src/app/s/[slug]/page.tsx) 只补入口卡片，不承载完整回顾正文。

Dashboard 页 [src/app/(dashboard)/dashboard/page.tsx](/Users/user/Documents/codes/work/src/app/(dashboard)/dashboard/page.tsx) 新增回顾状态卡。

---

## 7. 错误处理与边界

- 没有 `startDate` 时，周年回顾入口显示不可生成提示。
- 候选内容不足时，不返回半成品；生成 route 返回 `FAILED` 或带原因的 400/422。
- 公开页只展示 `READY` 且 `publishedAt` 非空的回顾。
- 回顾生成失败时，不影响现有 Dashboard、公开首页、时间线等主链路。
- 首版不做后台并发控制，只做同类型回顾覆盖更新。

---

## 8. 测试策略

测试分三层：

1. 纯函数 / mapper 测试
2. route 测试
3. 页面级结构测试

必须覆盖：

- 年度 / 周年回顾范围判定
- 缺少 `startDate` 时周年回顾不可生成
- 公开查询不会返回未发布或失败回顾
- Dashboard 回顾卡能正确反映状态
- 公开页能展示回顾列表入口或空态

本轮优先做定向测试，不要求一次性补全整套端到端。

---

## 9. 验收标准

满足以下条件即可把 `P2 Phase 1` 视为完成：

- 用户能在 Dashboard 看到年度回顾和周年回顾入口
- 用户能在后台打开只读回顾详情页
- 公开空间能进入独立回顾页并阅读已发布回顾
- 年度回顾与周年回顾都由稳定实体承载，而不是页面临时拼装
- 代码结构允许下一阶段继续补分享图与长期记忆能力
