# P1 AI 重试与执行可观测性设计

> 适用范围：`P1-6 AI 文案重新生成按钮`、`P1-7 Pipeline 执行记录查看`、`P1-10 错误边界 + 全局错误处理 UI` 中与 AI 处理链路直接相关的核心部分。
>
> 相关文档：
> - [2026-05-16-p1-photo-management-workbench-design.md](./2026-05-16-p1-photo-management-workbench-design.md)

## 背景与问题

当前 AI 处理链路已经具备基础执行能力：

- `processPhoto()` 负责图片处理与 pipeline 编排
- `PipelineRun` 已落库
- pipeline engine 已支持 DAG、节点级重试和耗时/成本汇总

但仍存在几个关键断点：

- “重新处理”接口只改状态，不会重新触发 `processPhoto()`
- `PipelineRun` 没有列表和详情查询接口
- `Photo.status` 与 `PipelineRun.status` 语义未完全对齐
- 前端只能看到 `PROCESSING / FAILED` 角标，看不到失败细节和历史记录
- 统一错误响应与错误边界没有成型

P1 的目标不是把 pipeline 做成完整运维平台，而是补齐“可重试、可追踪、可解释”的最小闭环。

## 设计目标

1. 定义 AI 处理链路的状态机与失败语义。
2. 让“重新生成文案 / 重新处理照片”成为真实可执行操作，而不是状态重置。
3. 为 `PipelineRun` 提供列表与详情读取能力。
4. 在管理台中提供基础可观测性 UI。
5. 统一 API 错误响应格式和页面级错误兜底。

## 非目标

- 不做实时 SSE / WebSocket 推送
- 不做完整日志平台或外部 APM 对接
- 不做自动重试编排中心
- 不做模型评估、A/B 实验或成本报表

## 核心设计原则

### 照片状态与运行状态分离

- `Photo.status` 表示“这张照片对用户是否可用”
- `PipelineRun.status` 表示“这次 pipeline 尝试是否成功”

这两个状态相关，但不等价。

### 人工重试必须真正触发执行

任何重试入口都必须最终重新调用处理逻辑，而不是仅仅清空错误字段或修改表面状态。

### 错误先分层，再暴露

P1 需要先把错误分为：

- 上传/图片处理错误
- AI pipeline 失败
- 可降级成功
- 鉴权/业务错误

再决定哪些给用户看、哪些只给管理台看。

## 状态模型

### Photo.status

保持现有枚举：

- `UPLOADING`
- `PROCESSING`
- `READY`
- `FAILED`

但重新定义语义：

- `READY`
  - 图片资源可展示
  - 且 AI 必需结果已经完成，或降级后仍满足公开展示的最小标准
- `FAILED`
  - 图片处理主流程失败，或 AI 结果未达到最小可用标准

### PipelineRun.status

建议扩展为：

- `RUNNING`
- `COMPLETED`
- `FAILED`
- `DEGRADED`

含义：

- `COMPLETED`
  - 所有必需节点成功
- `FAILED`
  - 至少一个必需节点失败，且无法降级
- `DEGRADED`
  - 某些非关键节点失败，但结果仍可对外提供

如果短期内不修改 enum，也至少要在 `nodeResults` 汇总中记录 `degraded = true`。

### Retry 资格

一张照片满足以下任一条件时可重试：

- `Photo.status = FAILED`
- 最近一次 `PipelineRun.status = FAILED`
- 最近一次 `PipelineRun.status = DEGRADED`，且用户主动要求重新生成文案

## 数据与日志模型

### PipelineRun 建议补充字段

```prisma
model PipelineRun {
  id            String
  photoId       String
  coupleId      String
  status        PipelineStatus
  triggerType   String?
  attemptNumber Int      @default(1)
  errorCode     String?
  summary       String?
  dag           Json
  nodeResults   Json?
  totalTokens   Int?
  totalCost     Float?
  startedAt     DateTime
  completedAt   DateTime?
  duration      Int?
}
```

新增字段用途：

- `triggerType`
  - `UPLOAD` / `MANUAL_RETRY` / `CAPTION_REGEN`
- `attemptNumber`
  - 同一张照片的第几次处理尝试
- `errorCode`
  - 顶层失败原因
- `summary`
  - 适合管理台直接展示的简要说明

### 日志关联字段规范

所有日志建议统一附带：

- `runId`
- `photoId`
- `coupleId`
- `nodeId`
- `provider`
- `model`
- `errorCode`

目标是让控制台日志、数据库中的 run 记录和前端管理台可以串起来。

## API 契约

### POST /api/couples/:coupleId/photos/:photoId/retry

语义改为“重新触发完整处理”。

请求体：

```json
{
  "scope": "FULL"
}
```

或：

```json
{
  "scope": "CAPTION_ONLY"
}
```

规则：

- `FULL`
  - 重新走完整 pipeline
- `CAPTION_ONLY`
  - 只重跑文案相关节点，P1 若不做节点级复用，可先退化为全量重跑

响应：

