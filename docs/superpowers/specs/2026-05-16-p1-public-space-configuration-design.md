# P1 公开空间配置设计

> 适用范围：`P1-4 用户头像上传`、`P1-5 空间封面照片`，以及公开空间配置链路本身。
>
> 相关文档：
> - [2026-05-16-p1-photo-management-workbench-design.md](./2026-05-16-p1-photo-management-workbench-design.md)
> - [2026-05-16-p1-public-space-seo-design.md](./2026-05-16-p1-public-space-seo-design.md)

## 背景与现状

当前公开空间已经具备基础浏览链路：

- `/story/[slug]` 公开首页
- `/story/[slug]/photos` 公开照片页
- `/story/[slug]/timeline` 公开时间轴页

同时，数据库中已经存在以下字段基础：

- `User.avatar`
- `Couple.coverPhotoUrl`
- `Couple.bio`
- `Couple.theme`
- `Couple.isPublic`
- `Couple.slug`

但配置链路仍不完整：

- 设置页 [`src/app/(dashboard)/settings/page.tsx`](/Users/user/Documents/codes/work/src/app/(dashboard)/settings/page.tsx:1) 只支持基础文本字段与公开开关
- `Couple.coverPhotoUrl` 没有稳定的写入入口
- `User.avatar` 没有上传、保存和展示链路
- 公开空间配置与公开展示页之间缺少预览和反馈闭环

P1 需要把“公开空间是否存在”推进到“公开空间可以被稳定配置和持续维护”。

## 设计目标

1. 补齐用户头像上传与展示链路。
2. 补齐空间封面选择、上传、替换与移除链路。
3. 把当前 `/settings` 页面升级为可维护公开空间的配置入口。
4. 明确空间级配置与公开展示页之间的边界，为 SEO 和公开分发提供稳定元数据来源。

## 非目标

- 不在本设计中展开 SEO 元数据、结构化数据与索引策略
- 不在本设计中展开多主题系统
- 不包含 AI retry、pipeline 历史或运行诊断
- 不改造邀请页面完整视觉设计

## 范围边界

### 本文档覆盖

- 当前用户头像的上传与替换
- 空间封面的来源模型与设置交互
- 公开空间设置页的信息架构
- 公开空间的预览、保存反馈、权限边界

### 本文档不覆盖

- 公开空间 metadata、OG、Twitter 卡片策略
- 公开空间具体页面的 SSR/SEO 技术细节
- 相册内部多选、排序、批量操作

## 核心设计原则

### 用户资产与空间资产分层

- 头像属于 `User`
- 封面属于 `Couple`

两者都可能依赖 OSS 资源，但生命周期、权限与展示范围不同，不应共用同一接口语义。

### 配置真相优先于展示快照

空间封面不能只保存一个 URL，还需要知道它来自哪里。否则后续无法判断：

- 该封面是否来自现有照片
- 照片被删除后是否应回退
- SEO 和公开页面应如何解释这张图

### 轻量配置，强约束回退

P1 不引入独立媒体资产表，但要引入足够清晰的来源字段和回退规则，保证：

- 删除来源照片后系统行为可预测
- 切换公开开关后页面行为可预测
- 配置保存失败后前端能明确回滚

## 信息架构

建议将当前 `/settings` 页面重组为 4 个配置分区。

### 1. 空间基础信息

包含：

- 空间名称
- slug
- 在一起日期
- 简介
- 公开开关

保留当前已有内容，但补充保存后的公开链接与预览入口。

### 2. 空间展示配置

包含：

- 空间封面
- 封面来源说明
- 公开首页预览入口

封面支持两种来源：

- 从已有照片中选择
- 上传一张新的封面图

### 3. 成员资料

包含当前登录用户的：

- 头像
- 昵称展示预留位

P1 只做“当前用户编辑自己的头像”，不做双方成员资料总览。

### 4. 邀请与公开入口

包含：

- 邀请链接生成与复制
- 当前公开地址
- 一键打开公开空间

