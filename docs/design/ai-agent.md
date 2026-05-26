# Agent 编排设计

> 最后根据实际代码更新：2026-05-25
>
> 本文档描述项目中与 Agent 编排相关的真实实现，包括图片处理主链、DAG 引擎、模型路由、降级策略、结果持久化、单图协作能力和运行可观测性。
>
> 相关文档：[总览](./README.md) · [技术架构](./architecture.md) · [图片处理管道](./image-pipeline.md) · [数据库设计](./database.md) · [API 设计](./api-design.md)

## 1. 设计目标

当前项目里的 Agent 编排不是“让一个大模型自主决定下一步做什么”，而是“由代码显式定义一条可控的照片处理与 AI 协作链路”。

设计目标有 5 个：

1. 把照片上传后的 AI 处理拆成边界清晰的独立节点，而不是一段难以观测的大函数。
2. 让视觉分析、文案生成、排版建议、时间线建议之间保持固定依赖关系，便于推理和调试。
3. 即使某个节点失败，也尽量保住可展示结果，让用户得到 `READY` 或可继续编辑的状态，而不是被整条链路阻塞。
4. 把每次运行的 DAG、节点结果、错误码、耗时、token 消耗落到数据库，支持后台排查。
5. 把“AI 自动生成”降级为“AI 协作”，允许用户保留、替换、重选或局部重跑结果。

## 2. 当前代码范围

与 Agent 编排直接相关的核心文件如下：

### 2.1 主链路

- `src/lib/pipeline/process-photo.ts`
- `src/lib/pipeline/run-status.ts`
- `src/app/api/couples/[coupleId]/photos/route.ts`
- `src/app/api/couples/[coupleId]/photos/[photoId]/retry/route.ts`

### 2.2 Agent 引擎与节点

- `src/lib/agents/engine/types.ts`
- `src/lib/agents/engine/topological-sort.ts`
- `src/lib/agents/engine/executor.ts`
- `src/lib/agents/pipeline.ts`
- `src/lib/agents/photo-analyzer.ts`
- `src/lib/agents/caption-writer.ts`
- `src/lib/agents/layout-advisor.ts`
- `src/lib/agents/timeline-builder.ts`

### 2.3 模型适配层

- `src/lib/agents/deepseek-client.ts`
- `src/lib/agents/openai-client.ts`
- `src/lib/agents/qwen-client.ts`

### 2.4 协作结果消费层

- `src/app/api/couples/[coupleId]/photos/[photoId]/route.ts`
- `src/app/api/couples/[coupleId]/photos/[photoId]/assist/route.ts`
- `src/app/api/couples/[coupleId]/runs/route.ts`
- `src/app/api/couples/[coupleId]/runs/[runId]/route.ts`
- `src/app/(dashboard)/pipeline/page.tsx`

### 2.5 状态记忆与上下文

- `src/lib/style-memory.ts`
- `src/lib/photos/photo-assist.ts`

## 3. 编排总览

### 3.1 端到端链路

```text
上传确认
  -> processPhoto(...)
  -> 生成 display / thumbnail
  -> 提取并合并 EXIF
  -> GPS 逆地理编码
  -> 组装 PipelineInput + couple 偏好 + style memory
  -> runAIPipeline(...)
  -> executePipeline(DAG)
  -> applyPipelineResults(...)
  -> 写回 Photo / PhotoAIVariant / PipelineRun
  -> resolvePipelineOutcome(...)
  -> 决定照片状态 READY / FAILED
```

### 3.2 DAG 关系

当前 DAG 由 `src/lib/agents/pipeline.ts` 中的 `loadDagNodes()` 固定定义：

```text
photoAnalyzer
  -> captionWriter
  -> layoutAdvisor
  -> timelineBuilder
```

这里有两个关键点：

1. `photoAnalyzer` 是唯一上游节点，负责提供后续节点共享的视觉语义上下文。
2. 下游 3 个节点彼此无依赖，因此会在同一层并发执行。

这意味着当前系统是“固定 DAG + 并行下游”，而不是动态多 Agent 路由。

## 4. 为什么是代码编排，不是 LLM 自主编排

项目现在选择的是代码编排：

- DAG 结构稳定，业务上没有“由模型决定应该调用哪个工具或分支”的必要。
- 上传处理是后端基础设施链路，稳定性优先，不能把主控制权交给模型推理。
- 每个节点需要明确记录 token、cost、duration、errorCode，这类可观测性更适合代码驱动。
- 节点失败后的后续行为是产品决策，不是模型决策。例如：`FAILED` 是否还能展示、是否允许局部重跑，都必须由代码保证一致。

