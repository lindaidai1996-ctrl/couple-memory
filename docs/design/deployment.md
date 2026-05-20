# 部署方案

> 本文档描述 Docker Compose 部署架构、Nginx 配置、CI/CD 流程、SSL 证书和成本估算。
>
> 相关文档：[总览](./README.md) · [技术架构](./architecture.md)

## 部署架构

```
                    ┌─────────────┐
                    │  用户浏览器   │
                    └──────┬──────┘
                           │ HTTPS
                           ▼
┌──────────────────────────────────────────┐
│              云服务器 (单机)               │
│                                          │
│  ┌──────────────────────────────┐        │
│  │  Nginx (反向代理 + SSL)       │        │
│  │  Let's Encrypt 免费证书       │        │
│  └──────────┬───────────────────┘        │
│             │ :3000                       │
│  ┌──────────▼───────────────────┐        │
│  │  Next.js App (Docker)         │        │
│  │  Node.js 20 + App Router      │        │
│  │  包含 API Routes + SSR        │        │
│  └──────────┬───────────────────┘        │
│             │ :5432                       │
│  ┌──────────▼───────────────────┐        │
│  │  PostgreSQL 16 (Docker)       │        │
│  │  数据卷持久化                  │        │
│  └──────────────────────────────┘        │
│                                          │
└──────────────────────────────────────────┘
             │                    │
             ▼                    ▼
     ┌──────────────┐   ┌───────────────────┐
     │ 阿里云 OSS+CDN │   │ 外部 API 服务      │
     │ 图片存储与分发  │   │ Claude / DeepSeek  │
     └──────────────┘   │ 高德地图            │
                        └───────────────────┘
```

### 为什么选择 Docker Compose 单机

- MVP 阶段预期用户量 < 1000，单机足够支撑
- Docker Compose 部署简单，维护成本低
- 图片走 OSS + CDN，服务器不承担图片带宽
- 后续如需水平扩展，可迁移到 Docker Swarm 或 K8s

## Docker Compose 配置

```yaml
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:${DB_PASSWORD}@postgres:5432/couple_memory
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - OSS_ACCESS_KEY_ID=${OSS_ACCESS_KEY_ID}
      - OSS_ACCESS_KEY_SECRET=${OSS_ACCESS_KEY_SECRET}
      - OSS_BUCKET=${OSS_BUCKET}
      - OSS_REGION=${OSS_REGION}
      - OSS_CDN_DOMAIN=${OSS_CDN_DOMAIN}
      - QWEN_API_KEY=${QWEN_API_KEY}
      - QWEN_VISION_MODEL=${QWEN_VISION_MODEL}
      - QWEN_BASE_URL=${QWEN_BASE_URL}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - OPENAI_VISION_MODEL=${OPENAI_VISION_MODEL}
      - CLAUDE_API_KEY=${CLAUDE_API_KEY}
      - DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY}
      - AMAP_API_KEY=${AMAP_API_KEY}
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_DB=couple_memory
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certbot/conf:/etc/letsencrypt:ro
      - ./certbot/www:/var/www/certbot:ro
    depends_on:
      - app
    restart: unless-stopped

  certbot:
    image: certbot/certbot
    volumes:
      - ./certbot/conf:/etc/letsencrypt
      - ./certbot/www:/var/www/certbot
    entrypoint: "/bin/sh -c 'trap exit TERM; while :; do certbot renew; sleep 12h; done'"

volumes:
  postgres_data:
```

## Dockerfile

```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

FROM base AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "server.js"]
```

使用多阶段构建，最终镜像只包含生产依赖和构建产物，体积最小化。

## Nginx 配置

```nginx
events {
    worker_connections 1024;
}

http {
    upstream nextjs {
        server app:3000;
    }

    # HTTP → HTTPS 重定向
    server {
        listen 80;
        server_name your-domain.com;

        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }

        location / {
            return 301 https://$host$request_uri;
        }
    }

    # HTTPS 主配置
    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

        # SSL 安全配置
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        # 安全头
        add_header X-Frame-Options SAMEORIGIN;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        # Gzip
        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml;
        gzip_min_length 1000;

        # 静态资源缓存
        location /_next/static/ {
            proxy_pass http://nextjs;
            expires 365d;
            add_header Cache-Control "public, immutable";
        }

        # API 和页面
        location / {
            proxy_pass http://nextjs;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }

        # 上传大小限制
        client_max_body_size 10m;
    }
}
```

## CI/CD 流程

基于 GitHub Actions，推送到 main 分支自动部署。

```
代码推送 main
     │
     ▼
┌─────────────────────┐
│ GitHub Actions       │
│ 1. 安装依赖          │
│ 2. 运行 lint + 类型检查│
│ 3. 运行测试           │
│ 4. 构建 Docker 镜像   │
│ 5. 推送到阿里云 ACR   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ SSH 到服务器         │
│ 1. 拉取新镜像        │
│ 2. docker compose up│
│ 3. 运行 prisma migrate│
│ 4. 健康检查          │
└─────────────────────┘
```

### GitHub Actions 配置概要

```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install & Test
        run: |
          npm ci
          npm run lint
          npm run type-check
          npm test

      - name: Build & Push Docker Image
        run: |
          docker build -t registry.cn-guangzhou.aliyuncs.com/couple-memory/app:${{ github.sha }} .
          docker push registry.cn-guangzhou.aliyuncs.com/couple-memory/app:${{ github.sha }}

      - name: Deploy to Server
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /opt/couple-memory
            docker compose pull
            docker compose up -d
            docker compose exec app npx prisma migrate deploy
            # 健康检查
            sleep 5
            curl -f http://localhost:3000/api/health || exit 1
```

