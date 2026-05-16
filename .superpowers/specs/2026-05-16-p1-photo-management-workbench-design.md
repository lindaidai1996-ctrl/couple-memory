# P1 照片管理工作台设计

> 适用范围：`P1-1 照片批量操作`、`P1-2 相册封面自动设置`、`P1-3 照片排序拖拽`，以及 `P1-5 空间封面照片` 中“从已有照片中选择封面候选源”的共用能力。
>
> 相关文档：
> - [2026-05-16-p1-public-space-configuration-design.md](./2026-05-16-p1-public-space-configuration-design.md)
> - [2026-05-16-p1-ai-retry-observability-design.md](./2026-05-16-p1-ai-retry-observability-design.md)
> - [2026-05-16-p1-public-space-seo-design.md](./2026-05-16-p1-public-space-seo-design.md)

## 背景与现状

当前后台照片管理能力主要集中在相册详情页 [`src/app/(dashboard)/albums/[albumId]/page.tsx`](/Users/user/Documents/codes/work/src/app/(dashboard)/albums/[albumId]/page.tsx:1)。该页面已经具备以下基础：

- 照片上传
- 照片网格浏览
- 单张照片预览
- 处理中与失败状态展示

但它本质上仍是“上传后浏览”的展示页，而不是“管理照片集合”的工作台：

- 页面内直接写死网格与弹窗逻辑，缺少清晰的状态分层
- 没有多选、批量删除、批量移动能力
- `Photo.sortOrder` 已存在，但列表接口实际仍按 `takenAt desc` 返回
- `Album.coverPhotoUrl` 已存在，但没有稳定的封面规则与写入路径
- 详情弹窗已支持单图编辑与失败重试，但未与集合管理能力打通

P1 需要把该页升级为“照片管理工作台”，以支持集合治理、顺序维护与封面规则。

## 设计目标

1. 把相册详情页从“上传 + 浏览”升级为“上传 + 选择 + 批量治理 + 排序”。
2. 明确后台管理视图的主排序语义，以 `sortOrder asc` 作为唯一主排序依据。
3. 定义稳定的相册封面规则，使封面支持自动跟随和人工覆盖两种模式。
4. 让前端状态层、批量接口、排序接口、封面规则可以并行实施。

## 非目标

- 不包含用户头像上传与裁剪
- 不包含空间设置页本身的信息架构
- 不包含公开空间 SEO、分享卡片与结构化数据
- 不包含 AI retry、PipelineRun 历史与管理台可观测性
- 不优先处理骨架屏、深色模式、邀请页等实现型增强项

## 范围边界

### 本文档覆盖

- 单相册内的照片集合管理
- 多选、批量删除、批量移动
- 相册内拖拽排序
- 相册封面自动模式与手动覆盖模式
- 单图详情中的“设为相册封面”动作

### 本文档不覆盖

- 空间封面设置页的交互流程
- 用户头像的存储与展示
- 公开页如何消费相册封面生成 SEO 元数据
- AI 失败重试的状态语义

## 核心设计原则

### 管理态与展示态分离

后台相册页是“管理界面”，公开照片页是“内容消费界面”。两者可以共享照片数据模型，但不共享交互模型。后台页的状态和动作不能向 [`src/components/photo-stream.tsx`](/Users/user/Documents/codes/work/src/components/photo-stream.tsx:1) 这类公开展示组件回流。

### 单相册内聚

P1 的选择、删除、移动、排序都只在当前相册上下文内进行：

- 多选不跨相册
- 拖拽排序不跨相册
- 跨相册移动通过明确目标相册完成，不通过拖拽跨容器实现

### 同步操作优先

P1 的批量删除、批量移动、封面切换与排序提交都采用同步请求，不引入批量任务表或异步队列。目标是先保证正确性、一致性与实现简单度。

### 封面规则可解释

相册封面必须能被用户明确理解：

- 自动模式：封面总是当前排序后的第一张可展示照片
- 手动模式：封面固定为指定照片，除非该照片被删除、移出相册或用户主动恢复自动模式