当前实现保留了 AI 的创造性，但把流程控制权牢牢放在服务端代码里。

## 5. 核心数据结构

### 5.1 Agent 接口

`src/lib/agents/engine/types.ts`

```ts
export interface Agent {
  id: string
  execute(input: PipelineInput, depOutputs: Record<string, unknown>): Promise<AgentOutput>
}
```

这意味着每个节点都遵守同一个最小接口：

- 读取统一的 `PipelineInput`
- 读取依赖节点输出 `depOutputs`
- 返回带 `data / tokens / cost` 的标准结果

### 5.2 PipelineInput

当前输入不仅包含图片信息，也包含用户长期偏好：

- `photoId`
- `photoUrl`
- `exif`
- `width` / `height`
- `locationName`
- `preferences.captionStylePreference`
- `preferences.tonePreference`
- `preferences.blockedPhrases`
- `preferences.longTermMemory`

其中 `longTermMemory` 由 `src/lib/style-memory.ts` 计算得来，不是通用 LLM memory，而是“当前 couple 最近保留下来的风格偏好摘要”。

### 5.3 NodeResult

每个节点统一输出：

- `status`: `COMPLETED | FAILED | SKIPPED`
- `output`
- `error`
- `duration`
- `tokens`
- `cost`
- `retryCount`

这个结构既驱动运行时判断，也会被整体落进 `PipelineRun.nodeResults` 供后台查看。

## 6. DAG 引擎实现

### 6.1 拓扑排序

`src/lib/agents/engine/topological-sort.ts` 使用 Kahn 风格的入度算法按层返回节点：

- 第 0 层：所有入度为 0 的节点
- 第 1 层：去掉上一层出边后新产生的入度为 0 的节点
- 直到队列为空

对当前 DAG，层级结果稳定为：

- Level 0: `photoAnalyzer`
- Level 1: `captionWriter`、`layoutAdvisor`、`timelineBuilder`

### 6.2 执行策略

`src/lib/agents/engine/executor.ts`

执行器按层推进：

1. 先拓扑排序。
2. 同一层 `Promise.all(...)` 并发执行。
3. 每个节点拿到之前层级的结果作为依赖输入。
4. 所有层完成后汇总 `PipelineResult`。

### 6.3 依赖失败处理

如果某节点的任一依赖不是 `COMPLETED`，该节点直接返回 `SKIPPED`，不会尝试执行。

这保证了：

- 下游不会消费失败或不完整的上游结果。
- 节点级失败传播是显式的，而不是隐式抛错。

### 6.4 超时与重试

当前执行器内置两层守护：

- 单节点超时：`30_000ms`
- 最多重试：`2` 次
- 重试间隔：`1s`、`2s`

注意这里的重试实现比较朴素：

- 没有按错误类型区分“可重试/不可重试”
- 任何抛错都会进入统一重试流程
- 节点失败后固定把 `retryCount` 写成 `2`

这套实现对 MVP 足够，但如果后续要更精细地治理成本或 API 配额，重试策略需要继续细化。

## 7. 4 个 Agent 节点的真实职责

### 7.1 PhotoAnalyzer

文件：`src/lib/agents/photo-analyzer.ts`

职责：

- 读取图片和拍摄上下文
- 生成视觉分析结果
- 给下游节点提供统一分析语义

输出字段：

- `scene`
- `mood`
- `composition`
- `colorTone`
- `subjects`
- `confidence`
- `source`

#### 模型优先级

视觉分析不是固定只走一个供应商，而是按环境变量顺序选择：

1. `QWEN_API_KEY` -> `callQwenVision(...)`
2. `OPENAI_API_KEY` -> `callOpenAIVision(...)`
3. `CLAUDE_API_KEY` -> 内部 `analyzeWithClaude(...)`
4. 都没有 -> 本地 `metadata-only` 保守分析

这和旧设计文档里“固定 Claude Vision”已经不同。

#### 无视觉模型时的降级

如果没有任何视觉模型，节点不会失败，而是返回低置信度的元数据推断：

- `scene` 只基于地点做保守表述
- `mood/composition/colorTone` 标成未识别
- `confidence` 降到 `0.2` 或 `0.12`
- `source = "metadata-only"`

这样做的目的不是“假装分析成功”，而是让下游节点识别当前结果不可靠，从而进一步降级。

### 7.2 CaptionWriter

文件：`src/lib/agents/caption-writer.ts`

职责：

