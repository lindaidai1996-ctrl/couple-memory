# P1 前端体验实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 P1-9（骨架屏+预加载）、P1-10（错误边界）、P1-11（邀请链接页面）三项前端体验优化

**Architecture:** 基于 Next.js App Router 约定，利用 error.tsx 实现页面级错误边界；骨架屏为独立组件库统一 shimmer 动画；邀请页面是独立路由 + 新增 GET info API 端点

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS 4, Framer Motion, Prisma 7

---

## 文件结构

```
src/
├── components/skeleton/
│   ├── skeleton.tsx                  # 基础 Skeleton 组件
│   ├── photo-grid-skeleton.tsx       # 照片网格骨架
│   ├── album-list-skeleton.tsx       # 相册列表骨架
│   ├── settings-form-skeleton.tsx    # 设置表单骨架（替换现有 SettingsSkeleton）
│   ├── modal-skeleton.tsx            # Modal 内容骨架
│   ├── sidebar-skeleton.tsx          # 侧边栏骨架
│   ├── photo-stream-skeleton.tsx     # 公开页 PhotoStream 骨架
│   ├── timeline-skeleton.tsx         # 公开页 Timeline 骨架
│   └── hero-skeleton.tsx             # 公开首页 Hero 骨架
├── hooks/
│   └── use-image-preload.ts          # IntersectionObserver 图片预加载 hook
├── app/
│   ├── error.tsx                     # 后台通用错误 UI（warm 主题）
│   ├── global-error.tsx              # 根 layout 级别错误兜底
│   ├── s/[slug]/error.tsx            # 公开页面错误 UI（film 主题）
│   └── invite/[code]/
│       └── page.tsx                  # Partner 邀请接受页面
├── app/api/invite/[code]/
│   └── info/route.ts                 # GET /api/invite/[code]/info 端点
```

---

## Task 1: 基础 Skeleton 组件

**Files:**
- Create: `src/components/skeleton/skeleton.tsx`

- [ ] **Step 1: 创建基础 Skeleton 组件**