## 页面信息架构

相册详情页重组为 5 个稳定区域。

### 1. Header

职责：

- 展示相册标题、描述、照片总数
- 展示封面模式摘要
- 提供两个主入口：`选择照片`、`调整排序`

建议信息：

- 相册标题
- 相册描述
- 当前封面模式：`自动封面` / `手动封面`
- 当前封面来源提示，例如“当前封面跟随首张照片”

### 2. Upload Panel

保留现有上传能力，但不再作为页面唯一主线。

规则：

- 上传完成后，新照片默认追加到当前相册尾部
- 不再因 `takenAt` 排序将新照片打散到中间位置
- 若当前相册此前为空且处于自动封面模式，新照片自动成为封面

### 3. Toolbar

根据页面 `mode` 切换内容：

- `browse`：显示操作入口、封面说明
- `select`：显示已选数量、批量删除、批量移动、取消选择
- `reorder`：显示保存排序、取消排序

### 4. Photo Grid

统一承载三类交互：

- 浏览
- 多选
- 拖拽排序

卡片层需支持：

- 处理中 / 失败状态角标
- 封面标识
- 选择态复选框
- 拖拽态占位与落点反馈

### 5. Detail Modal

基于现有 [`src/components/photo-detail-modal.tsx`](/Users/user/Documents/codes/work/src/components/photo-detail-modal.tsx:1) 增强单图治理动作：

- 设为相册封面
- 恢复自动封面
- 删除当前照片
- 保留已有文案编辑、布局切换与失败重试入口

该弹窗只负责单图治理，不承载批量动作。

## 前端状态模型

前端核心状态收敛为以下字段：

```ts
type PageMode = 'browse' | 'select' | 'reorder'

type PendingAction = null | 'delete' | 'move' | 'reorder' | 'setCover'

type AlbumWorkbenchState = {
  mode: PageMode
  photos: PhotoViewModel[]
  selectedIds: Set<string>
  pendingAction: PendingAction
  optimisticSnapshot: PhotoViewModel[] | null
}
```

### 状态语义

- `browse`
  - 默认态
  - 可打开详情弹窗
  - 可进入选择态或排序态
- `select`
  - 出现复选框与批量操作条
  - 点击卡片默认切换选中，不打开详情
  - 不允许同时进入排序态
- `reorder`
  - 只允许拖拽
  - 暂停轮询刷新
  - 本地重排成功后，点击保存一次性提交
- `pendingAction`
  - 表示当前存在网络提交
  - 用于禁用重复操作与展示按钮 loading 状态

### 关键交互规则

- 进入选择态后，卡片点击切换选中，不弹详情
- 详情弹窗中的“设为封面”属于单图动作，执行前退出选择态
- 进入排序态后暂停轮询，退出排序态后恢复
- 排序态中的本地顺序只在点击“保存排序”后持久化
- 当前相册照片数从 `0 -> 1` 时，自动模式下首图自动成为封面

## 数据模型设计

当前 `Album.coverPhotoUrl` 只适合作为对外展示字段，不适合作为封面规则的唯一真相来源。P1 建议引入“封面来源”模型。

### Album 新字段

建议新增：

```prisma
enum AlbumCoverMode {
  AUTO
  MANUAL
}

model Album {
  id            String         @id @default(cuid())
  coupleId      String
  title         String
  description   String?
  coverPhotoUrl String?
  coverMode     AlbumCoverMode @default(AUTO)
  coverPhotoId  String?
  sortOrder     Int            @default(0)
  // ...
}
```

### 字段含义

- `coverMode = AUTO`
  - 相册封面总是当前相册排序第一张可展示照片
- `coverMode = MANUAL`
  - 相册封面固定为 `coverPhotoId` 指向的照片
- `coverPhotoUrl`
  - 可以继续在响应体中保留，作为兼容输出字段
  - 但服务端应根据 `coverMode`、`coverPhotoId` 与首张照片动态计算，不再依赖手工写入 URL

### Photo.sortOrder 的职责