- 基于照片分析、地点、时间和长期偏好生成文案
- 返回主文案、关键词、风格和多个候选变体

输出结构：

- `caption`
- `keywords`
- `style`
- `variants[]`

#### 输入上下文

该节点会把这些内容拼进 prompt：

- `analysis`
- `locationName`
- `takenAt`
- `captionStylePreference`
- `tonePreference`
- `blockedPhrases`
- `longTermMemory`

其中 `longTermMemory` 是由最近 48 张 `READY` 照片的已选文案风格、关键词、地点等压缩出的长期提示语。

#### 低置信度保护

如果 `photoAnalyzer.confidence < 0.35`，或者分析结果来自 `metadata-only`，文案节点不会继续调用远端模型，而是本地生成保守文案：

- 避免基于错误视觉理解写出很具体但完全不对的内容
- 关键词直接清空
- 风格回退为 `diary`

这是当前链路中非常关键的一条“抗幻觉保护”。

#### 模型优先级与降级链

CaptionWriter 的真实模型链是多层回退，不是旧文档里那种“固定 DeepSeek”：

1. 优先 `Qwen Vision`
2. Qwen 失败后尝试 `OpenAI Vision`
3. OpenAI 失败后尝试 `Claude`
4. Claude 再失败后降级到 `DeepSeek`
5. DeepSeek 优先尝试“带图请求”
6. DeepSeek 视觉请求失败时，再降为纯文本文案生成

也就是说，当前文案节点本质上是一个“视觉优先、文本兜底”的多供应商路由器。

### 7.3 LayoutAdvisor

文件：`src/lib/agents/layout-advisor.ts`

职责：

- 基于 `photoAnalyzer` 输出和图片宽高比推荐展示模板

输出结构：

- `layout`
- `reason`
- `alternatives[]`

当前可选模板包括：

- `cinema-wide`
- `side-by-side`
- `portrait-hero`
- `grid-square`
- `story-card`

它目前只调用 `DeepSeek` 文本接口，不涉及多供应商回退。

### 7.4 TimelineBuilder

文件：`src/lib/agents/timeline-builder.ts`

职责：

- 结合当前照片与既有里程碑，判断是否值得创建新的时间线节点

输入除了 `photoAnalyzer` 输出，还会额外查库读取：

- 当前 `photo`
- 所属 `album`
- 同一 `couple` 最近 20 条 `milestone`

输出结构：

- `shouldCreateMilestone`
- `milestone`
- `reason`

当前它也是 `DeepSeek` 文本调用。

需要注意的是：当前 `applyPipelineResults(...)` 会读取 `timelineBuilder` 输出，但没有在这里直接写入 `Milestone`。因此它更像“里程碑建议节点”，而不是“自动建里程碑节点”。

## 8. 模型适配层设计

### 8.1 DeepSeek

文件：`src/lib/agents/deepseek-client.ts`

提供两类调用：

- `callDeepSeek(...)`：纯文本
- `callDeepSeekVision(...)`：文本 + 图片 URL

统一返回：

- `text`
- `tokens`
- `cost`

### 8.2 OpenAI

文件：`src/lib/agents/openai-client.ts`

当前走的是 `POST /v1/responses`，不是旧版 Chat Completions。

特点：

- 默认模型来自 `OPENAI_VISION_MODEL`，没有则回退到 `gpt-4.1-mini`
- 结构化提取 `output_text`
- 失败时会拼接 `x-request-id` 进入错误信息，便于日志排查

### 8.3 Qwen

文件：`src/lib/agents/qwen-client.ts`

特点：

- 默认模型来自 `QWEN_VISION_MODEL`，没有则回退到 `qwen-vl-plus`
- 请求地址来自 `QWEN_BASE_URL`，默认是 DashScope compatible-mode 接口
- 会保留 `x-request-id` / `x-acs-request-id`

### 8.4 为什么要有独立适配层

这样拆的好处有 4 个：

1. Agent 节点不需要关心各供应商 HTTP 细节。
2. 模型切换只影响适配器和节点路由，不影响 DAG 引擎。
3. 统一日志字段，便于比较不同供应商的稳定性。
4. 后续扩展更多模型时，不需要重写业务节点接口。

## 9. PipelineRun：一次运行如何落库

### 9.1 创建运行记录

`runAIPipeline(...)` 在实际执行前先创建一条 `PipelineRun`：

- `coupleId`
- `photoId`
- `triggerType`
- `attemptNumber`
- `dag`

其中 `dag` 记录的是当前运行使用的节点列表与依赖关系快照，而不是只在代码里保留定义。

