import type { Agent, PipelineInput, AgentOutput } from './engine/types'
import { callDeepSeek } from './deepseek-client'
import { prisma } from '@/lib/prisma'

export const timelineBuilder: Agent = {
  id: 'timelineBuilder',
  async execute(input: PipelineInput, depOutputs: Record<string, unknown>): Promise<AgentOutput> {
    const analysis = depOutputs.photoAnalyzer

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

    const milestoneSummary = existingMilestones.map(m => ({
      title: m.title, date: m.date, location: m.locationName,
    }))

    const userPrompt = `照片分析：${JSON.stringify(analysis)}
地点：${input.locationName || '未知'}
时间：${input.exif?.takenAt || '未知'}
已有里程碑：${JSON.stringify(milestoneSummary)}`

    const { text, tokens, cost } = await callDeepSeek(systemPrompt, userPrompt)
    return { data: JSON.parse(text), tokens, cost }
  },
}
