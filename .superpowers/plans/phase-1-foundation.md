# Phase 1: 项目基建 + 数据库 + 认证

> 返回: [主计划](./2026-05-14-couple-memory-mvp.md)
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

---

### Task 1: 项目初始化

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `.env.example`
- Create: `.gitignore`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`

- [ ] **Step 1: 创建 Next.js 15 项目**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

- [ ] **Step 2: 安装核心依赖**

```bash
npm install prisma @prisma/client next-auth@5 bcryptjs sharp exifr browser-image-compression framer-motion
npm install -D @types/bcryptjs
```

- [ ] **Step 3: 配置 .env.example**

```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/couple_memory
NEXTAUTH_SECRET=your_random_secret
NEXTAUTH_URL=http://localhost:3000
OSS_ACCESS_KEY_ID=
OSS_ACCESS_KEY_SECRET=
OSS_BUCKET=couple-memory
OSS_REGION=oss-cn-guangzhou
OSS_CDN_DOMAIN=
CLAUDE_API_KEY=
DEEPSEEK_API_KEY=
AMAP_API_KEY=
```

- [ ] **Step 4: 验证项目启动**

```bash
npm run dev
```
Expected: 浏览器访问 localhost:3000 正常显示

- [ ] **Step 5: Commit**

```bash
git init && git add . && git commit -m "feat: init Next.js 15 project with core dependencies"
```

---

### Task 2: Prisma Schema + 数据库初始化

**Files:**
- Create: `prisma/schema.prisma`
- Create: `src/lib/prisma.ts`

- [ ] **Step 1: 初始化 Prisma**

```bash
npx prisma init
```

- [ ] **Step 2: 编写完整 Schema**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  OWNER
  PARTNER
}

enum PhotoStatus {
  UPLOADING
  PROCESSING
  READY
  FAILED
}

enum PipelineStatus {
  RUNNING
  COMPLETED
  FAILED
}

model User {
  id           String       @id @default(cuid())
  email        String       @unique
  passwordHash String
  name         String?
  avatar       String?
  couples      CoupleUser[]
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

model Couple {
  id            String         @id @default(cuid())
  slug          String         @unique
  name          String
  startDate     DateTime?
  coverPhotoUrl String?
  bio           String?
  theme         String         @default("default")
  isPublic      Boolean        @default(false)
  plan          String         @default("free")
  members       CoupleUser[]
  albums        Album[]
  milestones    Milestone[]
  pipelineRuns  PipelineRun[]
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
}

model CoupleUser {
  id       String   @id @default(cuid())
  user     User     @relation(fields: [userId], references: [id])
  userId   String
  couple   Couple   @relation(fields: [coupleId], references: [id])
  coupleId String
  role     Role
  nickname String?
  joinedAt DateTime @default(now())

  @@unique([userId, coupleId])
  @@index([userId])
  @@index([coupleId])
}

model Album {
  id            String   @id @default(cuid())
  couple        Couple   @relation(fields: [coupleId], references: [id])
  coupleId      String
  title         String
  description   String?
  coverPhotoUrl String?
  sortOrder     Int      @default(0)
  photos        Photo[]
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([coupleId, sortOrder])
}

model Photo {
  id              String        @id @default(cuid())
  album           Album         @relation(fields: [albumId], references: [id])
  albumId         String
  originalUrl     String
  thumbnailUrl    String?
  displayUrl      String?
  fileName        String
  fileSize        Int
  width           Int?
  height          Int?
  sortOrder       Int           @default(0)
  takenAt         DateTime?
  latitude        Float?
  longitude       Float?
  locationName    String?
  cameraMake      String?
  cameraModel     String?
  focalLength     String?
  aperture        String?
  shutterSpeed    String?
  iso             Int?
  aiCaption       String?
  userCaption     String?
  aiScene         String?
  aiMood          String?
  aiComposition   String?
  aiColorTone     String?
  aiLayout        String        @default("side-by-side")
  aiKeywords      String[]
  status          PhotoStatus   @default(UPLOADING)
  processingError String?
  milestones      Milestone[]
  pipelineRuns    PipelineRun[]
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt

  @@index([albumId, sortOrder])
  @@index([albumId, takenAt])
  @@index([status])
}

model Milestone {
  id              String   @id @default(cuid())
  couple          Couple   @relation(fields: [coupleId], references: [id])
  coupleId        String
  title           String
  description     String?
  date            DateTime
  locationName    String?
  photo           Photo?   @relation(fields: [photoId], references: [id])
  photoId         String?
  isAutoGenerated Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@index([coupleId, date])
}

model PipelineRun {
  id          String         @id @default(cuid())
  couple      Couple         @relation(fields: [coupleId], references: [id])
  coupleId    String
  photo       Photo          @relation(fields: [photoId], references: [id])
  photoId     String
  status      PipelineStatus @default(RUNNING)
  dag         Json
  nodeResults Json?
  totalTokens Int?
  totalCost   Float?
  startedAt   DateTime       @default(now())
  completedAt DateTime?
  duration    Int?

  @@index([photoId])
  @@index([coupleId, startedAt])
}
```