### 9.2 运行完成后更新

执行结束后，`buildPipelineRunUpdate(...)` 会生成落库数据：

- `status`
- `nodeResults`
- `totalTokens`
- `totalCost`
- `duration`
- `completedAt`
- `errorCode`
- `summary`

### 9.3 状态语义

`PipelineRun.status` 不是简单复制执行器结果，而是做了一层业务语义转换：

- 执行器 `COMPLETED` -> 运行状态 `COMPLETED`
- 执行器 `FAILED` 且存在部分节点成功 -> `DEGRADED`
- 执行器 `FAILED` 且没有成功节点 -> `FAILED`

这层转换很重要，因为它决定了照片最终是否还能被当作可展示内容。

## 10. Photo 与 PhotoAIVariant：结果如何写回

### 10.1 Photo 主字段

`applyPipelineResults(...)` 会把已完成节点的关键信息直接写回 `Photo`：

- 分析结果：`aiScene`、`aiMood`、`aiComposition`、`aiColorTone`
- 文案结果：`aiCaption`、`aiKeywords`、`selectedCaptionSource`
- 排版结果：`aiLayout`、`selectedLayoutSource`

这部分是“当前被前台主视图使用的选中结果”。

### 10.2 变体表

同时还会重建 `PhotoAIVariant`：

- `type = CAPTION | LAYOUT`
- `content`
- `style`
- `reason`
- `isSelected`

它的职责不是保存一切原始模型输出，而是保存“用户可以在前台重选的候选集”。

### 10.3 为什么两层都要存

这样设计的原因是：

- `Photo` 提供前台高频读取的最终值
- `PhotoAIVariant` 提供协作和回退能力

如果只存 variants，前台每次展示都要再解一层选择逻辑。
如果只存主字段，用户就失去在多个 AI 候选间切换的能力。

## 11. processPhoto：完整编排入口

文件：`src/lib/pipeline/process-photo.ts`

这是 Agent 编排的真正业务入口，不是前台页面，也不是单个 Agent。

它负责：

1. 从 OSS 下载原图
2. 生成 `display` / `thumbnail`
3. 解析 EXIF
4. 与前端上报的客户端 EXIF 合并
5. 通过 GPS 逆地理编码得到 `locationName`
6. 读取当前 couple 的长期风格记忆
7. 调用 `runAIPipeline(...)`
8. 在 `COMPLETED` 或 `DEGRADED` 时写回结果
9. 根据运行结果决定 `Photo.status`

### 11.1 输入偏好组装

送入 pipeline 的偏好不只是数据库字段直传，而是经过整理：

- `captionStylePreference`
- `tonePreference`
- `blockedPhrases`
- `longTermMemory = buildStyleMemoryPromptLines(styleMemoryProfile)`

这使得“用户过往选过什么风格”和“当前显式设置了什么偏好”能同时影响文案生成。

### 11.2 照片最终状态

`resolvePipelineOutcome(...)` 当前规则如下：

- `FAILED` -> `Photo.status = FAILED`
- `DEGRADED` + 有展示图 -> `READY`
- `COMPLETED` + 有展示图 -> `READY`

也就是说，AI 层部分失败不一定让照片失败，只要图片资产完整，照片仍然可以进入可用状态。

这是整个产品“AI 协作优先于 AI 阻断”的核心设计之一。

## 12. style memory：长期偏好如何进入 Agent

文件：`src/lib/style-memory.ts`

这不是通用意义上的 conversation memory，而是面向当前产品的“风格记忆压缩器”。

它会从当前 couple 的近期 `READY` 照片中提取：

- 已选文案风格计数
- 高频关键词
- 高频地点
- 用户保留 AI 文案还是手动改写的比例
- blocked phrases

然后生成类似下面的 prompt 行：

- 长期风格优先参考：...
- 长期语气延续：...
- 长期保留的意象：...
- 长期重复出现的地点：...
- 长期避用表达：...

这部分只接入文案生成，不干预 DAG 调度本身。

## 13. 单图协作与局部重跑

### 13.1 单图详情读取

`src/app/api/couples/[coupleId]/photos/[photoId]/route.ts`

返回：

- `latestRun`
- `captionVariants`
- `layoutVariants`

这说明前台单图工作台消费的不是“原始模型结果”，而是“主字段 + 已筛选好的变体结果”。

### 13.2 选择某个变体

同一接口的 `PATCH` 支持：

- 选择某个 caption variant
- 选择某个 layout variant
- 手动写入 `userCaption`
- 手动写入 `aiLayout`
- 记录 `momentContext` / `momentPromptAnswer`

