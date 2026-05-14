# API 设计

> 本文档定义 REST API 端点、请求响应格式和认证中间件。
>
> 相关文档：[总览](./README.md) · [技术架构](./architecture.md) · [数据库设计](./database.md) · [图片处理管道](./image-pipeline.md)

## API 概览

REST 风格，基于 Next.js App Router API Routes。所有 API 返回 JSON 格式。

### 路由分组

| 路径前缀 | 用途 | 认证要求 |
|---------|------|---------|
| `/api/auth/*` | 认证相关 | 无（NextAuth 内置） |
| `/api/couples/:coupleId/*` | 空间数据 CRUD | 需登录 + 空间归属校验 |
| `/api/upload/sign` | OSS 直传签名 | 需登录 |
| `/api/public/:slug/*` | 公开页面数据 | 无需登录（仅公开空间） |
| `/api/invite/*` | 邀请链接 | 部分需登录 |

## 认证中间件

### 中间件链

```
请求 → [1. getSession] → [2. getCoupleUser] → [3. checkRole] → 业务逻辑

1. getSession: 验证登录状态，提取 userId
   - 未登录 → 401 Unauthorized

2. getCoupleUser: 验证用户是否属于目标空间
   - 不属于 → 403 Forbidden

3. checkRole: 验证角色权限
   - 角色不足 → 403 Forbidden
```

### 中间件封装

```typescript
type AuthContext = {
  session: Session
  coupleUser: CoupleUser & { couple: Couple }
}

function withAuth(
  handler: (req: Request, ctx: AuthContext) => Promise<Response>,
  options?: { requiredRole?: Role }
) {
  return async (req: Request, { params }) => {
    const session = await getServerSession(authOptions)
    if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const coupleUser = await prisma.coupleUser.findFirst({
      where: { userId: session.user.id, coupleId: params.coupleId },
      include: { couple: true }
    })
    if (!coupleUser) return Response.json({ error: 'Forbidden' }, { status: 403 })

    if (options?.requiredRole === 'OWNER' && coupleUser.role !== 'OWNER') {
      return Response.json({ error: 'Owner access required' }, { status: 403 })
    }

    return handler(req, { session, coupleUser })
  }
}
```

### 公开 API 中间件

```typescript
function withPublicAccess(
  handler: (req: Request, ctx: { couple: Couple }) => Promise<Response>
) {
  return async (req: Request, { params }) => {
    const couple = await prisma.couple.findUnique({ where: { slug: params.slug } })
    if (!couple || !couple.isPublic) {
      return Response.json({ error: 'Not found' }, { status: 404 })
    }
    return handler(req, { couple })
  }
}
```

## API 端点详细设计

### 认证模块

#### POST /api/auth/register

注册新用户并创建默认空间。

```typescript
// Request
{
  email: "user@example.com",
  password: "********",
  name: "LinDaiDai"
}

// Response 201
{
  user: { id, email, name },
  couple: { id, slug, name }     // 自动创建的空间
}

// Error 409 — 邮箱已注册
```

#### NextAuth 内置端点

- `POST /api/auth/signin` — 登录
- `POST /api/auth/signout` — 登出
- `GET /api/auth/session` — 获取当前会话

### 空间管理模块

#### GET /api/couples/:coupleId

获取空间详情。需要 OWNER 或 PARTNER 权限。

```typescript
// Response 200
{
  id: "couple_xxx",
  slug: "lin-and-xx",
  name: "Lin & XX",
  startDate: "2020-01-01T00:00:00Z",
  coverPhotoUrl: "https://cdn.example.com/...",
  bio: "我们的故事...",
  theme: "default",
  isPublic: true,
  plan: "free",
  members: [
    { id: "cu_1", userId: "user_1", role: "OWNER", nickname: "Lin" },
    { id: "cu_2", userId: "user_2", role: "PARTNER", nickname: "XX" }
  ],
  stats: {
    photoCount: 42,
    albumCount: 3,
    milestoneCount: 8,
    daysTogether: 1956
  }
}
```

#### PATCH /api/couples/:coupleId

更新空间信息。需要 OWNER 权限。

