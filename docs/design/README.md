# 情侣记忆网站平台 — 设计文档总览

> 面向中文用户的、摄影师美学的、AI 驱动的情侣记忆网站 SaaS 平台

## 项目定位

一个让情侣用摄影师级别的美学来展示共同记忆的网站平台。每对情侣拥有独立页面，AI 自动完成照片分析、文案生成、排版建议和时间轴构建，用户只需上传照片。

### 核心差异化

| 维度 | 竞品现状 | 我们的方案 |
|------|---------|-----------|
| 视觉风格 | 可爱模板风（LovePage） | 摄影师美学：极简、留白、注重排版 |
| AI 能力 | 无 AI 或仅 AI 建站（Wegic） | 4 个专职 Agent：分析、文案、排版、时间轴 |
| 中文市场 | 海外产品为主，国内仅有 App | Web 端，适配小红书传播场景 |
| 技术深度 | 模板拖拽 | 自建 DAG Agent 引擎 + EXIF 解析 + 地理编码 |

## 技术栈总览

| 层 | 选型 | 说明 |
|---|------|-----|
| 框架 | Next.js 15 (App Router) | 全栈，SSR/SSG |
| 语言 | TypeScript | 全栈统一 |
| 数据库 | PostgreSQL + Prisma | 关系型，ORM 类型安全 |
| 多租户 | 共享数据库 Row-Level | coupleId 隔离 |
| 图片存储 | 阿里云 OSS + CDN | 国内访问快 |
| 图片处理 | Sharp + exifr | 压缩/缩略图/EXIF |
| AI 模型 | Claude (Vision) + DeepSeek (文案) | 混合编排 |
| Agent 编排 | 自建 DAG Pipeline Engine | 拓扑排序 + 并行调度 |
| 认证 | NextAuth.js v5 (Auth.js) | Provider 插件式 |
| 样式 | Tailwind CSS + Framer Motion | 摄影师美学 + 动效 |
| 部署 | Docker Compose 单机 | Nginx + Let's Encrypt |
| 地理编码 | 高德地图 API | GPS → 中文地名 |
| 前端压缩 | browser-image-compression | 客户端预压缩保留 EXIF |

## 项目结构

```
couple-memory/
├── prisma/schema.prisma
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # 登录/注册
│   │   ├── (dashboard)/       # 管理后台
│   │   ├── s/[slug]/          # 公开情侣页面
│   │   └── api/               # API Routes
│   ├── lib/                   # auth.ts, prisma.ts, oss.ts
│   ├── agents/
│   │   ├── engine/            # DAG Pipeline Engine（零外部依赖）
│   │   ├── photo-analyzer/    # Claude Vision Agent
│   │   ├── caption-writer/    # DeepSeek Agent
│   │   ├── layout-advisor/    # DeepSeek Agent
│   │   └── timeline-builder/  # DeepSeek Agent
│   ├── services/              # 业务逻辑层
│   └── components/            # React 组件
├── docs/design/               # 项目级长期设计文档
├── docs/superpowers/          # Superpowers 正式计划与规格文档
├── Dockerfile
├── docker-compose.yml
└── nginx.conf
```

## 设计文档索引

| 文档 | 内容 | 链接 |
|------|-----|------|
| 产品需求 | 用户角色、MVP 功能清单、用户流程、非功能需求 | [product-requirements.md](./product-requirements.md) |
| 技术架构 | 整体架构、技术选型理由、多租户、认证权限、ADR | [architecture.md](./architecture.md) |
| 数据库设计 | ER 关系、7 张表详细字段、索引、Prisma Schema | [database.md](./database.md) |
| AI Agent 架构 | DAG 引擎、4 个 Agent 设计、模型选型、执行追踪 | [ai-agent.md](./ai-agent.md) |
| 图片处理管道 | 前端压缩、OSS 直传、后端处理、EXIF 提取 | [image-pipeline.md](./image-pipeline.md) |
| API 设计 | REST 端点、请求响应格式、认证中间件 | [api-design.md](./api-design.md) |
| 部署方案 | Docker Compose、Nginx、CI/CD、SSL、成本估算 | [deployment.md](./deployment.md) |
| 阶段路线图 | P0 / P1 / P2 的产品方向、优先级与阶段目标 | [2026-05-19-next-stage-product-roadmap.md](./2026-05-19-next-stage-product-roadmap.md) |
| 阶段任务清单 | P0 / P1 / P2 的执行清单与当前状态 | [2026-05-22-product-stage-task-checklist.md](./2026-05-22-product-stage-task-checklist.md) |
| P1 收口结论 | 本轮 P1 叙事层落地结果、剩余验收项、下一步建议 | [2026-05-22-p1-closure-summary.md](./2026-05-22-p1-closure-summary.md) |

## 协作文档入口

Superpowers 相关的正式规格和实施计划已经统一整理到 [docs/superpowers/README.md](/Users/user/Documents/codes/work/docs/superpowers/README.md)：

- 设计规格：`docs/superpowers/specs/`
- 实施计划：`docs/superpowers/plans/`

`.superpowers/` 目录仅保留工具过程产物，不再作为正式文档入口。

## MVP 范围声明

### MVP 必做

- 用户注册/登录（邮箱 + 密码）
- 多租户空间创建与管理
- 照片上传，自动读取 EXIF 信息
- AI 自动生成浪漫文案
- AI 智能排版建议
- 时间轴自动生成
- 照片 + 文字博客式展示的公开页面
- 后台管理面板
- 图片自动压缩、生成缩略图

### MVP 不做

- 婚礼邀请函 / RSVP
- 纪念日提醒
- 访客留言墙
- 分享海报生成
- AI 故事生成 / 风格迁移 / 语音旁白
- AI 对话记忆检索
- 微信/手机号登录（NextAuth Provider 预留扩展能力）
- 子域名模式（MVP 用路径 `/s/slug`）

## 竞品概览

**海外**：LovePage.io（15000+ 用户，无 AI）、Wegic AI（AI 建站，$9.9/月，偏通用）、Appy Couple（婚礼场景）

**国内**：Between、恋爱日常 — 均为 App 形式，Web 端情侣记忆网站平台几乎空白

我们的定位填补了"中文 Web 端 + AI 驱动 + 摄影师美学"这个空白。
