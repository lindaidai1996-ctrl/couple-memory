# 情侣记忆网站 MVP 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个 AI 驱动的情侣记忆展示平台 MVP，支持照片上传、AI 分析生成文案/排版、公开展示页面。

**Architecture:** Next.js 15 App Router 全栈单仓库，PostgreSQL + Prisma ORM，阿里云 OSS 直传 + CDN，自建 DAG Pipeline 引擎编排 4 个 AI Agent（Claude Vision + DeepSeek），Docker Compose 单机部署。

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, Framer Motion, Prisma, PostgreSQL, Sharp, exifr, NextAuth.js v5, 阿里云 OSS/STS, Claude API, DeepSeek API, 高德地图 API, Docker Compose

---

## 执行阶段规划

| 阶段 | 内容 | 任务数 | 预估时间 | 详细计划 |
|------|------|--------|---------|---------|
| Phase 1 | 项目基建 + 数据库 + 认证 | 9 | 2-3 天 | [phase-1-foundation.md](./phase-1-foundation.md) |
| Phase 2 | 图片上传管道（OSS + 处理） | 5 | 2-3 天 | [phase-2-image-pipeline.md](./phase-2-image-pipeline.md) |
| Phase 3 | AI Agent Pipeline 引擎 | 6 | 3-4 天 | [phase-3-ai-pipeline.md](./phase-3-ai-pipeline.md) |
| Phase 4 | 前端页面 + 公开展示 | 10 | 3-4 天 | [phase-4-frontend.md](./phase-4-frontend.md) |
| Phase 5 | 部署 + 联调 | 7 | 1-2 天 | [phase-5-deployment.md](./phase-5-deployment.md) |

**P0 合计：37 个任务，预估 11-16 天**

---

## P1 任务清单（MVP 后立即迭代）

详见: [p1-p2-backlog.md](./p1-p2-backlog.md)

| # | 任务 | 模块 |
|---|------|------|
| P1-1 | 照片批量操作（多选、批量删除/移动） | 前端 |
| P1-2 | 相册封面自动设置（首张照片） | 后端 |
| P1-3 | 照片排序拖拽 | 前端 |
| P1-4 | 用户头像上传 | 全栈 |
| P1-5 | 空间封面照片设置 | 全栈 |
| P1-6 | AI 文案重新生成按钮 | 全栈 |
| P1-7 | 管理后台 Pipeline 执行记录查看 | 前端 |
| P1-8 | SEO 优化（meta、OG、结构化数据） | 前端 |
| P1-9 | 图片预加载 + 骨架屏 | 前端 |
| P1-10 | 错误边界 + 全局错误处理 UI | 前端 |
| P1-11 | 邀请链接页面 UI | 前端 |
| P1-12 | 深色模式 | 前端 |
| P1-13 | 国际化基础框架 | 前端 |

## P2 任务清单（未来规划）

| # | 任务 | 模块 |
|---|------|------|
| P2-1 | 子域名路由模式 `{slug}.domain.com` | 部署 |
| P2-2 | SSE/WebSocket 实时推送替代轮询 | 全栈 |
| P2-3 | 付费计划 + 限额管理 | 全栈 |
| P2-4 | 微信 OAuth 登录 | 后端 |
| P2-5 | 多主题系统（5+ 可选主题） | 前端 |
| P2-6 | 照片评论/互动功能 | 全栈 |
| P2-7 | 数据导出（照片打包下载） | 后端 |
| P2-8 | CDN 加速 Next.js 静态资源 | 部署 |
| P2-9 | PostgreSQL 读写分离 | 部署 |
| P2-10 | K8s 容器编排迁移 | 部署 |
| P2-11 | Grafana + Prometheus 监控 | 运维 |
| P2-12 | Sentry 错误追踪 | 运维 |
| P2-13 | 水印功能 | 后端 |
| P2-14 | 视频支持 | 全栈 |
| P2-15 | 分享海报生成 | 全栈 |