```typescript
// Request（部分更新）
{
  name?: "新名称",
  slug?: "new-slug",
  startDate?: "2020-01-01",
  bio?: "更新的简介",
  theme?: "minimal",
  isPublic?: true
}

// Response 200 — 更新后的空间
// Error 409 — slug 已被占用
```

### 相册模块

#### GET /api/couples/:coupleId/albums

获取空间下所有相册列表。

```typescript
// Query: ?page=1&limit=20
// Response 200
{
  albums: [
    {
      id: "album_xxx",
      title: "厦门之旅",
      description: "2024年8月的旅行",
      coverPhotoUrl: "...",
      photoCount: 15,
      sortOrder: 0
    }
  ],
  total: 3
}
```

#### POST /api/couples/:coupleId/albums

创建新相册。

```typescript
// Request
{ title: "厦门之旅", description?: "..." }

// Response 201
{ id, title, description, sortOrder, createdAt }
```

#### PATCH /api/couples/:coupleId/albums/:albumId

更新相册信息。

#### DELETE /api/couples/:coupleId/albums/:albumId

删除相册（级联删除相册下的照片记录，OSS 文件异步清理）。需 OWNER 权限。

### 照片模块

#### GET /api/couples/:coupleId/photos

获取照片列表，支持按相册筛选和排序。

```typescript
// Query: ?albumId=xxx&status=READY&sort=takenAt&order=desc&page=1&limit=20
// Response 200
{
  photos: [
    {
      id: "photo_xxx",
      albumId: "album_xxx",
      thumbnailUrl: "...",
      displayUrl: "...",
      fileName: "IMG_20240815.jpg",
      takenAt: "2024-08-15T18:05:30Z",
      locationName: "厦门·鼓浪屿",
      aiCaption: "在鼓浪屿的午后...",
      userCaption: null,
      aiLayout: "cinema-wide",
      status: "READY"
    }
  ],
  total: 42
}
```

#### POST /api/couples/:coupleId/photos

确认上传，创建 Photo 记录并触发异步处理。

```typescript
// Request
{
  ossKey: "couples/xxx/photos/uuid/original.jpg",
  fileName: "IMG_20240815.jpg",
  fileSize: 4500000,
  albumId: "album_xxx"
}

// Response 201
{
  id: "photo_xxx",
  status: "PROCESSING"
}
```

#### PATCH /api/couples/:coupleId/photos/:photoId

编辑照片信息（文案、排版、排序等）。

```typescript
// Request（部分更新）
{
  userCaption?: "我自己写的文案...",
  aiLayout?: "portrait-hero",       // 手动切换排版
  sortOrder?: 5,
  albumId?: "album_yyy"             // 移动到其他相册
}
```

#### DELETE /api/couples/:coupleId/photos/:photoId

删除照片（数据库记录 + 异步清理 OSS 文件）。

#### POST /api/couples/:coupleId/photos/:photoId/retry

重新触发失败照片的 AI Pipeline 处理。

```typescript
// Response 200
{ status: "PROCESSING" }
```

### 里程碑模块

#### GET /api/couples/:coupleId/milestones

获取里程碑列表（时间轴数据）。

```typescript
// Query: ?sort=date&order=asc
// Response 200
{
  milestones: [
    {
      id: "ms_xxx",
      title: "第一次去厦门",
      description: "...",
      date: "2024-08-15",
      locationName: "厦门",
      photoId: "photo_xxx",
      isAutoGenerated: true
    }
  ]
}
```

#### POST /api/couples/:coupleId/milestones

手动创建里程碑。

#### PATCH /api/couples/:coupleId/milestones/:milestoneId

编辑里程碑。

#### DELETE /api/couples/:coupleId/milestones/:milestoneId

删除里程碑。

### 上传签名

#### POST /api/upload/sign

获取 OSS 直传签名。需登录。

