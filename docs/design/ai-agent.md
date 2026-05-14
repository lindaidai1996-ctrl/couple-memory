# AI Agent 架构设计

> 本文档详述 DAG Pipeline Engine 和 4 个专职 Agent 的设计。这是项目的核心技术亮点。
>
> 相关文档：[总览](./README.md) · [技术架构](./architecture.md) · [图片处理管道](./image-pipeline.md) · [数据库设计](./database.md)

## 整体编排概览

### 编排方式：代码编排（非 LLM 编排）

Agent 之间的依赖关系是固定的 DAG（有向无环图），不需要 LLM 动态决策路由。采用自建轻量级 DAG 引擎，代码约 300 行，零外部依赖。

**为什么不用 LangChain / LlamaIndex**：
- 我们的 Agent 关系是静态的（PhotoAnalyzer → 3 个下游 Agent），不需要动态路由
- 这些框架引入大量不需要的依赖，增加包体积和维护成本
- 自建引擎逻辑透明，面试时能完整讲清楚每一行代码的作用
- `agents/engine/` 目录保持零外部依赖，未来可独立发布为 npm 包

### DAG 依赖关系

```
Level 0:  ┌──────────────────┐
          │  PhotoAnalyzer   │  Claude Vision
          │  (照片分析)       │
          └────────┬─────────┘
                   │
     ┌─────────────┼─────────────┐
     │             │             │
     ▼             ▼             ▼
Level 1: ┌──────────┐ ┌──────────┐ ┌──────────────┐
         │Caption   │ │Layout    │ │Timeline      │
         │Writer    │ │Advisor   │ │Builder       │  全部 DeepSeek
         │(文案生成)│ │(排版建议)│ │(时间轴构建)  │
         └──────────┘ └──────────┘ └──────────────┘
```

- Level 0 和 Level 1 之间是串行关系（下游依赖上游的分析结果）
- Level 1 的 3 个 Agent 之间无依赖，**并行执行**

## DAG Pipeline Engine 设计

### 核心概念

```typescript
interface DAGNode {
  id: string                    // 节点标识，如 "photoAnalyzer"
  agent: Agent                  // Agent 实例
  dependencies: string[]        // 依赖的节点 ID 列表
}

interface DAGDefinition {
  nodes: DAGNode[]
}

interface NodeResult {
  nodeId: string
  status: 'COMPLETED' | 'FAILED' | 'SKIPPED'
  output?: any                  // Agent 输出
  error?: string                // 错误信息
  duration: number              // 耗时（ms）
  tokens: number                // Token 消耗
  cost: number                  // 费用（元）
  retryCount: number            // 重试次数
}
```

### 拓扑排序：Kahn's Algorithm

将 DAG 节点按依赖关系排成层级，确保执行顺序正确：

```typescript
function topologicalSort(nodes: DAGNode[]): DAGNode[][] {
  // 1. 计算每个节点的入度
  // 2. 入度为 0 的节点作为第一层
  // 3. 移除第一层节点的出边，产生新的入度为 0 的节点作为下一层
  // 4. 重复直到所有节点都被分配到某一层
  // 返回：[[Level0 节点], [Level1 节点], ...]
}
```

对于当前的 DAG：
- Level 0: `[photoAnalyzer]` — 入度 0
- Level 1: `[captionWriter, layoutAdvisor, timelineBuilder]` — 入度 1（依赖 photoAnalyzer）

### 并行调度

```typescript
async function executePipeline(dag: DAGDefinition, input: PipelineInput): Promise<PipelineResult> {
  const levels = topologicalSort(dag.nodes)
  const results: Map<string, NodeResult> = new Map()

  for (const level of levels) {
    // 同层级的节点并行执行
    const levelResults = await Promise.all(
      level.map(node => executeNode(node, results, input))
    )
    levelResults.forEach(r => results.set(r.nodeId, r))
  }

  return aggregateResults(results)
}
```

### 节点执行：超时与重试

```typescript
async function executeNode(
  node: DAGNode,
  previousResults: Map<string, NodeResult>,
  input: PipelineInput
): Promise<NodeResult> {
  // 1. 检查依赖是否全部成功
  for (const depId of node.dependencies) {
    if (previousResults.get(depId)?.status !== 'COMPLETED') {
      return { nodeId: node.id, status: 'SKIPPED', ... }
    }
  }

  // 2. 收集依赖节点的输出作为当前节点的输入
  const depOutputs = collectDependencyOutputs(node, previousResults)

  // 3. 带超时和重试的执行
  return withRetry(
    () => withTimeout(node.agent.execute(input, depOutputs), 30_000),
    { maxRetries: 2, backoff: 'exponential' }  // 1s, 2s
  )
}
```

**超时策略**：每个节点 30 秒超时。AI API 调用通常 5-15 秒完成，30 秒留足余量。

