# P1 前端体验设计规格

> 覆盖范围：P1-9（骨架屏 + 预加载）、P1-10（错误边界）、P1-11（邀请链接页面）

---

## 设计体系约束

以下决策来自已确认的前端设计方案，本规格严格遵循：

- **双色调体系**：后台 `warm-*` 暖色 / 公开页 `film-*` 暗色
- **字体**：得意黑(标题) + 阿里巴巴普惠体(正文) + DM Sans(英文/数字)
- **圆角**：4 级递进 `--radius-sm: 6px / --radius-md: 12px / --radius-lg: 20px / --radius-xl: 28px`
- **动效原则**：公开页 Framer Motion（滚动触发+交错），后台纯 CSS transition
- **状态色**：`--color-error: #d94545 / --color-success: #4a9e6b / --color-info: #5b8fd4`

---

## P1-9：骨架屏 + 预加载

### 动画风格

**Shimmer（微光扫过）** — 高光从左向右横扫占位块。

```css
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
```

- 后台色值：`linear-gradient(90deg, var(--color-warm-border) 25%, var(--color-warm-sidebar) 50%, var(--color-warm-border) 75%)`
- 公开页色值：`linear-gradient(90deg, var(--color-film-surface) 25%, #2e2e2e 50%, var(--color-film-surface) 75%)`
- 动画时长：1.5s，infinite，ease-in-out
- background-size: 200% 100%

### 覆盖页面

| 页面 | 主题 | 骨架内容 |
|------|------|---------|
| 相册详情 (照片网格) | warm | 3列网格 × 2行 aspect-square 占位块 |
| 相册列表 | warm | 卡片列表占位（封面 + 标题 + 数量行） |
| 设置页 | warm | 表单字段占位（label + input 矩形） |
| 照片详情 Modal | warm | 左侧大图占位 + 右侧信息行占位 |
| Sidebar | warm | 头像圆 + 导航条 × 5 |
| 公开页 PhotoStream | film | 根据 layout 类型生成对应占位形态 |
| 公开页 Timeline | film | 中轴线 + 左右交替卡片占位 |
| 公开首页 Hero | film | 全屏渐变占位 + 居中文字行占位 |

### 组件架构

```
src/components/skeleton/
├── skeleton.tsx            # 基础组件 <Skeleton variant width height radius className />
├── photo-grid-skeleton.tsx # 照片网格骨架
├── album-list-skeleton.tsx # 相册列表骨架
├── settings-form-skeleton.tsx # 设置表单骨架
├── modal-skeleton.tsx      # Modal 内容骨架
├── sidebar-skeleton.tsx    # 侧边栏骨架
├── photo-stream-skeleton.tsx # 公开页 PhotoStream 骨架
├── timeline-skeleton.tsx   # 公开页 Timeline 骨架
└── hero-skeleton.tsx       # 公开首页 Hero 骨架
```

**基础组件 API：**

```tsx
interface SkeletonProps {
  width?: string | number
  height?: string | number
  radius?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  variant?: 'warm' | 'film'  // 自动从上下文推断，也可手动指定
  className?: string
}
```

### 预加载策略

**IntersectionObserver + rootMargin**

- 自定义 hook：`useImagePreload(src, { rootMargin: '200px' })`
- 图片进入视口前 200px 时创建 `new Image()` 预加载
- 配合骨架屏：未加载时显示骨架 → 加载完成后 fade-in 过渡（opacity transition 300ms）
- 后台照片网格：用 `next/image` 的 `loading="lazy"` 作为基础，IntersectionObserver 叠加做提前触发
- 公开页 PhotoStream：自行管理加载态（因为布局复杂，每个 layout 组件各自处理）

---

## P1-10：错误边界

### 架构

利用 Next.js App Router 内置的 `error.tsx` 约定：

```
src/app/
├── error.tsx              # 后台页面通用错误 UI（warm 主题）
├── global-error.tsx       # 根 layout 级别错误兜底（独立完整 HTML）
├── s/[slug]/error.tsx     # 公开页面错误 UI（film 主题）
```

### 视觉设计

**大字排版风格：**

```
┌─────────────────────────────────┐
│                                 │
│           Oops                  │  ← 巨型装饰文字，72px+，极浅色
│                                 │
│       页面开小差了               │  ← 主文案，16px，正常色
│  别担心，刷新一下通常就好了       │  ← 副文案，14px，muted 色
│                                 │
│   [刷新页面]  [返回首页]         │  ← 双按钮
│                                 │
└─────────────────────────────────┘
```

