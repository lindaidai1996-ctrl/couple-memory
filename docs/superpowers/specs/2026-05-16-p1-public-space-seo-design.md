# P1 公开空间 SEO 设计

> 适用范围：`P1-8 SEO 优化` 中与公开空间核心分发直接相关的部分。
>
> 相关文档：
> - [2026-05-16-p1-public-space-configuration-design.md](./2026-05-16-p1-public-space-configuration-design.md)

## 背景与现状

当前公开空间页面已经存在，但 SEO 基础仍然很弱：

- 根布局和公开布局只有静态 metadata
- 公开页面主要通过客户端 `fetch` 获取数据
- 没有 `generateMetadata`
- 没有页面级 Open Graph、Twitter、canonical、robots 规则
- 没有结构化数据

这意味着：

- 搜索引擎和社交平台拿不到空间级标题、简介、封面
- 未公开空间的索引策略不明确
- 公开空间虽然“能访问”，但不具备稳定分发质量

## 设计目标

1. 为公开空间首页、照片页、时间轴页生成稳定的页面级 metadata。
2. 让封面、简介、空间名称等公开配置成为 SEO 的稳定来源。
3. 明确 canonical、robots、未公开空间和 404 的行为。
4. 补充最小可用的结构化数据。

## 非目标

- 不做复杂的动态 OG 图片生成
- 不做 sitemap 平台化后台
- 不做多语言 SEO
- 不在本设计中处理设置页配置流程

## 核心设计原则

### SEO 数据必须服务端可得

metadata 不能依赖客户端 `fetch` 后再拼接。P1 必须让公开页在服务端就能拿到：

- 空间名称
- 简介
- 公开开关
- 封面图
- slug

### 公共页面统一策略，页面差异化标题

三类公开页遵循统一规则，但标题与摘要区分：

- 首页
- 照片页
- 时间轴页

### 未公开空间不被索引

未公开空间不应该暴露元数据，也不应该被搜索引擎索引。

## 渲染策略

P1 建议将以下页面从“客户端拉取数据”转为“服务端直接获取数据并渲染 metadata”：

- `/story/[slug]`
- `/story/[slug]/photos`
- `/story/[slug]/timeline`

实现方向：

- 页面主体是否继续保留部分 client component 可以接受
- 但页面级 metadata 必须由 server side 路由层生成

## 元数据来源规则

统一来源于 `Couple` 公开配置：

- `title` 来源：`Couple.name`
- `description` 来源优先级：
  1. `Couple.bio`
  2. 默认文案，例如“我们一起记录的照片与时间”
- `image` 来源优先级：
  1. `Couple.coverPhotoUrl`
  2. 无图则不输出页面级 image

### 页面级标题规则

#### `/story/[slug]`

- `title`: `{空间名} | Couple Memory`
- `description`: `bio` 或默认简介

#### `/story/[slug]/photos`

- `title`: `{空间名} 的照片 | Couple Memory`
- `description`: `查看 {空间名} 的照片记录`

#### `/story/[slug]/timeline`

- `title`: `{空间名} 的时间轴 | Couple Memory`
- `description`: `查看 {空间名} 的时间节点与回忆`

## Metadata 输出策略

### 基础字段

每个公开页至少输出：

- `title`
- `description`
- `alternates.canonical`
- `openGraph`
- `twitter`

### Open Graph

建议输出：

- `og:title`
- `og:description`
- `og:type = website`
- `og:url`
- `og:image`，若有空间封面

### Twitter

建议输出：

- `twitter:card = summary_large_image`
- `twitter:title`
- `twitter:description`
- `twitter:image`

### canonical

每个公开页都输出自身绝对地址，例如：

- `https://domain.com/story/our-story`
- `https://domain.com/story/our-story/photos`
- `https://domain.com/story/our-story/timeline`

### robots

- 公开空间：`index, follow`
- 未公开空间：不输出公开页面，直接走 404 语义

## 结构化数据

P1 采用最小集策略。

### 首页

建议输出：

- `WebSite`
- `ProfilePage` 或 `AboutPage`

字段来源：

- 名称：`Couple.name`
- 描述：`Couple.bio`
- URL：空间公开地址

### 照片页

建议输出：

- `CollectionPage`

### 时间轴页

建议输出：

- `CollectionPage`

P1 不在结构化数据里展开每一张照片或每个 milestone 的 item 级 schema，避免复杂度过高。

## 接口与数据依赖

metadata 生成不应依赖公开 API 的客户端 fetch。建议：

- 页面服务端直接读取数据库或复用服务层
- 避免走一层 HTTP 请求再回源应用自身

最少依赖字段：

- `name`
- `slug`
- `bio`
- `isPublic`
- `coverPhotoUrl`

## 未公开空间与异常处理

### 未公开空间

- 返回 404 语义
- 不输出公开 metadata
- 不输出结构化数据

### 缺少封面

- metadata 不输出 image
- 页面本身退回纯文本 Hero

### bio 为空

- 使用默认描述文案

### slug 非法或空间不存在

- 返回 404 页面
- canonical 和 metadata 不生成空间信息

## 页面级策略摘要

### 首页

- 最完整的 metadata
- 优先使用空间封面
- 输出结构化数据

### 照片页

- 强调“照片集合”
- 若空间封面存在，可复用该图

### 时间轴页

- 强调“时间节点”
- 若空间封面存在，可复用该图

## 测试与验收

### 单元测试

- metadata 字段拼接规则
- description 与 image 的回退逻辑
- 未公开空间的 404 逻辑

### 页面测试

- 首页输出正确 title/description
- 照片页与时间轴页输出正确 canonical
- 有封面时输出 og:image
- 无封面时不输出错误 image

### 集成测试

- 设置页更新空间名称、简介、封面后，公开页 metadata 同步变化
- 切换 `isPublic` 为 false 后，公开页不再可索引

## 与其他文档的依赖边界

### 依赖 `公开空间配置`

SEO 只消费配置结果，不参与配置流程。空间名称、简介、封面来源的真相都由公开空间配置文档定义。

## 落地建议

建议实现顺序：

1. 先把公开页 metadata 数据源改为服务端可读
2. 再实现 `generateMetadata`
3. 然后补 Open Graph、Twitter、canonical
4. 最后补最小结构化数据
