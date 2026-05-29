# Phase 4: 前端页面 + 公开展示

> 返回: [主计划](./2026-05-14-couple-memory-mvp.md)
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

---

### Task 21: 登录 / 注册页面

**Files:**
- Create: `src/app/(auth)/layout.tsx`
- Create: `src/app/(auth)/login/page.tsx`
- Create: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: 认证页面布局**

```tsx
// src/app/(auth)/layout.tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50">
      <div className="w-full max-w-md p-8 bg-white rounded-2xl shadow-lg">
        {children}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: 登录表单**

```tsx
// src/app/(auth)/login/page.tsx
'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirect: false,
    })

    if (result?.error) {
      setError('邮箱或密码错误')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-center mb-6">登录</h1>
      {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
      <form onSubmit={handleSubmit} className="space-y-4">
        <input name="email" type="email" placeholder="邮箱" required
          className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-pink-300 outline-none" />
        <input name="password" type="password" placeholder="密码" required
          className="w-full px-4 py-3 rounded-lg border focus:ring-2 focus:ring-pink-300 outline-none" />
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50">
          {loading ? '登录中...' : '登录'}
        </button>
      </form>
      <p className="text-center text-sm text-gray-500 mt-4">
        还没有账号？<a href="/register" className="text-pink-500">注册</a>
      </p>
    </>
  )
}
```

- [ ] **Step 3: 注册表单（类似结构，调用 /api/auth/register 后自动登录）**

- [ ] **Step 4: Commit**

```bash
git add . && git commit -m "feat: add login and register pages"
```

---

### Task 22: 管理后台布局 + 仪表盘

**Files:**
- Create: `src/app/(dashboard)/layout.tsx`
- Create: `src/app/(dashboard)/dashboard/page.tsx`
- Create: `src/components/sidebar.tsx`

- [ ] **Step 1: 管理后台布局（侧边栏 + 主内容区）**

```tsx
// src/app/(dashboard)/layout.tsx
import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-6 bg-gray-50">{children}</main>
    </div>
  )
}
```

- [ ] **Step 2: 侧边栏导航组件**

```tsx
// src/components/sidebar.tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const navItems = [
  { href: '/dashboard', label: '概览', icon: '📊' },
  { href: '/albums', label: '相册', icon: '📸' },
  { href: '/timeline', label: '时间轴', icon: '📅' },
  { href: '/settings', label: '设置', icon: '⚙️' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 bg-white border-r p-4 space-y-1">
      <h2 className="text-lg font-bold px-3 py-2 mb-4">我们的空间</h2>
      {navItems.map(item => (
        <Link key={item.href} href={item.href}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm
            ${pathname === item.href ? 'bg-pink-50 text-pink-600' : 'text-gray-600 hover:bg-gray-50'}`}>
          <span>{item.icon}</span>{item.label}
        </Link>
      ))}
    </aside>
  )
}
```

- [ ] **Step 3: 仪表盘页面（统计卡片：照片数、相册数、在一起天数）**

- [ ] **Step 4: Commit**

```bash
git add . && git commit -m "feat: add dashboard layout with sidebar navigation"
```

---

### Task 23: 空间设置页面

**Files:**
- Create: `src/app/(dashboard)/settings/page.tsx`

- [ ] **Step 1: 实现设置表单（名称、slug、startDate、简介、公开开关）**

调用 `PATCH /api/couples/:coupleId` 保存，包含 slug 冲突校验提示。

- [ ] **Step 2: Commit**

```bash
git add . && git commit -m "feat: add space settings page"
```

---

### Task 24: 相册管理页面

**Files:**
- Create: `src/app/(dashboard)/albums/page.tsx`
- Create: `src/app/(dashboard)/albums/[albumId]/page.tsx`

- [ ] **Step 1: 相册列表页**

卡片网格展示所有相册，支持创建新相册（弹窗表单）、编辑、删除。

- [ ] **Step 2: 相册详情页**

照片网格 + PhotoUploader 组件，显示每张照片的状态徽章（PROCESSING/READY/FAILED）。

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat: add album list and detail pages"
```

---

### Task 25: 照片详情弹窗 + 编辑

**Files:**
- Create: `src/components/photo-card.tsx`
- Create: `src/components/photo-detail-modal.tsx`

- [ ] **Step 1: 照片卡片组件**

```tsx
// src/components/photo-card.tsx
'use client'

import Image from 'next/image'

type Photo = {
  id: string
  thumbnailUrl: string | null
  fileName: string
  status: string
  aiCaption?: string
}

export function PhotoCard({ photo, onClick }: { photo: Photo; onClick: () => void }) {
  return (
    <div onClick={onClick} className="relative cursor-pointer rounded-lg overflow-hidden group">
      {photo.thumbnailUrl ? (
        <Image src={photo.thumbnailUrl} alt={photo.fileName}
          width={300} height={300} className="object-cover aspect-square" />
      ) : (
        <div className="aspect-square bg-gray-100 flex items-center justify-center">
          <span className="text-gray-400 text-sm">处理中...</span>
        </div>
      )}
      {photo.status !== 'READY' && (
        <div className={`absolute top-2 right-2 px-2 py-0.5 rounded-full text-xs text-white
          ${photo.status === 'PROCESSING' ? 'bg-blue-500' : 'bg-red-500'}`}>
          {photo.status === 'PROCESSING' ? '处理中' : '失败'}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 照片详情弹窗（编辑文案、切换排版、查看 EXIF、重试按钮）**

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat: add photo card and detail modal with editing"
```

---

### Task 26: 时间轴管理页面

**Files:**
- Create: `src/app/(dashboard)/timeline/page.tsx`

- [ ] **Step 1: 时间轴列表（区分自动生成/手动创建、编辑/删除）**
- [ ] **Step 2: 手动创建里程碑表单**
- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat: add timeline management page"
```

---

### Task 27: 公开展示页面 — 首页 + API

**Files:**
- Create: `src/app/story/[slug]/layout.tsx`
- Create: `src/app/story/[slug]/page.tsx`
- Create: `src/app/api/public/[slug]/route.ts`
- Create: `src/app/api/public/[slug]/photos/route.ts`
- Create: `src/app/api/public/[slug]/timeline/route.ts`

- [ ] **Step 1: 实现公开 API 端点（空间信息、照片列表、时间轴）**

```typescript
// src/app/api/public/[slug]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withPublicAccess } from '@/lib/api-middleware'

export const GET = withPublicAccess(async (req, { couple }) => {
  const daysTogether = couple.startDate
    ? Math.floor((Date.now() - couple.startDate.getTime()) / (1000 * 60 * 60 * 24))
    : null

  return NextResponse.json({
    name: couple.name,
    startDate: couple.startDate,
    coverPhotoUrl: couple.coverPhotoUrl,
    bio: couple.bio,
    theme: couple.theme,
    daysTogether,
  })
})
```

- [ ] **Step 2: 公开首页（hero 封面 + 在一起天数 + 简介 + 导航）**

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat: add public space homepage with APIs"
```

---

### Task 28: 公开展示 — 照片流 + 5 种排版模板

**Files:**
- Create: `src/app/story/[slug]/photos/page.tsx`
- Create: `src/components/layouts/cinema-wide.tsx`
- Create: `src/components/layouts/side-by-side.tsx`
- Create: `src/components/layouts/portrait-hero.tsx`
- Create: `src/components/layouts/grid-square.tsx`
- Create: `src/components/layouts/story-card.tsx`
- Create: `src/components/photo-stream.tsx`

- [ ] **Step 1: 实现 5 种排版模板组件**

每个组件接收 `{ photo, caption }` props，渲染不同视觉布局。包含 Tailwind 样式 + Framer Motion 入场动画。

| 模板 | 视觉效果 |
|------|---------|
| cinema-wide | 全宽横幅，上下黑边，电影感 |
| side-by-side | 左图右文或右图左文 |
| portrait-hero | 大面积展示，文案叠加底部 |
| grid-square | 方格排列，紧凑 |
| story-card | 卡片带阴影圆角 |

- [ ] **Step 2: 照片流组件（根据 aiLayout 分发到对应模板）**

```tsx
// src/components/photo-stream.tsx
'use client'

import { motion } from 'framer-motion'
import { CinemaWide } from './layouts/cinema-wide'
import { SideBySide } from './layouts/side-by-side'
import { PortraitHero } from './layouts/portrait-hero'
import { GridSquare } from './layouts/grid-square'
import { StoryCard } from './layouts/story-card'

const layoutMap = {
  'cinema-wide': CinemaWide,
  'side-by-side': SideBySide,
  'portrait-hero': PortraitHero,
  'grid-square': GridSquare,
  'story-card': StoryCard,
}

export function PhotoStream({ photos }: { photos: any[] }) {
  return (
    <div className="space-y-12 max-w-5xl mx-auto px-4">
      {photos.map((photo, i) => {
        const Layout = layoutMap[photo.aiLayout as keyof typeof layoutMap] || SideBySide
        const caption = photo.userCaption || photo.aiCaption

        return (
          <motion.div
            key={photo.id}
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-100px' }}
            transition={{ duration: 0.6, delay: i * 0.05 }}
          >
            <Layout photo={photo} caption={caption} />
          </motion.div>
        )
      })}
    </div>
  )
}
```

- [ ] **Step 3: 照片流页面**

- [ ] **Step 4: Commit**

```bash
git add . && git commit -m "feat: add photo stream with 5 layout templates and scroll animation"
```

---

### Task 29: 公开展示 — 时间轴页面

**Files:**
- Create: `src/app/story/[slug]/timeline/page.tsx`
- Create: `src/components/timeline-view.tsx`

- [ ] **Step 1: 时间轴可视化组件**

垂直时间线 + 里程碑卡片，包含日期、地点、标题、关联照片缩略图。Framer Motion 交错入场动画。

- [ ] **Step 2: Commit**

```bash
git add . && git commit -m "feat: add public timeline page"
```

---

### Task 30: 前端状态轮询 + 响应式适配

**Files:**
- Create: `src/hooks/use-photo-status.ts`

- [ ] **Step 1: 实现照片状态轮询 Hook**

```typescript
// src/hooks/use-photo-status.ts
import { useEffect, useState } from 'react'

export function usePhotoStatus(coupleId: string, photoId: string) {
  const [photo, setPhoto] = useState<any>(null)

  useEffect(() => {
    if (!photoId) return
    const interval = setInterval(async () => {
      const res = await fetch(`/api/couples/${coupleId}/photos/${photoId}`)
      const data = await res.json()
      setPhoto(data)
      if (data.status === 'READY' || data.status === 'FAILED') {
        clearInterval(interval)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [coupleId, photoId])

  return photo
}
```

- [ ] **Step 2: 全局响应式断点检查（sm/md/lg），移动端导航适配**

- [ ] **Step 3: 图片懒加载（next/image + Intersection Observer）**

- [ ] **Step 4: Commit**

```bash
git add . && git commit -m "feat: add photo status polling and responsive design"
```
