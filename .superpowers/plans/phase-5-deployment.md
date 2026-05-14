# Phase 5: 部署 + 联调

> 返回: [主计划](./2026-05-14-couple-memory-mvp.md)
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

---

### Task 31: Dockerfile 多阶段构建

**Files:**
- Create: `Dockerfile`

- [ ] **Step 1: 编写多阶段 Dockerfile**

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

- [ ] **Step 2: Commit**

```bash
git add Dockerfile && git commit -m "feat: add multi-stage Dockerfile"
```

---

### Task 32: Docker Compose 编排

**Files:**
- Create: `docker-compose.yml`

- [ ] **Step 1: 编写 4 服务 compose 配置**

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

- [ ] **Step 2: Commit**

```bash
git add docker-compose.yml && git commit -m "feat: add Docker Compose configuration"
```

---

### Task 33: Nginx 配置

**Files:**
- Create: `nginx.conf`

- [ ] **Step 1: 编写 Nginx 配置（HTTPS + 反代 + 安全头 + gzip + 缓存）**

```nginx
events {
    worker_connections 1024;
}

http {
    upstream nextjs {
        server app:3000;
    }

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

    server {
        listen 443 ssl http2;
        server_name your-domain.com;

        ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers HIGH:!aNULL:!MD5;
        ssl_prefer_server_ciphers on;

        add_header X-Frame-Options SAMEORIGIN;
        add_header X-Content-Type-Options nosniff;
        add_header X-XSS-Protection "1; mode=block";
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

        gzip on;
        gzip_types text/plain text/css application/json application/javascript text/xml;
        gzip_min_length 1000;

        location /_next/static/ {
            proxy_pass http://nextjs;
            expires 365d;
            add_header Cache-Control "public, immutable";
        }

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

        client_max_body_size 10m;
    }
}
```

- [ ] **Step 2: Commit**

```bash
git add nginx.conf && git commit -m "feat: add Nginx configuration with SSL and security headers"
```

---

### Task 34: 健康检查端点

**Files:**
- Create: `src/app/api/health/route.ts`

- [ ] **Step 1: 实现 /api/health**

```typescript
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'

export async function GET() {
  const checks: Record<string, { status: string; error?: string }> = {}

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = { status: 'ok' }
  } catch (err: any) {
    checks.database = { status: 'error', error: err.message }
  }

  const healthy = Object.values(checks).every(c => c.status === 'ok')

  return NextResponse.json(
    { status: healthy ? 'ok' : 'degraded', checks, timestamp: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add . && git commit -m "feat: add health check endpoint"
```

---

### Task 35: GitHub Actions CI/CD

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: 编写 CI/CD workflow**

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

      - name: Install & Lint & Type-check
        run: |
          npm ci
          npm run lint
          npx tsc --noEmit

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
            sleep 5
            curl -f http://localhost:3000/api/health || exit 1
```

- [ ] **Step 2: Commit**

```bash
git add .github/ && git commit -m "feat: add GitHub Actions CI/CD pipeline"
```

---

### Task 36: 数据库备份脚本

**Files:**
- Create: `scripts/backup.sh`

- [ ] **Step 1: 编写 pg_dump 备份脚本**

```bash
#!/bin/bash
# 每日凌晨 2 点通过 crontab 执行
BACKUP_DIR="/opt/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p "${BACKUP_DIR}"

docker compose exec -T postgres pg_dump -U postgres couple_memory \
  | gzip > "${BACKUP_DIR}/couple_memory_${DATE}.sql.gz"

# 保留最近 30 天
find "${BACKUP_DIR}" -name "*.sql.gz" -mtime +30 -delete

echo "[$(date)] Backup completed: couple_memory_${DATE}.sql.gz"
```

- [ ] **Step 2: Commit**

```bash
chmod +x scripts/backup.sh
git add scripts/ && git commit -m "feat: add database backup script"
```

---

### Task 37: 端到端联调测试

- [ ] **Step 1: 本地 docker compose up 启动完整服务栈**

```bash
cp .env.example .env  # 填入实际配置
docker compose up --build
```
Expected: 所有 4 个服务正常启动

- [ ] **Step 2: 完整流程测试**

1. 注册新用户 → 自动创建空间
2. 登录 → 进入仪表盘
3. 创建相册 → 上传照片
4. 等待处理完成（轮询 3s）→ 照片变为 READY
5. 设置空间为公开 → 通过 `/s/{slug}` 访问公开页面
6. 验证照片流 5 种排版展示正确
7. 验证时间轴页面展示

- [ ] **Step 3: 修复联调中发现的问题**

- [ ] **Step 4: Commit**

```bash
git add . && git commit -m "fix: resolve integration issues from e2e testing"
```
