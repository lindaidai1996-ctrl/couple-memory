# Phase 3: AI Agent Pipeline 引擎

> 返回: [主计划](./2026-05-14-couple-memory-mvp.md)
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

---

### Task 15: DAG Pipeline Engine — 核心类型 + 拓扑排序

**Files:**
- Create: `src/lib/agents/engine/types.ts`
- Create: `src/lib/agents/engine/topological-sort.ts`

- [ ] **Step 1: 定义核心类型**

```typescript
// src/lib/agents/engine/types.ts
export interface Agent {
  id: string
  execute(input: PipelineInput, depOutputs: Record<string, any>): Promise<AgentOutput>
}

export interface DAGNode {
  id: string
  agent: Agent
  dependencies: string[]
}

export interface PipelineInput {
  photoId: string
  photoUrl: string
  exif: Record<string, any> | null
  width: number
  height: number
  locationName: string | null
}

export interface AgentOutput {
  data: any
  tokens: number
  cost: number
}

export interface NodeResult {
  nodeId: string
  status: 'COMPLETED' | 'FAILED' | 'SKIPPED'
  output?: any
  error?: string
  duration: number
  tokens: number
  cost: number
  retryCount: number
}

export interface PipelineResult {
  status: 'COMPLETED' | 'FAILED'
  nodeResults: Record<string, NodeResult>
  totalTokens: number
  totalCost: number
  duration: number
}
```

- [ ] **Step 2: 实现 Kahn's Algorithm 拓扑排序**

```typescript
// src/lib/agents/engine/topological-sort.ts
import type { DAGNode } from './types'

export function topologicalSort(nodes: DAGNode[]): DAGNode[][] {
  const inDegree = new Map<string, number>()
  const nodeMap = new Map<string, DAGNode>()
  const adjacency = new Map<string, string[]>()

  for (const node of nodes) {
    nodeMap.set(node.id, node)
    inDegree.set(node.id, node.dependencies.length)
    for (const dep of node.dependencies) {
      const edges = adjacency.get(dep) || []
      edges.push(node.id)
      adjacency.set(dep, edges)
    }
  }

  const levels: DAGNode[][] = []
  let queue = nodes.filter(n => inDegree.get(n.id) === 0)

  while (queue.length > 0) {
    levels.push(queue)
    const nextQueue: DAGNode[] = []
    for (const node of queue) {
      for (const neighbor of adjacency.get(node.id) || []) {
        const newDegree = (inDegree.get(neighbor) || 0) - 1
        inDegree.set(neighbor, newDegree)
        if (newDegree === 0) {
          nextQueue.push(nodeMap.get(neighbor)!)
        }
      }
    }
    queue = nextQueue
  }

  return levels
}
```

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat: add DAG engine types and topological sort"
```

---

### Task 16: DAG Pipeline Engine — 执行器

**Files:**
- Create: `src/lib/agents/engine/executor.ts`
- Create: `src/lib/agents/engine/index.ts`

- [ ] **Step 1: 实现执行器（并行调度 + 超时 + 重试）**

```typescript
// src/lib/agents/engine/executor.ts
import type { DAGNode, PipelineInput, NodeResult, PipelineResult } from './types'
import { topologicalSort } from './topological-sort'

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms)
  )
  return Promise.race([promise, timeout])
}

async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number
): Promise<{ result: T; retryCount: number }> {
  let retryCount = 0
  while (true) {
    try {
      const result = await fn()
      return { result, retryCount }
    } catch (err) {
      if (retryCount >= maxRetries) throw err
      retryCount++
      await new Promise(r => setTimeout(r, 1000 * retryCount))
    }
  }
}

async function executeNode(
  node: DAGNode,
  results: Map<string, NodeResult>,
  input: PipelineInput
): Promise<NodeResult> {
  for (const depId of node.dependencies) {
    if (results.get(depId)?.status !== 'COMPLETED') {
      return {
        nodeId: node.id, status: 'SKIPPED',
        duration: 0, tokens: 0, cost: 0, retryCount: 0,
      }
    }
  }

  const depOutputs: Record<string, any> = {}
  for (const depId of node.dependencies) {
    depOutputs[depId] = results.get(depId)?.output
  }

  const start = Date.now()
  try {
    const { result, retryCount } = await withRetry(
      () => withTimeout(node.agent.execute(input, depOutputs), 30_000),
      2
    )
    return {
      nodeId: node.id,
      status: 'COMPLETED',
      output: result.data,
      duration: Date.now() - start,
      tokens: result.tokens,
      cost: result.cost,
      retryCount,
    }
  } catch (err: any) {
    return {
      nodeId: node.id,
      status: 'FAILED',
      error: err.message,
      duration: Date.now() - start,
      tokens: 0, cost: 0, retryCount: 2,
    }
  }
}