[`prisma/schema.prisma`](/Users/user/Documents/codes/work/prisma/schema.prisma:1) 中已有 `Photo.sortOrder`。P1 后：

- 后台管理页按 `sortOrder asc, createdAt asc` 排序
- `takenAt` 保留给公开展示与时间轴视图
- 上传到当前相册的新图默认追加到尾部

### 为什么不新增批量任务表

P1 的批量删除、批量移动、排序提交都是轻量、同步、可立即反馈的动作，不需要为此引入异步任务模型。保持 API 原子性比扩展性更重要。

## 接口契约

### GET /api/couples/:coupleId/photos?albumId=:albumId

用途：获取当前相册管理视图下的照片列表。

调整规则：

- 默认排序改为 `sortOrder asc, createdAt asc`
- 返回字段中补充：
  - `sortOrder`
  - `isAlbumCover`
  - `canBeCover`，用于阻止失败或无展示资源照片成为封面

示例响应：

```json
{
  "photos": [
    {
      "id": "p1",
      "fileName": "IMG_0001.jpg",
      "thumbnailUrl": "https://cdn.example.com/1-thumb.jpg",
      "displayUrl": "https://cdn.example.com/1-display.jpg",
      "status": "READY",
      "sortOrder": 1,
      "isAlbumCover": true,
      "canBeCover": true
    }
  ],
  "total": 24,
  "page": 1,
  "limit": 100
}
```

### POST /api/couples/:coupleId/photos/batch

用途：批量删除或批量移动。

请求体：

```json
{
  "action": "DELETE",
  "photoIds": ["p1", "p2"]
}
```

```json
{
  "action": "MOVE",
  "photoIds": ["p1", "p2"],
  "targetAlbumId": "album_target"
}
```

规则：

- `DELETE` 不需要 `targetAlbumId`
- `MOVE` 必须提供 `targetAlbumId`
- 全部 `photoIds` 都必须属于当前 couple
- 批量移动成功后：
  - 来源相册顺序压实
  - 目标相册按尾部追加
- P1 不允许部分成功，必须整体成功或整体失败

### POST /api/couples/:coupleId/albums/:albumId/photos/reorder

用途：保存当前相册完整顺序。

请求体：

```json
{
  "orderedPhotoIds": ["p3", "p1", "p2", "p4"]
}
```

规则：

- 必须覆盖当前相册全部照片 ID
- 服务端在事务内重写该相册全部 `sortOrder`
- 若当前相册处于自动封面模式，则重排后自动刷新封面解析结果

### PATCH /api/couples/:coupleId/albums/:albumId/cover

用途：切换封面模式或指定手动封面。

请求体：

```json
{
  "mode": "AUTO"
}
```

或：

```json
{
  "mode": "MANUAL",
  "photoId": "p1"
}
```

规则：

- `MANUAL` 时 `photoId` 必须属于当前相册
- `MANUAL` 时目标照片必须 `status = READY` 且具备展示资源
- `AUTO` 时清空 `coverPhotoId`

### DELETE /api/couples/:coupleId/photos/:photoId

单图删除保留，但删除后服务端需执行：

- 顺序压实
- 若该图是手动封面，自动回退到 `AUTO`

## 封面解析规则

### 自动模式

按以下优先级解析：

1. 当前相册中 `status = READY` 且存在展示资源的第一张照片
2. 若无可展示照片，则返回空封面

### 手动模式

按以下优先级解析：

1. `coverPhotoId` 对应照片仍属于该相册，且为 `READY`
2. 否则自动回退 `AUTO`

### 为什么不让失败图做封面

失败图可能没有 `thumbnailUrl` 或 `displayUrl`，会导致相册列表和公开展示的首屏质量下降。P1 先保持规则简单，只允许可展示的 `READY` 照片做封面。

## 关键用户流程

### 流程 1：批量删除

1. 用户进入相册页
2. 点击 `选择照片`
3. 勾选多张照片
4. 点击 `批量删除`
5. 前端展示不可恢复确认
6. 提交后前端乐观移除这些卡片
7. 服务端删除成功并压实顺序
8. 若删掉手动封面图，则相册回退到自动模式
9. 若删除后相册为空，则封面为空

