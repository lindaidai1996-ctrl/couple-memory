'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { TimelineView, type TimelineMilestone } from '@/components/timeline-view'

export default function PublicTimelinePage() {
  const { slug } = useParams<{ slug: string }>()
  const [milestones, setMilestones] = useState<TimelineMilestone[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/public/${slug}/timeline`)
      .then(res => res.json())
      .then(data => setMilestones(data.milestones ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  return (
    <div className="min-h-screen px-6 py-12 md:py-20">
      <div className="max-w-4xl mx-auto">
        {/* 顶部导航 */}
        <Link
          href={`/s/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-film-muted hover:text-film-accent-light
            transition-colors mb-10"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          返回
        </Link>

        {/* 标题 */}
        <motion.h1
          className="text-3xl md:text-4xl font-bold mb-12 md:mb-16 text-center"
          style={{ fontFamily: 'var(--font-display)' }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          时间轴
        </motion.h1>

        {loading ? (
          <LoadingSkeleton />
        ) : milestones.length === 0 ? (
          <EmptyState />
        ) : (
          <TimelineView milestones={milestones} />
        )}
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="flex justify-center py-20">
      <motion.div
        className="w-8 h-8 border-2 border-film-accent border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      />
    </div>
  )
}

function EmptyState() {
  return (
    <div className="text-center py-20">
      <p className="text-film-muted text-lg">暂无时间轴记录</p>
    </div>
  )
}