export async function executePipeline(
  nodes: DAGNode[],
  input: PipelineInput
): Promise<PipelineResult> {
  const levels = topologicalSort(nodes)
  const results = new Map<string, NodeResult>()
  const start = Date.now()

  for (const level of levels) {
    const levelResults = await Promise.all(
      level.map(node => executeNode(node, results, input))
    )
    for (const r of levelResults) {
      results.set(r.nodeId, r)
    }
  }

  const allResults = Object.fromEntries(results)
  const hasFailed = [...results.values()].some(r => r.status === 'FAILED')

  return {
    status: hasFailed ? 'FAILED' : 'COMPLETED',
    nodeResults: allResults,
    totalTokens: [...results.values()].reduce((s, r) => s + r.tokens, 0),
    totalCost: [...results.values()].reduce((s, r) => s + r.cost, 0),
    duration: Date.now() - start,
  }
}
```

- [ ] **Step 2: 导出引擎模块**

```typescript
// src/lib/agents/engine/index.ts
export { executePipeline } from './executor'
export { topologicalSort } from './topological-sort'
export type * from './types'
```

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat: add DAG executor with parallel scheduling, timeout and retry"
```

---

### Task 17: PhotoAnalyzer Agent (Claude Vision)

**Files:**
- Create: `src/lib/agents/photo-analyzer.ts`

- [ ] **Step 1: 实现 Claude Vision 图片分析**

```typescript
// src/lib/agents/photo-analyzer.ts
import type { Agent, PipelineInput, AgentOutput } from './engine/types'

export const photoAnalyzer: Agent = {
  id: 'photoAnalyzer',
  async execute(input: PipelineInput): Promise<AgentOutput> {
    const contextParts: string[] = []
    if (input.locationName) contextParts.push(`地点：${input.locationName}`)
    if (input.exif?.takenAt) contextParts.push(`时间：${input.exif.takenAt}`)
    if (input.exif?.cameraMake) contextParts.push(`相机：${input.exif.cameraMake} ${input.exif.cameraModel || ''}`)

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.CLAUDE_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'url', url: input.photoUrl } },
            {
              type: 'text',
              text: `你是一位专业摄影师兼情感分析师。请分析这张情侣照片，以 JSON 格式输出：
{
  "scene": "场景描述，20-50字",
  "mood": "情绪氛围，如温馨浪漫、活泼欢快",
  "composition": "构图方式，如三分法、对称、引导线",
  "colorTone": "色调分析，如暖色调、冷色调",
  "subjects": ["主体1", "主体2"],
  "confidence": 0.0-1.0
}
${contextParts.length ? `\n拍摄信息：${contextParts.join('，')}` : ''}
只输出 JSON。`,
            },
          ],
        }],
      }),
    })

    const data = await response.json()
    const text = data.content[0].text
    const tokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0)

    return {
      data: JSON.parse(text),
      tokens,
      cost: tokens * 0.000015,
    }
  },
}
```

- [ ] **Step 2: Commit**

```bash
git add . && git commit -m "feat: add PhotoAnalyzer agent with Claude Vision"
```

---

### Task 18: CaptionWriter + LayoutAdvisor + TimelineBuilder Agents

**Files:**
- Create: `src/lib/agents/caption-writer.ts`
- Create: `src/lib/agents/layout-advisor.ts`
- Create: `src/lib/agents/timeline-builder.ts`
- Create: `src/lib/agents/deepseek-client.ts`

- [ ] **Step 1: 封装 DeepSeek 调用客户端**

```typescript
// src/lib/agents/deepseek-client.ts
export async function callDeepSeek(
  systemPrompt: string,
  userPrompt: string
): Promise<{ text: string; tokens: number; cost: number }> {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    }),
  })

  const data = await response.json()
  const text = data.choices[0].message.content
  const tokens = (data.usage?.total_tokens || 0)

  return { text, tokens, cost: tokens * 0.000002 }
}
```

- [ ] **Step 2: 实现 CaptionWriter**

```typescript
// src/lib/agents/caption-writer.ts
import type { Agent, PipelineInput, AgentOutput } from './engine/types'
import { callDeepSeek } from './deepseek-client'

export const captionWriter: Agent = {
  id: 'captionWriter',
  async execute(input: PipelineInput, depOutputs: Record<string, any>): Promise<AgentOutput> {
    const analysis = depOutputs.photoAnalyzer

    const systemPrompt = `你是一位擅长情感表达的文案撰写者。根据照片分析结果，为情侣照片生成温暖走心的文案。