一旦用户手动写文案，会把 `selectedCaptionSource` 标成 `MANUAL`；如果重新选 AI variant，则标回 `AI`。

### 13.3 局部重跑

`src/app/api/couples/[coupleId]/photos/[photoId]/retry/route.ts`

支持 3 种 scope：

- `FULL`
- `CAPTION_ONLY`
- `LAYOUT_ONLY`

映射到 triggerType：

- `FULL` -> `MANUAL_RETRY`
- `CAPTION_ONLY` -> `CAPTION_REGEN`
- `LAYOUT_ONLY` -> `LAYOUT_REGEN`

虽然底层目前仍复用 `processPhoto(...)` 整条主链，但产品语义上已经把它们区分为“整图重试”和“局部再生成”。

### 13.4 协助提示接口

`src/app/api/couples/[coupleId]/photos/[photoId]/assist/route.ts`

这里不是再调用模型，而是用本地规则给出协助提示：

- 有 chapter 时走 `buildChapterAwareSuggestions(...)`
- 无 chapter 时走 `buildUngroupedSuggestions(...)`

这代表当前产品已经把“AI 协作体验”一部分转移到了轻量规则层，而不是所有事情都回到模型请求。

## 14. 可观测性与排障

### 14.1 后台运行页

`src/app/(dashboard)/pipeline/page.tsx`

当前可查看：

- 运行状态
- triggerType
- attemptNumber
- summary
- totalTokens
- totalCost
- duration
- errorCode
- photoStatus
- processingError
- `nodeResults` 原始 JSON

### 14.2 运行详情 API

- 列表：`src/app/api/couples/[coupleId]/runs/route.ts`
- 详情：`src/app/api/couples/[coupleId]/runs/[runId]/route.ts`

这两层把运行记录暴露为可筛选、可定位的后台视图，而不需要直接查数据库。

### 14.3 失败保护

当前系统至少做了这些保护：

- 节点超时
- 节点重试
- 依赖失败后下游跳过
- 低置信度时本地保守文案
- 没有视觉模型时保底元数据分析
- `DEGRADED` 状态允许照片保持 `READY`
- 重试前用 `buildRetryGuard(...)` 阻止并发重跑

## 15. 当前实现与旧文档的差异

旧设计里最明显的偏差有这些：

1. 不再是“固定 Claude Vision + 固定 DeepSeek 文案”的单一路由。
2. 文案节点已演进为多供应商回退链，而不是单模型调用。
3. 编排结果不只写回 `Photo`，还会维护 `PhotoAIVariant` 和 `PipelineRun`。
4. 运行状态不再只有成功/失败，而是有 `DEGRADED` 这个中间层。
5. 单图 AI 不再是唯一主舞台，章节叙事和本地协助提示已经成为上层体验的一部分。

## 16. 当前边界与后续演进点

### 16.1 当前边界

当前 Agent 编排仍然有这些明确边界：

- DAG 是静态定义，不能动态插拔节点
- Layout 和 Timeline 仍主要走 DeepSeek 单供应商
- TimelineBuilder 产出建议，但未在主链中自动写入 `Milestone`
- 局部重跑在产品语义上已区分，但执行层还没有真正缩小到“只跑某个节点子图”
- 成本统计对 OpenAI/Qwen 仍未精确核价，当前 `cost` 多为 `0` 或估算值

### 16.2 推荐演进方向

如果后续继续增强这条链，优先级建议如下：

1. 把局部重跑真正下沉为子图执行，而不是再次调用完整 `processPhoto(...)`
2. 给不同错误类型建立更细的 retry policy
3. 为 OpenAI/Qwen 补真实成本换算
4. 为 TimelineBuilder 增加明确的“建议审核 -> 落里程碑”闭环
5. 在 `PipelineRun` 中补充模型名与供应商字段，便于横向对比稳定性

## 17. 总结

当前项目里的 Agent 编排，本质上是一套“面向照片内容生成的可观测 DAG 工作流”：

- 用固定 DAG 保证流程稳定
- 用多模型路由和本地降级保证结果可用
- 用 `Photo` / `PhotoAIVariant` / `PipelineRun` 三层存储支撑前台协作与后台排障
- 用 `DEGRADED` 和 style memory 把“AI 自动化”拉回到“AI 协作产品”语境

这套设计的重点不是做一个抽象的多 Agent 框架，而是让真实的照片生成链路在中文场景下稳定、可解释、可回退、可继续编辑。