- [ ] **Step 3: 生成迁移并应用**

```bash
npx prisma migrate dev --name init
```
Expected: 数据库表创建成功

- [ ] **Step 4: 创建 Prisma Client 单例**

Create: `src/lib/prisma.ts`

```typescript
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const prisma = globalForPrisma.prisma || new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

- [ ] **Step 5: Commit**

```bash
git add . && git commit -m "feat: add Prisma schema with all MVP tables"
```

---

### Task 3: NextAuth.js v5 认证

**Files:**
- Create: `src/lib/auth.ts`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Create: `src/app/api/auth/register/route.ts`

- [ ] **Step 1: 配置 NextAuth**

Create: `src/lib/auth.ts`

```typescript
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })
        if (!user) return null

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.passwordHash
        )
        if (!isValid) return null

        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub
      return session
    },
  },
})
```

- [ ] **Step 2: 创建 Auth Route Handler**

Create: `src/app/api/auth/[...nextauth]/route.ts`

```typescript
import { handlers } from '@/lib/auth'
export const { GET, POST } = handlers
```

- [ ] **Step 3: 实现注册 API**

Create: `src/app/api/auth/register/route.ts`

```typescript
import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  const { email, password, name } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email already registered' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const slug = `couple-${Date.now().toString(36)}`

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      name,
      couples: {
        create: {
          role: 'OWNER',
          couple: {
            create: { slug, name: name ? `${name}的空间` : '我们的空间' },
          },
        },
      },
    },
    include: { couples: { include: { couple: true } } },
  })

  const couple = user.couples[0].couple

  return NextResponse.json(
    { user: { id: user.id, email, name }, couple },
    { status: 201 }
  )
}
```

- [ ] **Step 4: 验证注册 + 登录流程**

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456","name":"Test"}'
```
Expected: 201 返回用户和空间信息

- [ ] **Step 5: Commit**

```bash
git add . && git commit -m "feat: add NextAuth.js v5 with credentials provider + register API"
```

---

### Task 4: 认证中间件封装

**Files:**
- Create: `src/lib/api-middleware.ts`

- [ ] **Step 1: 实现 withAuth + withPublicAccess 中间件**