### 流程 2：批量移动

1. 用户进入选择态并勾选多张
2. 点击 `移动到相册`
3. 选择目标相册
4. 前端提交 batch move 请求
5. 服务端校验当前权限、目标相册归属与照片归属
6. 服务端在事务内完成移动与双边顺序修复
7. 若当前手动封面图被移走，则回退到自动模式

### 流程 3：拖拽排序

1. 用户点击 `调整排序`
2. 页面进入 `reorder` 态并暂停轮询
3. 用户拖拽照片改变本地顺序
4. 点击 `保存排序`
5. 服务端一次性重写该相册所有照片顺序
6. 若为自动封面模式，封面随第一张变化
7. 提交失败则整体回滚

### 流程 4：手动设封面

1. 用户在详情弹窗点击 `设为相册封面`
2. 前端立即更新封面标识
3. 服务端写入 `coverMode = MANUAL` 与 `coverPhotoId`
4. 后续拖拽排序不会改变封面
5. 用户点击 `恢复自动封面` 后，重新取排序第一张

## 异常处理

### 原子性要求

P1 的批量删除、批量移动与排序提交必须是原子操作：

- 不允许部分成功
- 任一步失败都整体回滚
- 前端回滚到 `optimisticSnapshot`

### 典型异常

- 目标相册不存在或无权限
  - 返回业务错误
  - 保留当前选择态，允许用户重试
- 排序保存时服务端校验到 ID 集不完整
  - 返回 400
  - 前端回滚并提示刷新后重试
- 手动封面图被删除或移出相册
  - 服务端自动切回 `AUTO`
- 当前相册仅有一张图时设手动封面
  - 允许，不做额外限制
- 处理中或失败的照片
  - 可以被移动或删除
  - 不允许设为封面

## 权限规则

沿用现有空间内管理权限模型：

- `OWNER`
  - 可执行全部操作
- `PARTNER`
  - 可执行全部相册内管理操作
- 访客
  - 无权访问后台相册管理页

本文档不新增角色细分。

## 测试策略

### 单元测试

覆盖封面解析规则：

- 自动模式取第一张可展示照片
- 手动模式取 `coverPhotoId`
- 手动封面失效后回退自动模式

### API 测试

覆盖：

- 批量删除
- 批量移动
- 排序提交
- 封面模式切换
- 非法 `photoId` / `albumId`
- 权限不足

### 组件交互测试

覆盖：

- `browse` / `select` / `reorder` 三态切换
- 选择态点击卡片不弹详情
- 排序态下禁止进入批量操作
- 详情弹窗中封面动作与页面状态协同

### 集成测试

覆盖完整链路：

- 上传后照片追加到相册尾部
- 重排后顺序持久化
- 自动封面随首图变化
- 手动封面不受重排影响
- 删除手动封面后自动回退

## 与其他文档的依赖边界

### 依赖 `公开空间配置`

本设计定义“相册封面规则”和“从已有照片中选择封面候选源”的数据基础，后续空间设置页如果允许从相册照片中选择空间封面，应复用这里的“候选照片必须可展示”的规则。

### 依赖 `AI 重试与执行可观测性`

本设计只消费照片的 `status` 字段和失败状态展示，不定义失败语义本身。关于 `FAILED`、`PROCESSING`、重试资格和 pipeline 记录由可观测性文档定义。

### 依赖 `公开空间 SEO`

本设计提供稳定的相册封面来源；是否将相册封面参与公开页面摘要、OG 图或分享卡片由 SEO 文档单独定义。

## 落地建议

建议实现顺序如下：

1. 先补数据模型与封面解析逻辑
2. 再补照片列表默认排序与批量接口
3. 然后实现页面三态切换与批量操作条
4. 最后实现拖拽排序与详情弹窗中的封面动作

这样可以把风险最高的数据一致性问题放在前面解决，让前端交互在稳定契约上迭代。