风格选择：romantic（浪漫絮语）、poetic（诗意短句）、diary（日记体）、photography-note（摄影手记）。
根据照片情绪自动选择最合适的风格。以 JSON 输出：{"caption":"文案50-150字","keywords":["关键词"],"style":"风格"}`

    const userPrompt = `照片分析：${JSON.stringify(analysis)}
地点：${input.locationName || '未知'}
时间：${input.exif?.takenAt || '未知'}`

    const { text, tokens, cost } = await callDeepSeek(systemPrompt, userPrompt)
    return { data: JSON.parse(text), tokens, cost }
  },
}
```

- [ ] **Step 3: 实现 LayoutAdvisor**

```typescript
// src/lib/agents/layout-advisor.ts
import type { Agent, PipelineInput, AgentOutput } from './engine/types'
import { callDeepSeek } from './deepseek-client'

export const layoutAdvisor: Agent = {
  id: 'layoutAdvisor',
  async execute(input: PipelineInput, depOutputs: Record<string, any>): Promise<AgentOutput> {
    const analysis = depOutputs.photoAnalyzer
    const aspectRatio = input.width && input.height ? input.width / input.height : 1

    const systemPrompt = `你是一位排版设计师。根据照片特征推荐最佳展示模板。
可选模板：
- cinema-wide：宽幅电影感（适合宽高比>1.5的风景照）
- side-by-side：图文并排（适合有故事的照片）
- portrait-hero：竖构图大图（适合宽高比<0.8的人像）
- grid-square：方格组合（适合1:1比例）
- story-card：卡片式（通用）
以 JSON 输出：{"layout":"模板名","reason":"推荐理由","alternatives":["备选"]}`

    const userPrompt = `照片分析：${JSON.stringify(analysis)}
宽高比：${aspectRatio.toFixed(2)}（${input.width}x${input.height}）`

    const { text, tokens, cost } = await callDeepSeek(systemPrompt, userPrompt)
    return { data: JSON.parse(text), tokens, cost }
  },
}
```

- [ ] **Step 4: 实现 TimelineBuilder**

```typescript
// src/lib/agents/timeline-builder.ts
import type { Agent, PipelineInput, AgentOutput } from './engine/types'
import { callDeepSeek } from './deepseek-client'
import { prisma } from '@/lib/prisma'

export const timelineBuilder: Agent = {
  id: 'timelineBuilder',
  async execute(input: PipelineInput, depOutputs: Record<string, any>): Promise<AgentOutput> {
    const analysis = depOutputs.photoAnalyzer

    // 获取已有里程碑
    const photo = await prisma.photo.findUnique({
      where: { id: input.photoId },
      include: { album: true },
    })
    const existingMilestones = await prisma.milestone.findMany({
      where: { coupleId: photo!.album.coupleId },
      orderBy: { date: 'desc' },
      take: 20,
    })

    const systemPrompt = `你是一位时间轴策展人。判断这张照片是否值得创建新的里程碑。
规则：新地点首次出现→创建；与上一个里程碑间隔>30天→考虑创建；已有同地点同时段→不创建。
以 JSON 输出：{"shouldCreateMilestone":true/false,"milestone":{"title":"标题","description":"描述","date":"ISO日期","locationName":"地点"},"reason":"理由"}`

    const userPrompt = `照片分析：${JSON.stringify(analysis)}
地点：${input.locationName || '未知'}
时间：${input.exif?.takenAt || '未知'}
已有里程碑：${JSON.stringify(existingMilestones.map(m => ({ title: m.title, date: m.date, location: m.locationName })))}`

    const { text, tokens, cost } = await callDeepSeek(systemPrompt, userPrompt)
    return { data: JSON.parse(text), tokens, cost }
  },
}
```

- [ ] **Step 5: Commit**

```bash
git add . && git commit -m "feat: add CaptionWriter, LayoutAdvisor and TimelineBuilder agents"
```

---

### Task 19: Pipeline 注册 + 集成到 processPhoto

**Files:**
- Create: `src/lib/agents/pipeline.ts`
- Modify: `src/lib/pipeline/process-photo.ts`

- [ ] **Step 1: 定义 DAG 并组装 Pipeline**