```typescript
import { auth } from './auth'
import { prisma } from './prisma'
import { NextResponse } from 'next/server'
import type { CoupleUser, Couple, Role } from '@prisma/client'

export type AuthContext = {
  userId: string
  coupleUser: CoupleUser & { couple: Couple }
}

export function withAuth(
  handler: (req: Request, ctx: AuthContext, params: Record<string, string>) => Promise<Response>,
  options?: { requiredRole?: Role }
) {
  return async (req: Request, { params }: { params: Promise<Record<string, string>> }) => {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const coupleId = resolvedParams.coupleId
    if (!coupleId) {
      return NextResponse.json({ error: 'Missing coupleId' }, { status: 400 })
    }

    const coupleUser = await prisma.coupleUser.findFirst({
      where: { userId: session.user.id, coupleId },
      include: { couple: true },
    })
    if (!coupleUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (options?.requiredRole === 'OWNER' && coupleUser.role !== 'OWNER') {
      return NextResponse.json({ error: 'Owner access required' }, { status: 403 })
    }

    return handler(req, { userId: session.user.id, coupleUser }, resolvedParams)
  }
}

export function withPublicAccess(
  handler: (req: Request, ctx: { couple: Couple }, params: Record<string, string>) => Promise<Response>
) {
  return async (req: Request, { params }: { params: Promise<Record<string, string>> }) => {
    const resolvedParams = await params
    const couple = await prisma.couple.findUnique({
      where: { slug: resolvedParams.slug },
    })
    if (!couple || !couple.isPublic) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return handler(req, { couple }, resolvedParams)
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add . && git commit -m "feat: add withAuth and withPublicAccess API middleware"
```

---

### Task 5: 空间管理 API (CRUD)

**Files:**
- Create: `src/app/api/couples/[coupleId]/route.ts`

- [ ] **Step 1: 实现 GET + PATCH**

```typescript
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const GET = withAuth(async (req, { coupleUser }) => {
  const couple = await prisma.couple.findUnique({
    where: { id: coupleUser.coupleId },
    include: {
      members: { select: { id: true, userId: true, role: true, nickname: true } },
      _count: { select: { albums: true, milestones: true } },
    },
  })

  const photoCount = await prisma.photo.count({
    where: { album: { coupleId: coupleUser.coupleId } },
  })

  return NextResponse.json({
    ...couple,
    stats: {
      photoCount,
      albumCount: couple!._count.albums,
      milestoneCount: couple!._count.milestones,
    },
  })
})

export const PATCH = withAuth(
  async (req, { coupleUser }) => {
    const body = await req.json()
    const { name, slug, startDate, bio, theme, isPublic } = body

    if (slug) {
      const existing = await prisma.couple.findUnique({ where: { slug } })
      if (existing && existing.id !== coupleUser.coupleId) {
        return NextResponse.json({ error: 'Slug already taken' }, { status: 409 })
      }
    }

    const updated = await prisma.couple.update({
      where: { id: coupleUser.coupleId },
      data: {
        ...(name && { name }),
        ...(slug && { slug }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(bio !== undefined && { bio }),
        ...(theme && { theme }),
        ...(isPublic !== undefined && { isPublic }),
      },
    })

    return NextResponse.json(updated)
  },
  { requiredRole: 'OWNER' }
)
```

- [ ] **Step 2: Commit**

```bash
git add . && git commit -m "feat: add couple space CRUD API"
```

---

### Task 6: 相册 CRUD API

**Files:**
- Create: `src/app/api/couples/[coupleId]/albums/route.ts`
- Create: `src/app/api/couples/[coupleId]/albums/[albumId]/route.ts`

- [ ] **Step 1: 实现相册列表 + 创建**

```typescript
// src/app/api/couples/[coupleId]/albums/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const GET = withAuth(async (req, { coupleUser }) => {
  const albums = await prisma.album.findMany({
    where: { coupleId: coupleUser.coupleId },
    orderBy: { sortOrder: 'asc' },
    include: { _count: { select: { photos: true } } },
  })
  return NextResponse.json({
    albums: albums.map(a => ({ ...a, photoCount: a._count.photos })),
    total: albums.length,
  })
})

export const POST = withAuth(async (req, { coupleUser }) => {
  const { title, description } = await req.json()
  if (!title) {
    return NextResponse.json({ error: 'Title required' }, { status: 400 })
  }

  const maxSort = await prisma.album.aggregate({
    where: { coupleId: coupleUser.coupleId },
    _max: { sortOrder: true },
  })

  const album = await prisma.album.create({
    data: {
      coupleId: coupleUser.coupleId,
      title,
      description,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  })
  return NextResponse.json(album, { status: 201 })
})
```

- [ ] **Step 2: 实现单个相册的 PATCH + DELETE**