```json
{
  "photoId": "photo_xxx",
  "runId": "run_xxx",
  "status": "RUNNING"
}
```

### GET /api/couples/:coupleId/photos/:photoId

补齐单图查询接口，服务给：

- `usePhotoStatus`
- 详情弹窗中的历史入口
- 失败信息展示

响应需包含：

- `status`
- `processingError`
- `latestRun`

### GET /api/couples/:coupleId/photos/:photoId/runs

用途：获取某张照片的处理历史。

响应示例：

```json
{
  "runs": [
    {
      "id": "run_1",
      "status": "FAILED",
      "triggerType": "UPLOAD",
      "attemptNumber": 1,
      "summary": "captionWriter timeout",
      "startedAt": "2026-05-16T10:00:00Z",
      "duration": 18432
    }
  ]
}
```

### GET /api/couples/:coupleId/runs

用途：管理台列表页查看全空间近期 pipeline 历史。

查询参数建议支持：

- `status`
- `photoId`
- `albumId`
- `triggerType`
- `page`
- `limit`

### GET /api/couples/:coupleId/runs/:runId

用途：查看某次运行详情。

响应需包含：

- 顶层 run 信息
- 节点级状态
- token / cost / duration
- 错误摘要

## 管理台信息架构

建议新增“Pipeline 记录”入口，位置可放在 [`src/components/sidebar.tsx`](/Users/user/Documents/codes/work/src/components/sidebar.tsx:1)。

### 1. Pipeline 历史页

列表字段建议：

- 运行时间
- 照片缩略图
- 相册标题
- 触发来源
- 状态
- 总耗时
- 总 token
- 总成本
- 简要错误

### 2. Run Detail 抽屉或详情页

展示：

- 顶层状态与摘要
- 节点级执行结果
- 每个节点的耗时、重试次数、错误信息
- 原始 `processingError`
- 操作入口：重新处理

### 3. 照片详情中的运行历史面板

在单图详情弹窗内可先提供轻量入口：

- 最近一次运行状态
- 最近失败摘要
- 查看全部历史

## 关键流程

### 流程 1：上传后自动处理

1. 创建照片记录
2. 状态置为 `PROCESSING`
3. 调用 `processPhoto()`
4. 创建 `PipelineRun`
5. 执行完成后：
   - 成功则照片 `READY`
   - 失败则照片 `FAILED`
   - 可降级则照片 `READY`，但 run 为 `DEGRADED`

### 流程 2：人工重新处理

1. 用户在详情弹窗点击“重新处理”或“重新生成文案”
2. 服务端校验该照片属于当前 couple 且当前没有运行中的 run
3. 状态置为 `PROCESSING`
4. 创建新 `PipelineRun`
5. 真实触发执行逻辑
6. 管理台可看到新的尝试记录

### 流程 3：查看运行详情

1. 用户进入 Pipeline 历史页
2. 按状态或相册筛选
3. 打开某次 run 详情
4. 查看节点级耗时、错误与重试信息

## 错误分层

### 第一层：业务错误

- 未登录
- 无权限
- 照片不属于当前 couple
- 正在处理中，不允许重复触发

### 第二层：资源错误

- OSS 下载失败
- 图片解码失败
- 缩略图生成失败

### 第三层：AI 错误

- 模型超时
- 模型响应格式非法
- token / provider 限流

### 第四层：降级成功

- 非关键节点失败但不阻塞最小展示能力

管理台要能区分这些层级，而不是统一显示“处理失败”。

## 统一错误响应

建议 API 统一返回：

```json
{
  "error": {
    "code": "PIPELINE_ALREADY_RUNNING",
    "message": "该照片正在处理中，请稍后再试",
    "retryable": false
  }
}
```

好处：

- 前端能区分 toast 文案与页面级错误
- 管理台能按 `code` 分类显示

## 前端错误边界

P1 建议补以下最小兜底：

- dashboard 级 `error.tsx`
- public space 级 `error.tsx`
- pipeline 历史页内局部错误展示

目标不是隐藏错误，而是让异常页面仍能给出：

- 当前出了什么问题
- 是否可刷新重试
- 是否需要返回上一页

## 测试策略

### 单元测试

- 照片状态与 run 状态映射
- `retryable` 规则
- 降级成功的判定

### API 测试

- retry 真正触发新 run
- 运行中重复触发被拒绝
- runs 列表与详情返回结构
- 错误 envelope 统一性

### 集成测试

- 上传后生成第一条 run
- pipeline 失败后照片进入 `FAILED`
- 手工 retry 后产生新的 `attemptNumber`
- 历史页和详情面板正确展示新记录

## 与其他文档的依赖边界

### 依赖 `照片管理工作台`

本设计为照片管理页提供：

- 单图最新状态
- 失败原因
- retry 能力

但不定义多选、排序或封面行为。

## 落地建议

建议实现顺序：

1. 先修复 retry 触发逻辑与 `Photo.status` 语义
2. 再补单图 GET 和 run 列表/详情接口
3. 然后接管理台历史页
4. 最后补统一错误 envelope 与页面错误边界
