# 技术架构设计

> 本文档描述整体架构、技术选型理由、多租户方案、认证权限模型和关键设计决策。
>
> 相关文档：[总览](./README.md) · [数据库设计](./database.md) · [AI Agent 架构](./ai-agent.md) · [部署方案](./deployment.md)

## 整体架构

```
┌─────────────────────────────────────────────────────┐
│                     Client (Browser)                 │
│  React Components + Framer Motion + Tailwind CSS     │
│  browser-image-compression (前端预压缩)               │
└──────────────┬────────────────────┬──────────────────┘
               │ API 请求            │ OSS 直传
               ▼                    ▼
┌──────────────────────┐  ┌─────────────────────┐
│   Next.js 15 Server  │  │   阿里云 OSS + CDN   │
│   App Router + API   │  │   图片存储与分发      │
│   NextAuth v5        │  └─────────────────────┘
│   Services 层        │
│   Agent Pipeline     │
└──────┬───────┬───────┘
       │       │
       ▼       ▼
┌────────┐ ┌─────────────────────────────────┐
│PostgreSQL│ │       外部 AI 服务                │
│ Prisma  │ │  Claude Vision + DeepSeek API   │
└────────┘ │  高德地图 API (逆地理编码)        │
            └─────────────────────────────────┘
```

**数据流概要**：

1. 用户在浏览器操作，React 组件通过 API Routes 与服务端交互
2. 图片走 OSS 直传通道（不经 Next.js 服务端），减轻服务器带宽压力
3. 服务端处理业务逻辑，通过 Prisma 操作 PostgreSQL
4. AI Pipeline 调用外部模型 API，结果写回数据库
5. 公开页面通过 SSR/SSG 渲染，图片从 CDN 分发

## 技术选型理由

### Next.js 15 (App Router) — 全栈框架

**为什么选它**：前后端统一技术栈，App Router 提供 Server Components / Server Actions，减少客户端 JS 体积。SSR 保证公开页面的 SEO 和首屏速度。API Routes 即可满足 MVP 的后端需求，无需独立后端服务。

**为什么不选 Nuxt**：Vue 生态的动效库不如 Framer Motion 成熟，且个人 React 经验更深。

**为什么不选 Remix**：Remix 的数据加载模式更适合表单密集型应用，情侣网站偏展示型，Next.js 的 ISR/SSG 更合适。

### PostgreSQL + Prisma — 数据层

**为什么 PostgreSQL**：关系型数据天然适合用户-空间-照片的层级关系，事务支持强，多租户 Row-Level 隔离成熟。

**为什么不选 MongoDB**：照片数据虽然字段多但结构固定（EXIF 字段是标准化的），不需要 schema-less 的灵活性。关系查询（"某空间下某相册的照片按时间排序"）在 SQL 中更直观。

**为什么用 Prisma**：TypeScript 类型安全的 ORM，schema-first 设计与项目需求匹配，Prisma Migrate 管理数据库迁移。

### Tailwind CSS + Framer Motion — 前端样式与动效

**为什么 Tailwind**：实用优先，快速构建摄影师美学 UI。与 Next.js 生态集成成熟。

**为什么 Framer Motion**：公开页面需要流畅的滚动动效、照片入场动画、页面切换过渡。Framer Motion 是 React 生态中最成熟的声明式动效库。

### 阿里云 OSS + CDN — 图片存储

**为什么不选七牛/腾讯 COS**：阿里云 OSS 国内节点覆盖最广，CDN 回源速度快。STS 临时凭证机制成熟，适合前端直传场景。价格在同类产品中有竞争力。

### Claude Vision + DeepSeek — AI 模型

**为什么混合模型**：Claude Vision 在图片理解方面能力强，用于照片分析（场景/情绪/构图）。DeepSeek 中文文案生成质量高且成本低，用于文案/排版/时间轴。混合编排在效果和成本间取得平衡。

详见 [AI Agent 架构](./ai-agent.md)。

## 多租户架构

### 隔离模式：共享数据库 Row-Level

所有租户（情侣空间）共享同一个数据库，通过 `coupleId` 字段实现数据隔离。

```
┌─────────────────────────────────┐
│         PostgreSQL               │
│  ┌───────┐ ┌───────┐ ┌───────┐ │
│  │Couple1│ │Couple2│ │Couple3│ │  ← 同一张表，coupleId 隔离
│  └───────┘ └───────┘ └───────┘ │
└─────────────────────────────────┘
```