```typescript
// src/app/api/couples/[coupleId]/albums/[albumId]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const PATCH = withAuth(async (req, { coupleUser }, params) => {
  const body = await req.json()
  const album = await prisma.album.updateMany({
    where: { id: params.albumId, coupleId: coupleUser.coupleId },
    data: body,
  })
  if (album.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const updated = await prisma.album.findUnique({ where: { id: params.albumId } })
  return NextResponse.json(updated)
})

export const DELETE = withAuth(
  async (req, { coupleUser }, params) => {
    await prisma.album.deleteMany({
      where: { id: params.albumId, coupleId: coupleUser.coupleId },
    })
    return new Response(null, { status: 204 })
  },
  { requiredRole: 'OWNER' }
)
```

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat: add album CRUD API"
```

---

### Task 7: 照片 CRUD API

**Files:**
- Create: `src/app/api/couples/[coupleId]/photos/route.ts`
- Create: `src/app/api/couples/[coupleId]/photos/[photoId]/route.ts`
- Create: `src/app/api/couples/[coupleId]/photos/[photoId]/retry/route.ts`

- [ ] **Step 1: 实现照片列表 + 创建确认**

```typescript
// src/app/api/couples/[coupleId]/photos/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const GET = withAuth(async (req, { coupleUser }) => {
  const url = new URL(req.url)
  const albumId = url.searchParams.get('albumId')
  const status = url.searchParams.get('status')
  const page = parseInt(url.searchParams.get('page') || '1')
  const limit = parseInt(url.searchParams.get('limit') || '20')

  const where = {
    album: { coupleId: coupleUser.coupleId },
    ...(albumId && { albumId }),
    ...(status && { status: status as any }),
  }

  const [photos, total] = await Promise.all([
    prisma.photo.findMany({
      where,
      orderBy: { takenAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.photo.count({ where }),
  ])

  return NextResponse.json({ photos, total, page, limit })
})

export const POST = withAuth(async (req, { coupleUser }) => {
  const { ossKey, fileName, fileSize, albumId } = await req.json()

  const album = await prisma.album.findFirst({
    where: { id: albumId, coupleId: coupleUser.coupleId },
  })
  if (!album) {
    return NextResponse.json({ error: 'Album not found' }, { status: 404 })
  }

  const cdnDomain = process.env.OSS_CDN_DOMAIN || ''
  const photo = await prisma.photo.create({
    data: {
      albumId,
      originalUrl: `https://${cdnDomain}/${ossKey}`,
      fileName,
      fileSize,
      status: 'PROCESSING',
    },
  })

  // 异步触发处理，不阻塞响应（Phase 2 实现 processPhoto）
  // processPhoto(photo.id, ossKey).catch(...)

  return NextResponse.json({ id: photo.id, status: 'PROCESSING' }, { status: 201 })
})
```

- [ ] **Step 2: 实现 PATCH + DELETE**

```typescript
// src/app/api/couples/[coupleId]/photos/[photoId]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const PATCH = withAuth(async (req, { coupleUser }, params) => {
  const body = await req.json()
  const photo = await prisma.photo.findFirst({
    where: { id: params.photoId, album: { coupleId: coupleUser.coupleId } },
  })
  if (!photo) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const updated = await prisma.photo.update({
    where: { id: params.photoId },
    data: body,
  })
  return NextResponse.json(updated)
})