**重试策略**：最多重试 2 次，指数退避（1s → 2s）。仅对可重试错误（网络超时、API 限流）重试，对不可重试错误（参数错误、模型拒绝）直接失败。

### 错误处理

```
Node 执行 → 成功 → status: COMPLETED
         → 失败 → 重试（最多2次）
                   → 仍失败 → status: FAILED
                               → 下游节点全部 status: SKIPPED
                               → 不阻塞用户（照片 status 标记为 FAILED，可重试）
```

关键原则：**Agent 失败不阻塞用户操作**。照片仍然可以展示（只是没有 AI 生成的文案/排版），用户可以手动填写文案、选择排版。

## 4 个 Agent 详细设计

### Agent 1: PhotoAnalyzer — 照片分析

| 属性 | 值 |
|------|-----|
| 模型 | Claude Vision (claude-sonnet) |
| 职责 | 分析照片内容，提取视觉特征 |
| 输入 | 照片 URL + EXIF 数据 |
| 输出 | 场景、情绪、构图、色调分析 |

**为什么用 Claude Vision**：图片理解能力强，能准确识别场景、人物情绪、构图方式和色彩倾向。DeepSeek 的视觉能力相对较弱。

**输出数据结构**：

```typescript
interface PhotoAnalysis {
  scene: string          // 场景描述，如 "海边日落，两人牵手漫步沙滩"
  mood: string           // 情绪氛围，如 "温馨浪漫、宁静幸福"
  composition: string    // 构图分析，如 "引导线构图，视线从前景延伸至远方"
  colorTone: string      // 色调分析，如 "暖色调，金色夕阳与蓝色海水对比"
  subjects: string[]     // 主体识别，如 ["人物", "海滩", "夕阳"]
  confidence: number     // 分析置信度 0-1
}
```

**Tools**：

| Tool | 功能 | 说明 |
|------|------|------|
| extractExif | 提取 EXIF 信息 | 从预处理结果中读取（非实时解析） |
| reverseGeocode | GPS → 中文地名 | 调用高德地图 API |

**Prompt 策略**：
- System Prompt 设定角色为"专业摄影师 + 情感分析师"
- 要求以中文输出，使用摄影术语
- 提供 EXIF 信息（地点、时间、相机参数）作为辅助上下文
- 输出格式为结构化 JSON

### Agent 2: CaptionWriter — 文案生成

| 属性 | 值 |
|------|-----|
| 模型 | DeepSeek (deepseek-chat) |
| 职责 | 基于照片分析结果生成浪漫文案 |
| 输入 | PhotoAnalysis + 地点 + 时间 + 风格偏好 |
| 输出 | 文案 + 关键词 |

**为什么用 DeepSeek**：中文文案生成质量高，价格是 Claude 的 1/10 左右。文案生成不需要视觉能力，纯文本任务 DeepSeek 足够。

**输出数据结构**：

```typescript
interface CaptionResult {
  caption: string        // 生成的文案，50-150 字
  keywords: string[]     // 关键词标签，3-5 个
  style: CaptionStyle    // 实际使用的风格
}

type CaptionStyle = 'romantic' | 'poetic' | 'diary' | 'photography-note'
```

**Tools**：

| Tool | 功能 | 说明 |
|------|------|------|
| getSeasonContext | 获取季节上下文 | 根据拍摄时间返回季节、节气等信息 |
| getCaptionStyles | 获取风格模板 | 返回可用的文案风格和示例 |

**文案风格说明**：

| 风格 | 描述 | 示例 |
|------|------|------|
| romantic | 浪漫絮语 | "在厦门的海边，夕阳把你的侧脸染成了金色..." |
| poetic | 诗意短句 | "盐风拂过，浪声低语，这一刻想私藏进口袋。" |
| diary | 日记体 | "2024.08.15 厦门。今天终于带她看了心心念念的日落..." |
| photography-note | 摄影手记 | "35mm f/1.8，逆光。等了二十分钟才等到这个光线..." |

**Prompt 策略**：
- 根据 mood 选择基础语调
- 融入地点和季节信息，增加场景感
- 控制字数在 50-150 字，不要过长
- 风格要自然，避免"朋友圈文案"的刻意感

### Agent 3: LayoutAdvisor — 排版建议

| 属性 | 值 |
|------|-----|
| 模型 | DeepSeek (deepseek-chat) |
| 职责 | 根据照片特征推荐最佳排版模板 |
| 输入 | PhotoAnalysis + 宽高比 |
| 输出 | 推荐模板 + 理由 |

**输出数据结构**：

```typescript
interface LayoutResult {
  layout: LayoutTemplate     // 推荐的排版模板标识
  reason: string             // 推荐理由，如 "宽幅风景照适合电影感横幅展示"
  alternatives: LayoutTemplate[]  // 备选模板（1-2 个）
}

type LayoutTemplate =
  | 'cinema-wide'      // 宽幅电影感
  | 'side-by-side'     // 图文并排
  | 'portrait-hero'    // 竖构图大图
  | 'grid-square'      // 方格组合
  | 'story-card'       // 卡片式
```

