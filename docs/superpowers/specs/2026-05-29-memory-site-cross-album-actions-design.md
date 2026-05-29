# AI 纪念站跨相册章节生成与详情轻编辑设计

> 适用范围：`/sites` 纪念站生成入口、纪念站详情页轻编辑动作、对应 API 与站点 payload。
>
> 关联文档：
> - [AI 纪念站生成器 V1 设计](/Users/user/Documents/codes/work/docs/superpowers/specs/2026-05-28-ai-memory-site-generator-design.md)
> - [P2 回顾能力设计](/Users/user/Documents/codes/work/docs/superpowers/specs/2026-05-22-p2-memory-review-design.md)

## 背景

当前纪念站生成入口虽然文案已经写成“选择生成范围”，但实现实际上仍然是“单选一个相册再生成”。这和 V1 已经确定的“按章节/阶段精选”方向不一致，也无法支持用户跨相册策展。

与此同时，纪念站详情页右侧的 `换一版选图`、`替换某一张图`、`修改文案` 还停留在静态按钮，用户拿到成品草稿后没有任何真实微调能力。

因此这次需要把“范围选择”与“轻微调”一起补齐，形成一个最小可用闭环。

## 目标

1. 生成入口支持跨相册勾选多个章节。
2. 保留“按整本相册快速纳入范围”的低操作成本，但最终提交给后端的是章节集合，而不是单个相册 id。
3. 纪念站详情页真正实现 `换一版选图`、`替换某一张图`、`修改文案`、`发布纪念站` 四类动作。
4. 整体仍然保持 V1 的产品边界：AI 负责策展，用户只做轻确认和少量微调。

## 非目标

1. 不做逐张手工自由排版。
2. 不做跨章节任意拖拽调序。
3. 不做“从所有照片任意选任意替换”的重编辑器。
4. 不做新的页面结构模板系统。

## 方案总览

### 1. 生成输入统一为章节集合

前端允许两种选择动作：

1. 勾选整本相册：等价于把该相册下所有“有可用照片”的章节加入当前选择。
2. 勾选具体章节：允许跨多个相册自由组合。

真正提交给生成接口的字段统一为：

1. `chapterIds: string[]`
2. `style: 'VELVET_PLUM_EDITORIAL'`

后端仍兼容旧的 `albumId` 请求体，但只作为兼容逻辑存在；新 UI 不再以它为主输入。

### 2. 章节范围是主数据源

纪念站生成时，后端按 `chapterIds` 查询章节，并把这些章节所属的相册一起查出来，作为：

1. 站点标题与引子文案的候选上下文。
2. 站点详情页“替换照片”动作的合法候选范围。
3. “换一版选图”动作的稳定重生成依据。

### 3. 详情页动作保持轻量

#### 3.1 换一版选图

行为：

1. 范围不变，仍然使用当前站点的 `sourceChapterIds`。
2. 重新轮换章节内代表图；当章节过多时，也允许轮换进入首页的章节子集。
3. 标题、引子、结尾与已手改文案保持不变。

实现约束：

1. 不重新走新的重量级 AI 管线。
2. 通过 `selectionVariant` 控制章节/照片轮换，保证每次点击都能得到确定性变化。
3. 如果原始内容本身非常少，变化可能有限，但动作必须是真实执行而不是空按钮。

#### 3.2 替换某一张图

行为：

1. 用户先选择某一个已展示章节。
2. 再选择该章节里当前已上屏的一张图。
3. 从同章节、未上屏的候选照片里选一张替换。

约束：

1. 替换只在同章节内进行，避免破坏篇章叙事。
2. 如果章节没有额外候选图，则该章节显示“暂无更多可替换照片”。
3. 若被替换的是站点封面所用图片，则同步更新 `coverPhotoUrl`。

#### 3.3 修改文案

允许修改：

1. 站点标题 `title`
2. 副标题 `subtitle`
3. 引子 `intro`
4. 结尾 `closing`
5. 每个章节的 `title`
6. 每个章节的 `summary`

不允许修改：

1. 章节顺序
2. 章节来源范围
3. 页面结构模板

#### 3.4 发布纪念站

发布动作改为直接生效，不再卡升级方案：

1. 当前草稿可以直接发布，不再要求付费方案。
2. 发布时把当前 `MemorySite` 标记为 `PUBLISHED`，并写入 `publishedAt`。
3. 发布时同步确保情侣空间 `isPublic=true`，这样 `/story/[slug]/site` 可以立即访问。
4. 发布成功后，详情页主按钮从 `发布纪念站` 切换为 `查看公开页`，用户可以直接打开成品。
5. `/sites` 列表里，已发布站点的主入口优先指向 `/story/[slug]/site`，同时保留回到后台继续审阅的入口。