```tsx
// src/components/skeleton/skeleton.tsx
interface SkeletonProps {
  width?: string | number
  height?: string | number
  radius?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  variant?: 'warm' | 'film'
  className?: string
}

const radiusMap = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
  xl: 'var(--radius-xl)',
  full: '9999px',
} as const

export function Skeleton({
  width,
  height,
  radius = 'md',
  variant = 'warm',
  className = '',
}: SkeletonProps) {
  const gradient = variant === 'warm'
    ? 'linear-gradient(90deg, var(--color-warm-border) 25%, var(--color-warm-sidebar) 50%, var(--color-warm-border) 75%)'
    : 'linear-gradient(90deg, var(--color-film-surface) 25%, #2e2e2e 50%, var(--color-film-surface) 75%)'

  return (
    <div
      className={`animate-shimmer ${className}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: radiusMap[radius],
        backgroundImage: gradient,
        backgroundSize: '200% 100%',
      }}
    />
  )
}
```

- [ ] **Step 2: 在 globals.css 添加 shimmer 动画**

在 `src/app/globals.css` 文件末尾添加：

```css
/* ─── Skeleton shimmer 动画 ─── */
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.animate-shimmer {
  animation: shimmer 1.5s infinite ease-in-out;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/skeleton/skeleton.tsx src/app/globals.css
git commit -m "feat(skeleton): add base Skeleton component with shimmer animation"
```

---

## Task 2: 页面骨架屏组件（warm 主题）

**Files:**
- Create: `src/components/skeleton/photo-grid-skeleton.tsx`
- Create: `src/components/skeleton/album-list-skeleton.tsx`
- Create: `src/components/skeleton/settings-form-skeleton.tsx`
- Create: `src/components/skeleton/modal-skeleton.tsx`
- Create: `src/components/skeleton/sidebar-skeleton.tsx`

- [ ] **Step 1: 照片网格骨架**

```tsx
// src/components/skeleton/photo-grid-skeleton.tsx
import { Skeleton } from './skeleton'

export function PhotoGridSkeleton() {
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Skeleton width={36} height={36} radius="sm" />
        <Skeleton width={128} height={32} radius="md" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="aspect-square w-full" radius="md" />
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 相册列表骨架**

```tsx
// src/components/skeleton/album-list-skeleton.tsx
import { Skeleton } from './skeleton'

export function AlbumListSkeleton() {
  return (
    <div>
      <Skeleton width={160} height={32} radius="md" className="mb-6" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="bg-warm-surface rounded-[var(--radius-lg)] border border-warm-border overflow-hidden"
          >
            <Skeleton className="w-full h-40" radius="sm" />
            <div className="p-4 space-y-2">
              <Skeleton width="60%" height={16} radius="sm" />
              <Skeleton width="30%" height={12} radius="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: 设置表单骨架**

```tsx
// src/components/skeleton/settings-form-skeleton.tsx
import { Skeleton } from './skeleton'

export function SettingsFormSkeleton() {
  return (
    <div className="max-w-2xl">
      <Skeleton width={128} height={32} radius="md" className="mb-6" />
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="bg-warm-surface rounded-[var(--radius-lg)] p-5 border border-warm-border space-y-4"
          >
            <Skeleton width={80} height={16} radius="sm" />
            <Skeleton className="w-full" height={40} radius="md" />
            <Skeleton className="w-full" height={40} radius="md" />
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Modal 内容骨架**

```tsx
// src/components/skeleton/modal-skeleton.tsx
import { Skeleton } from './skeleton'

export function ModalSkeleton() {
  return (
    <div className="flex flex-col md:flex-row gap-6">
      <Skeleton className="w-full md:w-2/3 aspect-[4/3]" radius="lg" />
      <div className="flex-1 space-y-4">
        <Skeleton width="80%" height={20} radius="sm" />
        <Skeleton width="60%" height={14} radius="sm" />
        <Skeleton width="40%" height={14} radius="sm" />
        <Skeleton className="w-full" height={60} radius="md" />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 侧边栏骨架**

```tsx
// src/components/skeleton/sidebar-skeleton.tsx
import { Skeleton } from './skeleton'

export function SidebarSkeleton() {
  return (
    <aside className="w-60 bg-warm-sidebar border-r border-warm-border flex flex-col">
      <div className="px-6 py-5 border-b border-warm-border">
        <Skeleton width={48} height={48} radius="full" />
      </div>
      <div className="px-3 py-4 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="w-full" height={36} radius="md" />
        ))}
      </div>
    </aside>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/skeleton/
git commit -m "feat(skeleton): add warm-theme page skeleton components"
```

---

## Task 3: 页面骨架屏组件（film 主题）

**Files:**
- Create: `src/components/skeleton/photo-stream-skeleton.tsx`
- Create: `src/components/skeleton/timeline-skeleton.tsx`
- Create: `src/components/skeleton/hero-skeleton.tsx`

- [ ] **Step 1: PhotoStream 骨架**

```tsx
// src/components/skeleton/photo-stream-skeleton.tsx
import { Skeleton } from './skeleton'

export function PhotoStreamSkeleton() {
  return (
    <div className="space-y-12 max-w-5xl mx-auto px-4">
      {/* 模拟 cinema-wide 布局 */}
      <Skeleton variant="film" className="w-full aspect-[21/9]" radius="lg" />
      {/* 模拟 grid 布局 */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} variant="film" className="aspect-square w-full" radius="md" />
        ))}
      </div>
      {/* 模拟 side-by-side 布局 */}
      <Skeleton variant="film" className="w-full aspect-[16/9]" radius="lg" />
    </div>
  )
}
```

- [ ] **Step 2: Timeline 骨架**

```tsx
// src/components/skeleton/timeline-skeleton.tsx
import { Skeleton } from './skeleton'