```typescript
// src/lib/agents/pipeline.ts
import { executePipeline } from './engine'
import { photoAnalyzer } from './photo-analyzer'
import { captionWriter } from './caption-writer'
import { layoutAdvisor } from './layout-advisor'
import { timelineBuilder } from './timeline-builder'
import { prisma } from '@/lib/prisma'
import type { DAGNode, PipelineInput } from './engine/types'

const dagNodes: DAGNode[] = [
  { id: 'photoAnalyzer', agent: photoAnalyzer, dependencies: [] },
  { id: 'captionWriter', agent: captionWriter, dependencies: ['photoAnalyzer'] },
  { id: 'layoutAdvisor', agent: layoutAdvisor, dependencies: ['photoAnalyzer'] },
  { id: 'timelineBuilder', agent: timelineBuilder, dependencies: ['photoAnalyzer'] },
]

export async function runAIPipeline(input: PipelineInput, coupleId: string) {
  const run = await prisma.pipelineRun.create({
    data: {
      coupleId,
      photoId: input.photoId,
      dag: dagNodes.map(n => ({ id: n.id, dependencies: n.dependencies })),
    },
  })

  const result = await executePipeline(dagNodes, input)

  await prisma.pipelineRun.update({
    where: { id: run.id },
    data: {
      status: result.status === 'COMPLETED' ? 'COMPLETED' : 'FAILED',
      nodeResults: result.nodeResults,
      totalTokens: result.totalTokens,
      totalCost: result.totalCost,
      completedAt: new Date(),
      duration: result.duration,
    },
  })

  return result
}
```

- [ ] **Step 2: 集成到 processPhoto**

在 `src/lib/pipeline/process-photo.ts` 中，Sharp + EXIF 完成后调用 `runAIPipeline`，将 AI 结果写入 Photo 记录。

```typescript
// 在 processPhoto 中追加：
const pipelineResult = await runAIPipeline({
  photoId,
  photoUrl: `https://${cdnDomain}/${sizes.displayPath}`,
  exif,
  width: sizes.width || 0,
  height: sizes.height || 0,
  locationName,
}, coupleId)

if (pipelineResult.status === 'COMPLETED') {
  const caption = pipelineResult.nodeResults.captionWriter?.output
  const layout = pipelineResult.nodeResults.layoutAdvisor?.output
  const analysis = pipelineResult.nodeResults.photoAnalyzer?.output
  const timeline = pipelineResult.nodeResults.timelineBuilder?.output

  await prisma.photo.update({
    where: { id: photoId },
    data: {
      aiCaption: caption?.caption,
      aiKeywords: caption?.keywords || [],
      aiLayout: layout?.layout || 'side-by-side',
      aiScene: analysis?.scene,
      aiMood: analysis?.mood,
      aiComposition: analysis?.composition,
      aiColorTone: analysis?.colorTone,
      status: 'READY',
    },
  })

  // 创建里程碑（如果 TimelineBuilder 建议）
  if (timeline?.shouldCreateMilestone && timeline.milestone) {
    const photo = await prisma.photo.findUnique({
      where: { id: photoId },
      include: { album: true },
    })
    await prisma.milestone.create({
      data: {
        coupleId: photo!.album.coupleId,
        title: timeline.milestone.title,
        description: timeline.milestone.description,
        date: new Date(timeline.milestone.date),
        locationName: timeline.milestone.locationName,
        photoId,
        isAutoGenerated: true,
      },
    })
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat: integrate AI pipeline into photo processing, save results to DB"
```

---

### Task 20: DeepSeek 调用工具函数

**Files:**
- Create: `src/lib/agents/tools/season-context.ts`
- Create: `src/lib/agents/tools/layout-templates.ts`

- [ ] **Step 1: 实现 Agent Tools**

```typescript
// src/lib/agents/tools/season-context.ts
export function getSeasonContext(date: Date | null): string {
  if (!date) return ''
  const month = date.getMonth() + 1
  const seasons: Record<number, string> = {
    1: '冬季·大寒', 2: '冬末·立春', 3: '春季·惊蛰',
    4: '春季·清明', 5: '初夏·立夏', 6: '夏季·芒种',
    7: '盛夏·小暑', 8: '夏末·立秋', 9: '秋季·白露',
    10: '秋季·寒露', 11: '冬季·立冬', 12: '冬季·大雪',
  }
  return seasons[month] || ''
}

// src/lib/agents/tools/layout-templates.ts
export const LAYOUT_TEMPLATES = {
  'cinema-wide': { name: '宽幅电影感', condition: '宽高比 > 1.5，风景/城市场景' },
  'side-by-side': { name: '图文并排', condition: '任意比例，有故事性的照片' },
  'portrait-hero': { name: '竖构图大图', condition: '宽高比 < 0.8，人像特写' },
  'grid-square': { name: '方格组合', condition: '宽高比接近 1:1' },
  'story-card': { name: '卡片式', condition: '任意比例，适合社交分享' },
} as const
```

- [ ] **Step 2: Commit**

```bash
git add . && git commit -m "feat: add agent tool functions for season context and layout templates"
```