**主题适配：**

| 元素 | warm（后台） | film（公开页） |
|------|-------------|--------------|
| "Oops" 文字 | `warm-border` (#ede8e3) | `film-surface` (#242424 → 用 #3a3a3a 确保可见) |
| 主文案 | `warm-text` | `film-text` |
| 副文案 | `warm-muted` | `film-muted` |
| 主按钮 | `warm-accent` 背景 + 白字 | `film-accent` 背景 + film-text 字 |
| 次按钮 | `warm-border` 边框 + muted 字 | film-surface 边框 + muted 字 |

### 功能

- 主按钮调用 `reset()` 重新渲染当前路由段
- 次按钮调用 `router.push('/')` 返回首页（后台）或 `router.push('/story/[slug]')`（公开页）
- `global-error.tsx` 是完整 `<html>` 文档（Next.js 要求），内联样式，不依赖任何外部资源

---

## P1-11：邀请链接页面

### Partner 接受页

**路由**：`/invite/[code]` — 独立路由，不走 dashboard/public layout

**视觉**：film-* 暗色体系 + 卡片式浮层

```
┌──────────── 全屏 film-bg + grain texture ────────────┐
│                                                       │
│         ┌──────────────────────────┐                  │
│         │      [头像] [?头像]       │  ← 双头像重叠    │
│         │                          │                  │
│         │      Our Story           │  ← 空间名称      │
│         │   小林邀请你成为伴侣      │  ← 邀请文案      │
│         │                          │                  │
│         │     [加入空间]            │  ← CTA 按钮     │
│         │                          │                  │
│         │   邀请将在 6 天后过期      │  ← 过期提示     │
│         └──────────────────────────┘                  │
│                                                       │
└───────────────────────────────────────────────────────┘
```

**卡片样式：**
- 背景：`film-surface` (#242424)
- 边框：`rgba(139,115,85,0.2)` 微光
- 圆角：`radius-xl` (28px)
- 双头像：Owner 用真实头像/首字母圆，Partner 位用 "?" 占位 + muted 色

**异常态 UI：**

| HTTP 状态 | 场景 | UI 表现 |
|-----------|------|---------|
| 404 | 邀请码不存在 | 卡片内显示"邀请链接无效"+ 返回首页按钮 |
| 410 | 邀请已过期 | 卡片内显示"邀请已过期"+ 提示联系对方重新发送 |
| 409 | 空间已满 / 已是成员 | 分别提示"空间已满员"或"你已经是成员了"+ 跳转按钮 |

**未登录处理：**
- 用户未登录时展示邀请信息 + "登录后加入" 按钮
- 点击后跳转登录页，登录成功后 callback 回到邀请页自动执行 accept

### Owner 邀请管理 UI

**位置**：`/(dashboard)/settings` 页面内新增 "邀请伴侣" section

**功能：**

| 状态 | UI |
|------|-----|
| 无邀请码 | "生成邀请链接" 按钮 |
| 有有效邀请码 | 显示完整链接 + 复制按钮 + 剩余有效期 + "重新生成"按钮 |
| 已有伴侣 | 显示伴侣信息（头像 + 名称），隐藏邀请功能 |

**交互细节：**
- 复制成功后按钮文字短暂变为"已复制 ✓"（1.5s 后恢复）
- 重新生成需确认（旧码立即失效）
- 遵循 warm-* 主题，卡片式 section 与 Settings 页其他 section 视觉一致

### 数据流

```
Partner 打开 /invite/[code]
  → 客户端 fetch GET /api/invite/[code]/info （新增：返回空间名+Owner 名+是否过期）
  → 展示邀请信息
  → 点击"加入空间"
  → fetch POST /api/invite/[code]/accept
  → 成功后 redirect 到 /(dashboard)
```

需要新增一个 GET 端点 `/api/invite/[code]/info`（无需登录）：

```json
// 200 OK
{
  "coupleName": "Our Story",
  "ownerName": "小林",
  "ownerAvatar": "https://cdn/avatar.jpg" | null,
  "expiresAt": "2026-05-23T10:00:00Z",
  "memberCount": 1
}

// 404 — 邀请码不存在
// 410 — 邀请已过期（仍返回 coupleName 用于展示）
```

---

## 不在范围内

- 深色模式切换（P1-12 单独处理）
- 国际化文案（P1-13 单独处理）
- 组件级 Error Boundary（当前仅页面级）
- 照片懒加载的虚拟化滚动（属于性能优化，超出本期范围）