## SSL 证书

使用 Let's Encrypt 免费 SSL 证书，通过 Certbot Docker 容器自动申请和续期。

### 首次申请

```bash
docker compose run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d your-domain.com \
  --email your-email@example.com \
  --agree-tos --no-eff-email
```

### 自动续期

Certbot 容器每 12 小时检查一次证书有效期，到期前 30 天自动续期。Nginx 需要 reload 才能加载新证书，可通过 cron job 实现：

```bash
# 每周一凌晨 3 点 reload nginx
0 3 * * 1 docker compose exec nginx nginx -s reload
```

## 数据备份

### PostgreSQL 备份

```bash
#!/bin/bash
# backup.sh — 每日凌晨 2 点执行
BACKUP_DIR="/opt/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

docker compose exec -T postgres pg_dump -U postgres couple_memory \
  | gzip > "${BACKUP_DIR}/couple_memory_${DATE}.sql.gz"

# 保留最近 30 天的备份
find ${BACKUP_DIR} -name "*.sql.gz" -mtime +30 -delete
```

```bash
# crontab
0 2 * * * /opt/couple-memory/backup.sh
```

### 备份恢复

```bash
gunzip -c couple_memory_20240815.sql.gz | \
  docker compose exec -T postgres psql -U postgres couple_memory
```

## 环境变量管理

所有敏感配置通过 `.env` 文件管理，**不纳入 Git**。

```bash
# .env（服务器上的实际文件）
# 数据库
DB_PASSWORD=your_secure_password

# NextAuth
NEXTAUTH_SECRET=your_random_secret
NEXTAUTH_URL=https://your-domain.com

# 阿里云 OSS
OSS_ACCESS_KEY_ID=xxx
OSS_ACCESS_KEY_SECRET=xxx
OSS_BUCKET=couple-memory-bucket
OSS_REGION=oss-cn-guangzhou
OSS_CDN_DOMAIN=cdn.your-domain.com

# AI 服务
QWEN_API_KEY=sk-aliyun-xxx
QWEN_VISION_MODEL=qwen-vl-plus
QWEN_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
OPENAI_API_KEY=sk-proj-xxx
OPENAI_VISION_MODEL=gpt-4.1-mini
CLAUDE_API_KEY=sk-ant-xxx
DEEPSEEK_API_KEY=sk-xxx

# 高德地图
AMAP_API_KEY=xxx
```

当前视觉模型 provider 优先级：
1. `QWEN_API_KEY`
2. `OPENAI_API_KEY`
3. `CLAUDE_API_KEY`
4. 无视觉 provider 时降级为保守元数据分析

提供 `.env.example` 模板纳入 Git，列出所有需要的变量名（无值）。

## 服务器选型与成本估算

### 推荐服务器配置

| 配置 | 规格 | 说明 |
|------|------|------|
| CPU | 2 核 | Next.js + PostgreSQL + Sharp |
| 内存 | 4 GB | Sharp 图片处理需要内存 |
| 系统盘 | 40 GB SSD | 系统 + Docker 镜像 |
| 数据盘 | 20 GB SSD | PostgreSQL 数据 |
| 带宽 | 3-5 Mbps | 图片走 OSS CDN，服务器带宽需求低 |

### 月成本估算

| 项目 | 费用/月 | 说明 |
|------|--------|------|
| 云服务器（2C4G） | ¥50-80 | 阿里云/腾讯云轻量应用服务器 |
| 阿里云 OSS | ¥5-20 | 按存储量和请求量计费 |
| CDN 流量 | ¥5-30 | 按实际访问流量计费 |
| AI API 调用 | ¥5-30 | Claude + DeepSeek，按量计费 |
| 高德地图 API | ¥0 | 免费额度 5000次/天 |
| 域名 | ¥5-8 | .com 域名年费分摊 |
| SSL 证书 | ¥0 | Let's Encrypt 免费 |
| **合计** | **¥70-168** | |

### 扩展路径

当用户增长超出单机承载能力时：

1. **垂直扩展**：升级服务器配置（4C8G → 8C16G）
2. **读写分离**：PostgreSQL 主从复制，读请求走从库
3. **容器编排**：迁移到 Docker Swarm 或 K8s
4. **CDN 加速**：将 Next.js 静态资源也部署到 CDN

## 监控与告警

### 健康检查端点

```typescript
// GET /api/health
export async function GET() {
  const checks = {
    database: await checkDatabase(),   // Prisma 连接检查
    oss: await checkOSS(),             // OSS 连通性检查
  }

  const healthy = Object.values(checks).every(c => c.status === 'ok')

  return Response.json(
    { status: healthy ? 'ok' : 'degraded', checks },
    { status: healthy ? 200 : 503 }
  )
}
```

### 基础监控

MVP 阶段使用简单的监控方案：

- **Uptime 监控**：UptimeRobot（免费），每 5 分钟检查 `/api/health`
- **服务器监控**：云服务商自带的 CPU/内存/磁盘监控
- **错误日志**：`docker compose logs -f app` 查看应用日志
- **数据库大小**：定期检查 PostgreSQL 数据量

MVP 后可引入 Grafana + Prometheus 或 Sentry 进行更专业的监控。