export function TimelineSkeleton() {
  return (
    <div className="relative">
      {/* 中心线 */}
      <div className="absolute top-0 bottom-0 w-px bg-film-accent/20 left-6 md:left-1/2 md:-translate-x-px" />
      <div className="space-y-10 md:space-y-14">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className={`relative flex items-start pl-14 md:pl-0 ${
              i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'
            }`}
          >
            {/* 时间点 */}
            <div className="absolute z-10 w-4 h-4 rounded-full border-2 border-film-muted bg-film-muted/20 top-2 left-[18px] md:left-1/2 md:-translate-x-1/2" />
            <div className="hidden md:block md:w-1/2" />
            <div className="md:w-1/2 md:px-8 w-full">
              <div className="bg-film-surface rounded-[var(--radius-lg)] p-5 border border-film-accent/10 space-y-3">
                <Skeleton variant="film" width="30%" height={12} radius="sm" />
                <Skeleton variant="film" width="70%" height={18} radius="sm" />
                <Skeleton variant="film" width="90%" height={14} radius="sm" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Hero 骨架**

```tsx
// src/components/skeleton/hero-skeleton.tsx
import { Skeleton } from './skeleton'

export function HeroSkeleton() {
  return (
    <section className="relative h-screen flex flex-col items-center justify-center">
      <div className="absolute inset-0 bg-gradient-to-b from-film-surface via-film-bg to-film-bg" />
      <div className="relative z-10 text-center space-y-6">
        <Skeleton variant="film" width={320} height={48} radius="md" className="mx-auto" />
        <Skeleton variant="film" width={240} height={20} radius="sm" className="mx-auto" />
      </div>
    </section>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/skeleton/
git commit -m "feat(skeleton): add film-theme skeleton components for public pages"
```

---

## Task 4: 图片预加载 Hook

**Files:**
- Create: `src/hooks/use-image-preload.ts`

- [ ] **Step 1: 实现 useImagePreload hook**

```ts
// src/hooks/use-image-preload.ts
import { useEffect, useRef, useState } from 'react'

interface UseImagePreloadOptions {
  rootMargin?: string
}

export function useImagePreload(
  src: string | null | undefined,
  { rootMargin = '200px' }: UseImagePreloadOptions = {}
) {
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!src || loaded) return

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          const img = new Image()
          img.onload = () => setLoaded(true)
          img.onerror = () => setLoaded(true)
          img.src = src
          observer.disconnect()
        }
      },
      { rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [src, rootMargin, loaded])

  return { ref, loaded }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/use-image-preload.ts
git commit -m "feat(preload): add useImagePreload hook with IntersectionObserver"
```

---

## Task 5: 集成骨架屏到现有页面

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx` — 替换 SettingsSkeleton
- Modify: `src/app/(dashboard)/albums/[albumId]/page.tsx` — 替换 DetailSkeleton

- [ ] **Step 1: 替换 Settings 页面骨架屏**

在 `src/app/(dashboard)/settings/page.tsx` 中：
1. 在文件顶部添加 import：`import { SettingsFormSkeleton } from '@/components/skeleton/settings-form-skeleton'`
2. 将 `if (loading)` 处的 `<SettingsSkeleton />` 改为 `<SettingsFormSkeleton />`
3. 删除文件底部的 `function SettingsSkeleton()` 整个函数定义（约 545-563 行）

- [ ] **Step 2: 替换 AlbumDetail 页面骨架屏**

在 `src/app/(dashboard)/albums/[albumId]/page.tsx` 中：
1. 在文件顶部添加 import：`import { PhotoGridSkeleton } from '@/components/skeleton/photo-grid-skeleton'`
2. 将 `if (loading) return <DetailSkeleton />` 改为 `if (loading) return <PhotoGridSkeleton />`
3. 删除文件底部的 `function DetailSkeleton()` 整个函数定义（约 452-466 行）

- [ ] **Step 3: Commit**

```bash
git add src/app/(dashboard)/settings/page.tsx src/app/(dashboard)/albums/[albumId]/page.tsx
git commit -m "refactor: replace inline skeletons with shared skeleton components"
```

---

## Task 6: 错误边界 — 后台 error.tsx

**Files:**
- Create: `src/app/error.tsx`

- [ ] **Step 1: 创建后台错误页面**

```tsx
// src/app/error.tsx
'use client'

import { useRouter } from 'next/navigation'

export default function DashboardError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <p
        className="text-[72px] md:text-[96px] font-bold text-warm-border select-none leading-none mb-4"
        style={{ fontFamily: 'var(--font-latin)' }}
      >
        Oops
      </p>
      <p className="text-base text-warm-text mb-2">页面开小差了</p>
      <p className="text-sm text-warm-muted mb-8">别担心，刷新一下通常就好了</p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 text-sm font-medium text-white bg-warm-accent
            rounded-[var(--radius-md)] hover:bg-warm-accent-hover transition-colors"
        >
          刷新页面
        </button>
        <button
          onClick={() => router.push('/')}
          className="px-5 py-2.5 text-sm font-medium text-warm-muted border border-warm-border
            rounded-[var(--radius-md)] hover:bg-warm-bg transition-colors"
        >
          返回首页
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/error.tsx
git commit -m "feat(error): add dashboard error boundary page (warm theme)"
```

---

## Task 7: 错误边界 — 公开页 error.tsx

**Files:**
- Create: `src/app/s/[slug]/error.tsx`

- [ ] **Step 1: 创建公开页错误页面**

```tsx
// src/app/s/[slug]/error.tsx
'use client'

import { useRouter, useParams } from 'next/navigation'

export default function PublicError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <p
        className="text-[72px] md:text-[96px] font-bold select-none leading-none mb-4"
        style={{ fontFamily: 'var(--font-latin)', color: '#3a3a3a' }}
      >
        Oops
      </p>
      <p className="text-base text-film-text mb-2">页面开小差了</p>
      <p className="text-sm text-film-muted mb-8">别担心，刷新一下通常就好了</p>
      <div className="flex items-center gap-3">
        <button
          onClick={reset}
          className="px-5 py-2.5 text-sm font-medium text-film-text bg-film-accent
            rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
        >
          刷新页面
        </button>
        <button
          onClick={() => router.push(`/s/${slug}`)}
          className="px-5 py-2.5 text-sm font-medium text-film-muted border border-film-surface
            rounded-[var(--radius-md)] hover:bg-film-surface transition-colors"
        >
          返回首页
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/s/[slug]/error.tsx
git commit -m "feat(error): add public page error boundary (film theme)"
```

---

## Task 8: 错误边界 — global-error.tsx

**Files:**
- Create: `src/app/global-error.tsx`

- [ ] **Step 1: 创建全局错误兜底**

```tsx
// src/app/global-error.tsx
'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf8f5',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <p style={{ fontSize: '72px', fontWeight: 700, color: '#ede8e3', margin: '0 0 16px' }}>
          Oops
        </p>
        <p style={{ fontSize: '16px', color: '#3d3530', margin: '0 0 8px' }}>
          页面开小差了
        </p>
        <p style={{ fontSize: '14px', color: '#9c8e82', margin: '0 0 32px' }}>
          别担心，刷新一下通常就好了
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#fff',
              background: '#c4956a',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            刷新页面
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#9c8e82',
              background: 'transparent',
              border: '1px solid #ede8e3',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            返回首页
          </button>
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/global-error.tsx
git commit -m "feat(error): add global-error.tsx with inline styles (no external deps)"
```

---

## Task 9: 邀请信息 API 端点

**Files:**
- Create: `src/app/api/invite/[code]/info/route.ts`

- [ ] **Step 1: 创建 GET /api/invite/[code]/info 端点**

```ts
// src/app/api/invite/[code]/info/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params

  const couple = await prisma.couple.findUnique({
    where: { inviteCode: code },
    include: {
      members: {
        where: { role: 'OWNER' },
        include: { user: { select: { name: true, avatar: true } } },
      },
    },
  })

  if (!couple) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  if (couple.inviteExpiresAt && couple.inviteExpiresAt < new Date()) {
    return NextResponse.json(
      {
        error: 'Invite expired',
        coupleName: couple.name,
      },
      { status: 410 }
    )
  }

  const owner = couple.members[0]?.user
  const memberCount = await prisma.coupleUser.count({
    where: { coupleId: couple.id },
  })

  return NextResponse.json({
    coupleName: couple.name,
    ownerName: owner?.name ?? null,
    ownerAvatar: owner?.avatar ?? null,
    expiresAt: couple.inviteExpiresAt?.toISOString() ?? null,
    memberCount,
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/invite/[code]/info/route.ts
git commit -m "feat(api): add GET /api/invite/[code]/info endpoint for invite preview"
```

---

## Task 10: 邀请接受页面

**Files:**
- Create: `src/app/invite/[code]/page.tsx`

- [ ] **Step 1: 创建邀请页面**

```tsx
// src/app/invite/[code]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

interface InviteInfo {
  coupleName: string
  ownerName: string | null
  ownerAvatar: string | null
  expiresAt: string | null
  memberCount: number
}

type PageState =
  | { status: 'loading' }
  | { status: 'ready'; info: InviteInfo }
  | { status: 'error'; code: number; message: string; coupleName?: string }
  | { status: 'accepting' }
  | { status: 'success' }

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  const [state, setState] = useState<PageState>({ status: 'loading' })

  useEffect(() => {
    async function fetchInfo() {
      const res = await fetch(`/api/invite/${code}/info`)
      if (res.ok) {
        const info: InviteInfo = await res.json()
        setState({ status: 'ready', info })
        return
      }
      const data = await res.json()
      if (res.status === 410) {
        setState({ status: 'error', code: 410, message: '邀请已过期', coupleName: data.coupleName })
      } else if (res.status === 404) {
        setState({ status: 'error', code: 404, message: '邀请链接无效' })
      } else {
        setState({ status: 'error', code: res.status, message: '加载失败' })
      }
    }
    fetchInfo()
  }, [code])

  async function handleAccept() {
    setState({ status: 'accepting' })
    const res = await fetch(`/api/invite/${code}/accept`, { method: 'POST' })
    if (res.ok) {
      setState({ status: 'success' })
      setTimeout(() => router.push('/dashboard'), 1500)
      return
    }
    const data = await res.json()
    if (res.status === 401) {
      const callbackUrl = encodeURIComponent(`/invite/${code}`)
      router.push(`/login?callbackUrl=${callbackUrl}`)
      return
    }
    if (res.status === 409) {
      const msg = data.error === 'Already a member' ? '你已经是成员了' : '空间已满员'
      setState({ status: 'error', code: 409, message: msg })
      return
    }
    setState({ status: 'error', code: res.status, message: data.error || '加入失败' })
  }

  function formatExpiry(expiresAt: string | null) {
    if (!expiresAt) return null
    const diff = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diff <= 0) return '即将过期'
    return `邀请将在 ${diff} 天后过期`
  }

  return (
    <div className="min-h-screen bg-film-bg text-film-text film-grain flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-[var(--radius-xl)] p-8 text-center"
        style={{
          backgroundColor: 'var(--color-film-surface)',
          border: '1px solid rgba(139,115,85,0.2)',
        }}
      >
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'ready' && (
          <ReadyState info={state.info} onAccept={handleAccept} formatExpiry={formatExpiry} />
        )}
        {state.status === 'accepting' && <AcceptingState />}
        {state.status === 'success' && <SuccessState />}
        {state.status === 'error' && (
          <ErrorState code={state.code} message={state.message} coupleName={state.coupleName} />
        )}
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-4 py-4">
      <div className="w-16 h-16 rounded-full bg-film-bg animate-pulse mx-auto" />
      <div className="h-4 w-32 bg-film-bg rounded animate-pulse mx-auto" />
    </div>
  )
}

function ReadyState({
  info,
  onAccept,
  formatExpiry,
}: {
  info: InviteInfo
  onAccept: () => void
  formatExpiry: (e: string | null) => string | null
}) {
  const expiry = formatExpiry(info.expiresAt)

  return (
    <>
      {/* 双头像 */}
      <div className="flex items-center justify-center mb-6">
        <div className="w-14 h-14 rounded-full bg-film-accent/20 border-2 border-film-accent/40 flex items-center justify-center overflow-hidden">
          {info.ownerAvatar ? (
            <img src={info.ownerAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-film-accent text-lg font-medium">
              {info.ownerName?.[0] ?? '?'}
            </span>
          )}
        </div>
        <div className="w-14 h-14 rounded-full bg-film-bg border-2 border-film-muted/30 flex items-center justify-center -ml-4">
          <span className="text-film-muted text-lg">?</span>
        </div>
      </div>

      <h1
        className="text-xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {info.coupleName}
      </h1>
      <p className="text-sm text-film-muted mb-6">
        {info.ownerName ?? '对方'}邀请你成为伴侣
      </p>

      <button
        onClick={onAccept}
        className="w-full py-3 text-sm font-medium text-film-text bg-film-accent
          rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
      >
        加入空间
      </button>

      {expiry && (
        <p className="text-xs text-film-muted mt-4">{expiry}</p>
      )}
    </>
  )
}

function AcceptingState() {
  return (
    <div className="py-8">
      <div className="w-8 h-8 border-2 border-film-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-sm text-film-muted">加入中...</p>
    </div>
  )
}

function SuccessState() {
  return (
    <div className="py-8">
      <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p className="text-sm text-film-text">加入成功，正在跳转...</p>
    </div>
  )
}

function ErrorState({
  code,
  message,
  coupleName,
}: {
  code: number
  message: string
  coupleName?: string
}) {
  return (
    <div className="py-4">
      {coupleName && (
        <p className="text-sm text-film-muted mb-2">{coupleName}</p>
      )}
      <p className="text-base text-film-text mb-2">{message}</p>
      <p className="text-xs text-film-muted mb-6">
        {code === 410 && '请联系对方重新发送邀请链接'}
        {code === 404 && '请确认链接是否正确'}
        {code === 409 && ''}
      </p>
      <a
        href="/"
        className="inline-block px-5 py-2.5 text-sm font-medium text-film-muted border border-film-surface
          rounded-[var(--radius-md)] hover:bg-film-surface transition-colors"
      >
        返回首页
      </a>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/invite/[code]/page.tsx
git commit -m "feat(invite): add partner invitation acceptance page"
```

---

## Task 11: 邀请管理 UI 增强（Settings 页面）

**Files:**
- Modify: `src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: 增强邀请伴侣 Section**

在 `src/app/(dashboard)/settings/page.tsx` 中，将现有的"邀请伴侣" Section（约 480-515 行）替换为增强版本：

```tsx
<div className="mt-10 pt-8 border-t border-warm-border">
  <Section title="邀请伴侣">
    <InviteSection couple={couple} onGenerate={handleGenerateInvite} onRegenerate={handleRegenerateInvite} />
  </Section>
</div>
```

在文件末尾添加 `InviteSection` 组件：

```tsx
function InviteSection({
  couple,
  onGenerate,
  onRegenerate,
}: {
  couple: CoupleData
  onGenerate: () => void
  onRegenerate: () => void
}) {
  const [copied, setCopied] = useState(false)

  function handleCopy() {
    const url = `${window.location.origin}/invite/${couple.inviteCode}`
    navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function handleRegenerate() {
    if (!confirm('重新生成将使当前邀请链接立即失效，确定继续？')) return
    onRegenerate()
  }

  if (!couple.inviteCode) {
    return (
      <button
        type="button"
        onClick={onGenerate}
        className="px-4 py-2 text-sm text-warm-accent border border-warm-accent
          rounded-[var(--radius-md)] hover:bg-warm-accent/10 transition-colors"
      >
        生成邀请链接
      </button>
    )
  }

  const expiresAt = couple.inviteExpiresAt ? new Date(couple.inviteExpiresAt) : null
  const daysLeft = expiresAt
    ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : null

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <code className="flex-1 px-3 py-2 bg-warm-bg rounded-[var(--radius-sm)] text-sm text-warm-text border border-warm-border break-all">
          {typeof window !== 'undefined' ? window.location.origin : ''}/invite/{couple.inviteCode}
        </code>
        <button
          type="button"
          onClick={handleCopy}
          className="px-3 py-2 text-sm text-warm-accent hover:bg-warm-accent/10
            rounded-[var(--radius-sm)] transition-colors whitespace-nowrap"
        >
          {copied ? '已复制 ✓' : '复制'}
        </button>
      </div>
      {daysLeft !== null && (
        <p className="text-xs text-warm-muted">
          剩余有效期：{daysLeft} 天
        </p>
      )}
      <button
        type="button"
        onClick={handleRegenerate}
        className="px-3 py-2 text-xs text-warm-muted border border-warm-border
          rounded-[var(--radius-sm)] hover:bg-warm-bg transition-colors"
      >
        重新生成
      </button>
    </div>
  )
}
```

并在 `handleGenerateInvite` 下方新增 `handleRegenerateInvite` 函数：

```tsx
async function handleRegenerateInvite() {
  if (!couple) return
  const res = await fetch(`/api/couples/${couple.id}/invite`, { method: 'POST' })
  if (res.ok) {
    const data = await res.json()
    setCouple(prev => prev ? {
      ...prev,
      inviteCode: data.inviteCode,
      inviteExpiresAt: data.inviteExpiresAt,
    } : null)
    setMessage({ type: 'success', text: '邀请链接已重新生成' })
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(dashboard)/settings/page.tsx
git commit -m "feat(invite): enhance invite management UI with copy feedback and regenerate"
```

---

## Task 12: 最终验证

- [ ] **Step 1: TypeScript 类型检查**

Run: `npx tsc --noEmit`
Expected: 无错误

- [ ] **Step 2: ESLint 检查**

Run: `npx eslint src/components/skeleton/ src/app/error.tsx src/app/global-error.tsx src/app/s/[slug]/error.tsx src/app/invite/ src/app/api/invite/[code]/info/ src/hooks/use-image-preload.ts`
Expected: 无错误或仅 warning

- [ ] **Step 3: 开发服务器冒烟测试**

Run: `npm run dev`

手动验证以下路由：
- `/dashboard` — 页面正常加载
- `/settings` — 骨架屏展示正常后加载数据
- `/invite/invalid-code` — 显示"邀请链接无效"错误态
- 打开 DevTools 在 Network 中模拟慢速加载确认骨架屏可见

- [ ] **Step 4: Commit all remaining changes (if any)**

```bash
git status
# 如有未提交的 lint fix:
git add -A && git commit -m "fix: address lint/type issues"
```
