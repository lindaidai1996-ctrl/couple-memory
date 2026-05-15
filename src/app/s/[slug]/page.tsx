'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'

interface SpaceInfo {
  name: string
  slug: string
  startDate: string | null
  coverPhotoUrl: string | null
  bio: string | null
  theme: string
  daysTogether: number | null
}

export default function PublicHomePage() {
  const { slug } = useParams<{ slug: string }>()
  const [space, setSpace] = useState<SpaceInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(`/api/public/${slug}`)
      .then(res => {
        if (!res.ok) throw new Error()
        return res.json()
      })
      .then(setSpace)
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <LoadingSkeleton />
  if (error || !space) return <NotFound />

  return (
    <div className="relative">
      {/* Hero 封面区域 */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        {space.coverPhotoUrl && (
          <div className="absolute inset-0">
            <img
              src={space.coverPhotoUrl}
              alt=""
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/20 to-film-bg" />
          </div>
        )}

        <motion.div
          className="relative z-10 text-center px-6 max-w-2xl"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <h1
            className="text-4xl md:text-6xl font-bold tracking-tight mb-6"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {space.name}
          </h1>

          {space.daysTogether !== null && (
            <motion.div
              className="mb-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              <span className="text-film-accent-light font-medium tracking-widest text-sm uppercase">
                在一起
              </span>
              <p
                className="text-5xl md:text-7xl font-bold text-film-accent-light mt-2"
                style={{ fontFamily: 'var(--font-latin)' }}
              >
                {space.daysTogether}
              </p>
              <span className="text-film-muted text-sm tracking-widest">
                天
              </span>
            </motion.div>
          )}

          {space.bio && (
            <motion.p
              className="text-film-muted text-lg leading-relaxed max-w-md mx-auto"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8, duration: 0.8 }}
            >
              {space.bio}
            </motion.p>
          )}
        </motion.div>

        {/* 向下滚动提示 */}
        <motion.div
          className="absolute bottom-10 z-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
        >
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="text-film-muted"
            >
              <path d="M12 5v14M5 12l7 7 7-7" />
            </svg>
          </motion.div>
        </motion.div>
      </section>

      {/* 导航入口 */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <NavCard
              href={`/s/${slug}/photos`}
              title="照片"
              subtitle="我们拍下的每一帧"
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="m21 15-5-5L5 21" />
                </svg>
              }
            />
            <NavCard
              href={`/s/${slug}/timeline`}
              title="时间轴"
              subtitle="属于我们的每一个节点"
              icon={
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="12" y1="2" x2="12" y2="22" />
                  <circle cx="12" cy="6" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="12" cy="18" r="2" />
                </svg>
              }
            />
          </motion.div>
        </div>
      </section>

      {/* 页脚 */}
      <footer className="border-t border-film-surface py-12 px-6 text-center">
        <p className="text-film-muted text-sm">
          {space.name} · Couple Memory
        </p>
      </footer>
    </div>
  )
}

function NavCard({
  href,
  title,
  subtitle,
  icon,
}: {
  href: string
  title: string
  subtitle: string
  icon: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className="group block bg-film-surface rounded-[var(--radius-lg)] p-8
        border border-transparent hover:border-film-accent/30 transition-all duration-300"
    >
      <div className="text-film-accent mb-4 group-hover:text-film-accent-light transition-colors">
        {icon}
      </div>
      <h3
        className="text-xl font-bold mb-2 group-hover:text-film-accent-light transition-colors"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {title}
      </h3>
      <p className="text-film-muted text-sm">{subtitle}</p>
    </Link>
  )
}

function LoadingSkeleton() {
  return (
    <div className="h-screen flex items-center justify-center">
      <motion.div
        className="w-8 h-8 border-2 border-film-accent border-t-transparent rounded-full"
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
      />
    </div>
  )
}

function NotFound() {
  return (
    <div className="h-screen flex flex-col items-center justify-center px-6 text-center">
      <h1
        className="text-3xl font-bold mb-4"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        页面不存在
      </h1>
      <p className="text-film-muted mb-8">
        这个空间可能未公开，或链接已失效
      </p>
      <Link
        href="/"
        className="px-6 py-3 bg-film-accent text-film-text rounded-[var(--radius-md)]
          hover:bg-film-accent-light transition-colors text-sm font-medium"
      >
        返回首页
      </Link>
    </div>
  )
}