补充说明：

1. 当前公开路由仍然保持“一个情侣空间只暴露最新已发布纪念站”的 MVP 约束。
2. 这意味着再次发布新的纪念站后，`/story/[slug]/site` 会展示最新发布的那一版，而不是为每个站点分配独立公开 slug。
3. 这个约束在后续如果要支持“多期纪念站并存”时，再升级为 `/story/[slug]/site/[siteId]` 或独立分享 slug。

## 页面交互

### 1. `/sites` 生成入口

页面改为双层选择器：

1. 相册卡片层：展示相册标题、照片数、可用章节数、可用照片数。
2. 章节列表层：在每张相册卡片内展示章节项，支持单独勾选。

交互规则：

1. 点击相册级按钮时，选中或取消该相册下所有可生成章节。
2. 不可生成章节不可勾选，并显示原因。
3. 顶部摘要始终显示：已选 `x` 个章节，来自 `y` 本相册。
4. 没有选中任何可生成章节时，生成按钮禁用。

### 2. `/sites/[siteId]` 详情页

右侧审核区变为真实操作面板：

1. `换一版选图`：直接执行，成功后刷新详情页。
2. `替换某一张图`：打开 modal，完成章节/照片/候选图三段式选择。
3. `修改文案`：打开 modal，编辑站点与章节文案。
4. `发布纪念站`：直接发布当前草稿，不再出现“升级方案后可发布”的门槛。
5. 发布成功后，顶栏主按钮切换为 `查看公开页`；如果用户继续微调，仍可通过同页的编辑入口操作草稿。

### 3. 发布后的查看流

用户完成一次最小发布后，路径固定为：

1. 在 `/sites/[siteId]` 点击 `发布纪念站`。
2. 后端写入 `MemorySite.status='PUBLISHED'`、`publishedAt`，并确保 `Couple.isPublic=true`。
3. 当前页刷新后，主按钮变为 `查看公开页`。
4. 用户点击后在新标签页打开 `/story/[slug]/site`，看到正式公开页。
5. 用户回到 `/sites` 列表时，已发布卡片的主 CTA 同样优先打开公开页，并保留 `继续审阅` 返回后台。

## API 设计

### 1. `POST /api/couples/[coupleId]/memory-sites/generate`

请求：

```json
{
  "chapterIds": ["chapter_1", "chapter_2"],
  "style": "VELVET_PLUM_EDITORIAL"
}
```

兼容请求：

```json
{
  "albumId": "album_1",
  "style": "VELVET_PLUM_EDITORIAL"
}
```

服务端行为：

1. 去重并校验 `chapterIds`。
2. 只允许生成当前 couple 下的章节。
3. `scopeKey` 改为按排序后的章节 id 生成，保证同一范围覆盖更新。
4. `sourceChapterIds` 记录真实章节范围。

### 2. `PATCH /api/couples/[coupleId]/memory-sites/[siteId]`

支持四类 action：

1. `publish`
2. `regenerateSelection`
3. `replacePhoto`
4. `editCopy`

#### `regenerateSelection`

```json
{
  "action": "regenerateSelection"
}
```

#### `replacePhoto`

```json
{
  "action": "replacePhoto",
  "chapterId": "chapter_1",
  "currentPhotoId": "photo_1",
  "replacementPhotoId": "photo_9"
}
```

#### `editCopy`

```json
{
  "action": "editCopy",
  "title": "新的站点标题",
  "subtitle": "新的副标题",
  "intro": "新的引子",
  "closing": "新的结尾",
  "sections": [
    {
      "chapterId": "chapter_1",
      "title": "新的章节标题",
      "summary": "新的章节摘要"
    }
  ]
}
```

## 数据模型

不新增独立表，沿用 `MemorySite` 与 `payload`。

新增或约定写入 payload 的字段：

1. `albumIds: string[]`
2. `chapterIds: string[]`
3. `selectionVariant: number`

`sourceAlbumId` 继续保留：

1. 单相册范围时写具体相册 id。
2. 跨相册范围时写 `null`。

## 验证要求

1. 纯 helper 测试覆盖：章节选择状态、范围摘要、输入兼容、已发布卡片 CTA 分流。
2. API 测试覆盖：跨相册章节生成、轻编辑 action、`free` 套餐可发布、发布时同步公开空间。
3. builder 测试覆盖：多章节来源与 `selectionVariant` 轮换逻辑。

## 实施顺序

1. 扩展 site builder / queries，支持按章节集生成。
2. 改 `/sites` 页面与相册接口返回结构，支持跨相册章节勾选。
3. 实现详情页 action panel 与后端 `PATCH` 动作。
4. 补测试并跑针对性验证。