**Tools**：

| Tool | 功能 | 说明 |
|------|------|------|
| getLayoutTemplates | 获取模板列表 | 返回所有模板的描述、适用条件和示例 |

**预设布局模板详细设计**：

| 模板 | 适用条件 | 视觉效果 |
|------|---------|---------|
| cinema-wide | 宽高比 > 1.5，风景/城市场景 | 全宽横幅，上下留黑边，电影感 |
| side-by-side | 任意比例，有故事性的照片 | 左图右文或右图左文，博客式叙事 |
| portrait-hero | 宽高比 < 0.8，人像特写 | 大面积展示，文案叠加在图片底部 |
| grid-square | 宽高比接近 1:1，或多张照片 | 方格排列，Instagram 风格 |
| story-card | 任意比例，适合社交分享 | 卡片带阴影，圆角，紧凑布局 |

**Prompt 策略**：
- 提供照片的宽高比数值和构图分析
- 说明每种模板的设计意图和最佳适用场景
- 要求给出推荐理由，便于用户理解

### Agent 4: TimelineBuilder — 时间轴构建

| 属性 | 值 |
|------|-----|
| 模型 | DeepSeek (deepseek-chat) |
| 职责 | 判断是否应创建新的里程碑，构建时间线 |
| 输入 | PhotoAnalysis + 已有里程碑列表 |
| 输出 | 是否创建里程碑 + 里程碑信息 |

**输出数据结构**：

```typescript
interface TimelineResult {
  shouldCreateMilestone: boolean   // 是否需要创建新里程碑
  milestone?: {
    title: string                  // 里程碑标题，如 "第一次去厦门"
    description: string            // 描述
    date: string                   // ISO 日期
    locationName: string           // 地点
  }
  reason: string                   // 决策理由
}
```

**Tools**：

| Tool | 功能 | 说明 |
|------|------|------|
| getExistingMilestones | 获取已有里程碑 | 返回该空间下已有的所有里程碑 |
| detectLocationCluster | 检测地点聚类 | 判断新地点是否与已有地点重复/接近 |

**里程碑创建规则**：
- **新地点**：首次出现的城市/景点 → 创建里程碑
- **时间间隔**：与上一个里程碑间隔 > 30 天的活动 → 考虑创建
- **特殊日期**：节假日、纪念日附近的照片 → 创建里程碑
- **去重**：如果已有同地点同时间段的里程碑 → 不创建
- **频率控制**：避免过密（同一天不超过 1 个里程碑）

**Prompt 策略**：
- 提供已有里程碑列表作为上下文，避免重复
- 明确创建规则，让模型做判断而非盲目创建
- 要求输出决策理由，便于调试

## 执行追踪

每次 Pipeline 执行会创建一条 PipelineRun 记录：

```typescript
// PipelineRun.nodeResults 的 JSON 结构
{
  "photoAnalyzer": {
    "status": "COMPLETED",
    "duration": 8500,        // 8.5 秒
    "tokens": 1200,
    "cost": 0.018,           // ¥0.018
    "retryCount": 0
  },
  "captionWriter": {
    "status": "COMPLETED",
    "duration": 3200,
    "tokens": 800,
    "cost": 0.002,
    "retryCount": 0
  },
  "layoutAdvisor": {
    "status": "COMPLETED",
    "duration": 2100,
    "tokens": 500,
    "cost": 0.001,
    "retryCount": 0
  },
  "timelineBuilder": {
    "status": "COMPLETED",
    "duration": 2800,
    "tokens": 600,
    "cost": 0.001,
    "retryCount": 0
  }
}
```

管理后台可选展示 Pipeline 执行历史，包括：
- 每个 Agent 的执行状态、耗时、Token 消耗
- 总成本统计
- 失败节点的错误信息

## 模型选型与成本估算

### 单张照片处理成本

| Agent | 模型 | 输入 Token | 输出 Token | 预估成本 |
|-------|------|-----------|-----------|---------|
| PhotoAnalyzer | Claude Sonnet | ~1000 (图片+EXIF) | ~200 | ¥0.015-0.02 |
| CaptionWriter | DeepSeek | ~500 | ~300 | ¥0.001-0.002 |
| LayoutAdvisor | DeepSeek | ~400 | ~200 | ¥0.001 |
| TimelineBuilder | DeepSeek | ~600 | ~200 | ¥0.001-0.002 |
| **合计** | | | | **¥0.02-0.03** |

每张照片的 AI 处理成本约 2-3 分钱，100 张照片约 2-3 元。

### 处理时间估算

```
PhotoAnalyzer:    ~8s (Claude Vision 较慢)
                   ↓
Level 1 并行:     ~3s (三个 DeepSeek Agent 同时执行，取最慢的)
                   ↓
总计:             ~11-15s / 张照片
```