## 数据模型设计

### 头像模型

P1 保持 `User.avatar` 为头像主字段，不额外新增头像表。

约束：

- `User.avatar` 保存最终可展示 URL
- 上传成功后直接替换
- 不保留头像历史版本

原因：

- 头像是单值字段
- P1 不需要裁剪历史、版本管理或跨端审计

### 空间封面模型

`Couple.coverPhotoUrl` 不足以表达来源，建议引入来源模式。

```prisma
enum CoupleCoverMode {
  NONE
  PHOTO
  UPLOAD
}

model Couple {
  id             String          @id @default(cuid())
  slug           String          @unique
  name           String
  coverPhotoUrl  String?
  coverMode      CoupleCoverMode @default(NONE)
  coverPhotoId   String?
  // ...
}
```

字段解释：

- `coverMode = NONE`
  - 没有显式空间封面
  - 公开首页退回纯文案 Hero
- `coverMode = PHOTO`
  - 封面来自已有照片
  - `coverPhotoId` 指向某张可展示照片
- `coverMode = UPLOAD`
  - 封面来自单独上传的资源
  - `coverPhotoUrl` 保存该上传文件的展示 URL

### 为什么空间封面不直接复用相册封面模型

空间封面与相册封面的业务语义不同：

- 相册封面有“自动模式跟随第一张”的天然规则
- 空间封面不应自动跟随某个相册首图变化

因此空间封面需要明确的显式选择，不做自动模式。

## 配置来源规则

### 用户头像

- 来源只能是当前用户主动上传
- 不支持从现有照片直接裁切生成头像
- 若用户从未上传头像，则显示名字首字母占位

### 空间封面

来源有两类：

1. 现有照片
   - 只能选择 `READY` 且可展示的照片
   - 若源照片被删除或失去展示资源，空间封面自动回退 `NONE`
2. 自定义上传
   - 与相册照片解耦
   - 删除某张照片不影响该封面

## API 契约

### PATCH /api/users/me/profile

用途：更新当前登录用户资料。

请求体：

```json
{
  "avatar": "https://cdn.example.com/avatar.jpg"
}
```

规则：

- 只允许修改当前用户自己的头像
- 若头像上传失败，不改写原值

### PATCH /api/couples/:coupleId

扩展当前空间设置接口，补充以下可选字段：

```json
{
  "name": "我们的空间",
  "slug": "our-story",
  "startDate": "2020-01-01",
  "bio": "关于我们的介绍",
  "isPublic": true,
  "coverMode": "PHOTO",
  "coverPhotoId": "photo_xxx"
}
```

或：

```json
{
  "coverMode": "UPLOAD",
  "coverPhotoUrl": "https://cdn.example.com/custom-cover.jpg"
}
```

或：

```json
{
  "coverMode": "NONE"
}
```

规则：

- `PHOTO` 时必须校验 `coverPhotoId` 属于当前 couple，且照片可展示
- `UPLOAD` 时必须提供 `coverPhotoUrl`
- `NONE` 时清空 `coverPhotoId` 和 `coverPhotoUrl`

### GET /api/couples/:coupleId

响应补充：

```json
{
  "id": "couple_xxx",
  "coverMode": "PHOTO",
  "coverPhotoId": "photo_xxx",
  "coverPhotoUrl": "https://cdn.example.com/photo-display.jpg"
}
```

便于设置页回显当前空间封面状态。

### GET /api/couples/:coupleId/photos?coverSelectable=true

可复用现有照片列表接口，通过查询参数返回适合做封面的候选列表。

规则：

- 仅返回 `READY`
- 默认包含 `id`、`thumbnailUrl`、`displayUrl`、`takenAt`

### 上传签名接口

继续复用 [`/api/upload/sign`](/Users/user/Documents/codes/work/src/app/api/upload/sign/route.ts:1)，但补充 `purpose` 语义：