export const DELETE = withAuth(async (req, { coupleUser }, params) => {
  const photo = await prisma.photo.findFirst({
    where: { id: params.photoId, album: { coupleId: coupleUser.coupleId } },
  })
  if (!photo) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.photo.delete({ where: { id: params.photoId } })
  // TODO: 异步清理 OSS 文件
  return new Response(null, { status: 204 })
})
```

- [ ] **Step 3: 实现重试端点**

```typescript
// src/app/api/couples/[coupleId]/photos/[photoId]/retry/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const POST = withAuth(async (req, { coupleUser }, params) => {
  const photo = await prisma.photo.findFirst({
    where: {
      id: params.photoId,
      album: { coupleId: coupleUser.coupleId },
      status: 'FAILED',
    },
  })
  if (!photo) {
    return NextResponse.json({ error: 'Not found or not failed' }, { status: 404 })
  }

  await prisma.photo.update({
    where: { id: params.photoId },
    data: { status: 'PROCESSING', processingError: null },
  })

  // 异步重新触发 processPhoto
  return NextResponse.json({ status: 'PROCESSING' })
})
```

- [ ] **Step 4: Commit**

```bash
git add . && git commit -m "feat: add photo CRUD API with retry endpoint"
```

---

### Task 8: 里程碑 CRUD API

**Files:**
- Create: `src/app/api/couples/[coupleId]/milestones/route.ts`
- Create: `src/app/api/couples/[coupleId]/milestones/[milestoneId]/route.ts`

- [ ] **Step 1: 实现里程碑列表 + 创建**

```typescript
// src/app/api/couples/[coupleId]/milestones/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const GET = withAuth(async (req, { coupleUser }) => {
  const milestones = await prisma.milestone.findMany({
    where: { coupleId: coupleUser.coupleId },
    orderBy: { date: 'asc' },
    include: { photo: { select: { thumbnailUrl: true } } },
  })
  return NextResponse.json({ milestones })
})

export const POST = withAuth(async (req, { coupleUser }) => {
  const { title, description, date, locationName, photoId } = await req.json()
  if (!title || !date) {
    return NextResponse.json({ error: 'Title and date required' }, { status: 400 })
  }

  const milestone = await prisma.milestone.create({
    data: {
      coupleId: coupleUser.coupleId,
      title,
      description,
      date: new Date(date),
      locationName,
      photoId,
      isAutoGenerated: false,
    },
  })
  return NextResponse.json(milestone, { status: 201 })
})
```

- [ ] **Step 2: 实现 PATCH + DELETE**

```typescript
// src/app/api/couples/[coupleId]/milestones/[milestoneId]/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'

export const PATCH = withAuth(async (req, { coupleUser }, params) => {
  const body = await req.json()
  const ms = await prisma.milestone.updateMany({
    where: { id: params.milestoneId, coupleId: coupleUser.coupleId },
    data: body,
  })
  if (ms.count === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  const updated = await prisma.milestone.findUnique({ where: { id: params.milestoneId } })
  return NextResponse.json(updated)
})

export const DELETE = withAuth(async (req, { coupleUser }, params) => {
  await prisma.milestone.deleteMany({
    where: { id: params.milestoneId, coupleId: coupleUser.coupleId },
  })
  return new Response(null, { status: 204 })
})
```

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat: add milestone CRUD API"
```

---

### Task 9: 邀请链接模块

**Files:**
- Create: `src/app/api/couples/[coupleId]/invite/route.ts`
- Create: `src/app/api/invite/[code]/accept/route.ts`

- [ ] **Step 1: 实现生成邀请码**

```typescript
// src/app/api/couples/[coupleId]/invite/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { withAuth } from '@/lib/api-middleware'
import crypto from 'crypto'

export const POST = withAuth(
  async (req, { coupleUser }) => {
    const inviteCode = crypto.randomBytes(6).toString('hex')
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // 将 inviteCode 存到 Couple 表（或独立的 Invite 表）
    await prisma.couple.update({
      where: { id: coupleUser.coupleId },
      data: {
        // 假设扩展字段 inviteCode / inviteExpiresAt
        // MVP 简化：直接用 couple.id 编码
      },
    })

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    return NextResponse.json({
      inviteCode,
      inviteUrl: `${baseUrl}/invite/${inviteCode}`,
      expiresAt,
    }, { status: 201 })
  },
  { requiredRole: 'OWNER' }
)
```

- [ ] **Step 2: 实现接受邀请**

```typescript
// src/app/api/invite/[code]/accept/route.ts
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { code } = await params
  // 查找邀请码对应的空间（需根据实际存储方式查询）
  // 检查过期、是否已是成员

  // 加入空间
  // await prisma.coupleUser.create({ ... role: 'PARTNER' })

  return NextResponse.json({ role: 'PARTNER' })
}
```

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat: add invite link generation and acceptance"
```