```typescript
// Request
{
  fileName: "IMG_20240815.jpg",
  fileType: "image/jpeg",
  fileSize: 4500000
}

// Response 200
{
  uploadUrl: "https://bucket.oss-cn-guangzhou.aliyuncs.com/...",
  ossKey: "couples/{coupleId}/photos/{uuid}/original.jpg",
  credentials: {
    accessKeyId: "STS.xxx",
    accessKeySecret: "xxx",
    securityToken: "xxx",
    expiration: "2024-08-15T18:20:00Z"
  }
}

// Error 413 — 文件过大（> 5MB）
// Error 415 — 不支持的文件类型
```

**文件校验规则**：
- 支持格式：image/jpeg, image/png, image/webp, image/heic
- 最大文件大小：5MB（前端压缩后）
- HEIC 格式在前端转换为 JPEG 后上传

### 公开访问模块

公开 API 不需要登录，但只返回已设为公开的空间数据。

#### GET /api/public/:slug

获取公开空间首页数据。

```typescript
// Response 200
{
  name: "Lin & XX",
  startDate: "2020-01-01",
  coverPhotoUrl: "...",
  bio: "我们的故事...",
  daysTogether: 1956,
  theme: "default"
}

// Error 404 — 空间不存在或未公开
```

#### GET /api/public/:slug/photos

获取公开空间的照片列表（仅 READY 状态）。

```typescript
// Query: ?albumId=xxx&page=1&limit=20
// Response 200
{
  photos: [
    {
      id, displayUrl, thumbnailUrl, takenAt, locationName,
      caption,          // 优先返回 userCaption，否则返回 aiCaption
      layout: "cinema-wide",
      cameraMake, cameraModel, focalLength, aperture, shutterSpeed, iso
    }
  ],
  total: 42
}
```

#### GET /api/public/:slug/timeline

获取公开空间的时间轴数据。

```typescript
// Response 200
{
  milestones: [
    { title, description, date, locationName, photoThumbnailUrl }
  ]
}
```

### 邀请模块

#### POST /api/couples/:coupleId/invite

生成邀请链接。需 OWNER 权限。

```typescript
// Response 201
{
  inviteCode: "abc123def",
  inviteUrl: "https://domain.com/invite/abc123def",
  expiresAt: "2024-08-22T00:00:00Z"   // 7 天有效
}
```

#### POST /api/invite/:code/accept

接受邀请，加入空间成为 PARTNER。需登录。

```typescript
// Response 200
{
  couple: { id, slug, name },
  role: "PARTNER"
}

// Error 404 — 邀请码不存在或已过期
// Error 409 — 已经是该空间成员
```

### Pipeline 执行记录（管理后台用）

#### GET /api/couples/:coupleId/pipelines

获取 Pipeline 执行历史。需 OWNER 权限。

```typescript
// Query: ?page=1&limit=20
// Response 200
{
  runs: [
    {
      id: "run_xxx",
      photoId: "photo_xxx",
      status: "COMPLETED",
      nodeResults: { ... },
      totalTokens: 3100,
      totalCost: 0.022,
      duration: 12500,
      startedAt: "2024-08-15T18:06:00Z"
    }
  ],
  total: 42,
  stats: {
    totalRuns: 42,
    successRate: 0.95,
    avgDuration: 13200,
    totalCost: 0.92
  }
}
```

## 通用响应格式

### 成功响应

```typescript
// 单个资源
{ id, ...fields }

// 列表（带分页）
{
  [resourceName]: [...],
  total: number,
  page: number,       // 可选
  limit: number       // 可选
}
```

### 错误响应

```typescript
{
  error: string,       // 错误类型标识
  message: string      // 人类可读的错误描述
}
```

### HTTP 状态码规范

| 状态码 | 含义 | 使用场景 |
|-------|------|---------|
| 200 | OK | GET、PATCH 成功 |
| 201 | Created | POST 创建成功 |
| 204 | No Content | DELETE 成功 |
| 400 | Bad Request | 请求参数校验失败 |
| 401 | Unauthorized | 未登录 |
| 403 | Forbidden | 无权限 |
| 404 | Not Found | 资源不存在 |
| 409 | Conflict | 唯一约束冲突 |
| 413 | Payload Too Large | 文件过大 |
| 415 | Unsupported Media Type | 不支持的文件格式 |
| 500 | Internal Server Error | 服务端错误 |