```json
{
  "fileName": "cover.jpg",
  "contentType": "image/jpeg",
  "purpose": "avatar"
}
```

或：

```json
{
  "fileName": "cover.jpg",
  "contentType": "image/jpeg",
  "purpose": "space-cover"
}
```

这样服务端可以控制 OSS 路径策略和尺寸限制。

## 关键用户流程

### 流程 1：更新头像

1. 用户进入设置页
2. 在成员资料区点击上传头像
3. 前端请求上传签名
4. 前端直传 OSS
5. 上传成功后调用 `PATCH /api/users/me/profile`
6. 页面立即刷新头像预览

### 流程 2：从已有照片中设置空间封面

1. 用户在空间展示配置区点击“从照片选择”
2. 弹出候选照片选择器
3. 仅展示可作为封面的 `READY` 照片
4. 用户选择后保存
5. 服务端写入 `coverMode = PHOTO` 与 `coverPhotoId`
6. 设置页和公开首页预览同时更新

### 流程 3：上传新的空间封面

1. 用户点击“上传新封面”
2. 上传成功后前端调用空间设置 PATCH
3. 服务端写入 `coverMode = UPLOAD`
4. 页面刷新当前封面预览

### 流程 4：移除空间封面

1. 用户点击“移除封面”
2. 服务端写入 `coverMode = NONE`
3. 公开首页 Hero 退回无图模式

## 权限规则

### 用户头像

- 当前登录用户可以修改自己的头像
- 不允许修改其他成员头像

### 空间配置

延续现有空间设置权限：

- `OWNER`
  - 可修改空间名称、slug、公开开关、空间封面
- `PARTNER`
  - P1 不开放空间级设置写权限

原因：

- 当前系统已经将空间设置归为 owner 能力
- P1 先避免“谁能改公开对外信息”的权限冲突

## 异常处理

- 头像上传成功但 profile 保存失败
  - 前端提示重试
  - 原头像保持不变
- 选择的封面照片已被删除或不再可展示
  - 服务端返回 409 或 400
  - 前端提示重新选择
- 空间封面来源照片后续被删除
  - 读模型解析时自动回退 `NONE`
- slug 冲突
  - 延续当前 409 语义
- 空间已关闭公开
  - 设置页仍可配置封面与简介，但公开入口标注“当前未公开”

## 与公开页面的消费边界

本设计只定义公开页面可消费哪些配置字段：

- `name`
- `slug`
- `startDate`
- `bio`
- `isPublic`
- `coverMode`
- `coverPhotoUrl`

但不定义：

- metadata 如何拼接
- OG 图如何生成
- robots/canonical 如何输出

这些内容由 SEO 文档负责。

## 测试策略

### 单元测试

- 空间封面来源解析
- 用户头像字段更新
- `coverMode` 切换时的字段清理规则

### API 测试

- owner 修改空间封面
- partner 访问空间设置写接口被拒绝
- 当前用户修改自己的头像
- 选择非法 `coverPhotoId`
- `UPLOAD` 模式缺少 `coverPhotoUrl`

### 组件交互测试

- 设置页分区渲染
- 封面来源切换
- 头像上传成功后的预览刷新
- 公开链接与预览入口显示

### 集成测试

- 设置空间封面后公开首页正确显示
- 关闭公开开关后公开链接返回未公开状态
- 删除作为封面的源照片后页面正确回退

## 与其他文档的依赖边界

### 依赖 `照片管理工作台`

若空间封面来源于已有照片，候选过滤规则、照片可展示判定和相册照片数据来源均复用照片管理工作台定义。

### 依赖 `公开空间 SEO`

本设计提供稳定的公开字段来源，但 SEO 如何消费这些字段由 SEO 文档定义。

## 落地建议

建议按以下顺序实施：

1. 先补 `PATCH /api/users/me/profile`
2. 再补空间封面来源建模与 `PATCH /api/couples/:coupleId`
3. 然后重构设置页分区与预览入口
4. 最后接入公开首页消费与回退逻辑