**为什么不用独立 Schema 或独立数据库**：MVP 阶段用户量小（预期 < 1000），Row-Level 隔离最简单，运维成本最低。当用户量增长到需要物理隔离时，可升级方案。

### URL 路由

MVP 采用路径模式：`https://domain.com/s/{slug}`

后续可升级为子域名模式 `{slug}.domain.com`，需配置通配符 SSL 证书和 Nginx 路由。

### 隔离保证

每个涉及租户数据的 API 都经过中间件链校验：

```
请求 → 验证 session → 提取 coupleId → 校验用户归属 → 校验角色权限 → 业务逻辑
```

Prisma 查询层面，所有涉及租户数据的查询都必须带 `where: { coupleId }` 条件。Services 层封装此逻辑，避免遗漏。

## 认证与权限模型

### 认证方案

NextAuth.js v5（Auth.js），MVP 使用 Credentials Provider（邮箱 + 密码）。

Provider 插件式架构，后续可无缝添加：
- 微信 OAuth（需企业资质）
- GitHub OAuth（开发者群体）
- 手机号 + 验证码

### 权限模型

三级权限，通过 CoupleUser 关联表的 `role` 字段控制：

| 操作 | OWNER | PARTNER | 访客 |
|------|-------|---------|-----|
| 查看公开页面 | ✅ | ✅ | ✅ |
| 上传照片 | ✅ | ✅ | ❌ |
| 编辑文案 | ✅ | ✅ | ❌ |
| 管理相册 | ✅ | ✅ | ❌ |
| 管理里程碑 | ✅ | ✅ | ❌ |
| 编辑空间设置 | ✅ | ❌ | ❌ |
| 删除空间 | ✅ | ❌ | ❌ |
| 邀请 Partner | ✅ | ❌ | ❌ |

### 中间件实现

```typescript
// 伪代码：API 权限中间件链
async function withCoupleAuth(req, { requiredRole }) {
  const session = await getServerSession()    // 1. 验证登录
  if (!session) return 401

  const coupleUser = await getCoupleUser(      // 2. 验证归属
    session.user.id, req.params.coupleId
  )
  if (!coupleUser) return 403

  if (requiredRole === 'OWNER'                 // 3. 验证角色
      && coupleUser.role !== 'OWNER') return 403

  return next({ session, coupleUser })
}
```

## 关键设计决策记录（ADR）

### ADR-1: 单仓 vs Monorepo

**决策**：单一 Next.js 项目（非 Monorepo）

**理由**：MVP 阶段只有一个应用，Monorepo 增加不必要的构建复杂度。`agents/engine/` 目录保持零外部依赖，如果未来需要独立发布为 npm 包，可以直接拆出。

### ADR-2: 客户端预压缩 vs 服务端压缩

**决策**：客户端 browser-image-compression 预压缩，保留 EXIF

**理由**：大图（10MB+）上传占用服务器带宽和内存。客户端先压缩到 5MB 以内再上传 OSS，服务端只做缩略图生成。关键点是 browser-image-compression 支持保留 EXIF 信息（`preserveExif: true`），不会丢失拍摄数据。

### ADR-3: 路径模式 vs 子域名

**决策**：MVP 用路径模式 `/s/{slug}`

**理由**：路径模式不需要通配符 SSL 证书，Nginx 配置简单，部署成本低。子域名模式的好处（更短的 URL、品牌感）在 MVP 阶段不是必需的。升级路径清晰：加通配符证书 + 修改 Nginx 路由即可。

### ADR-4: 自建 DAG 引擎 vs 现有编排框架

**决策**：自建轻量级 DAG Pipeline Engine

**理由**：现有框架（LangChain、LlamaIndex）偏重 LLM 编排，引入大量不需要的依赖。我们的 Agent 关系是固定的 DAG（不是动态 LLM 决策路由），自建引擎代码量小（~300 行）、逻辑透明、面试时能完整讲清楚。

详见 [AI Agent 架构](./ai-agent.md)。

### ADR-5: REST vs GraphQL vs tRPC

**决策**：REST 风格 API

**理由**：API 消费者只有自己的前端，不需要 GraphQL 的灵活查询能力。tRPC 虽然类型安全但与 NextAuth 的集成不如 REST + Server Actions 成熟。REST 简单直接，调试方便。
