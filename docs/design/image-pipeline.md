# 图片处理管道

> 本文档描述从用户选择照片到照片可展示的完整处理流程。
>
> 相关文档：[总览](./README.md) · [产品需求](./product-requirements.md) · [Agent 编排设计](./ai-agent.md) · [API 设计](./api-design.md)

## 处理流程总览

```
用户选择照片
     │
     ▼
┌─────────────────────┐
│ 1. 前端预压缩        │  browser-image-compression
│    保留 EXIF         │  目标: < 5MB
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 2. 请求 OSS 直传签名 │  API: POST /api/upload/sign
│    获取 STS 临时凭证  │  返回: uploadUrl, ossKey
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 3. 前端直传 OSS      │  PUT 到签名 URL
│    不经服务端        │  进度回调更新 UI
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 4. 确认上传          │  API: POST /api/couples/:id/photos
│    创建 Photo 记录   │  status = PROCESSING
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 5. 后端异步处理       │  ← 不阻塞前端响应
│    5a. Sharp 生成多尺寸│
│    5b. exifr 提取 EXIF│
│    5c. 高德逆地理编码  │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 6. Agent 编排层       │  详见 ai-agent.md
│    分析 → 文案/排版/  │
│    时间线建议（并行） │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ 7. 完成              │  status = READY
│    或部分降级完成    │  （或 FAILED + 错误信息）
└─────────────────────┘
```

## 阶段 1: 前端预压缩

### 为什么在前端压缩

- 用户手机照片通常 10-20MB，直接上传浪费带宽和时间
- 服务端压缩需要先接收完整大文件，占用服务器内存和带宽
- 前端压缩后再上传 OSS，服务器全程不接触原始大文件

### 使用 browser-image-compression

```typescript
import imageCompression from 'browser-image-compression'

const options = {
  maxSizeMB: 5,              // 目标大小 5MB 以内
  maxWidthOrHeight: 4096,    // 最大边 4096px（保留足够清晰度）
  useWebWorker: true,        // Web Worker 异步处理，不阻塞 UI
  preserveExif: true,        // 关键：保留 EXIF 信息
  fileType: 'image/jpeg',    // 统一输出 JPEG
}

const compressedFile = await imageCompression(file, options)
```

**关键配置 `preserveExif: true`**：库默认会去掉 EXIF（因为大多数场景不需要），但我们依赖 EXIF 中的拍摄时间和 GPS 坐标，必须保留。

### 前端压缩 UI 体验

- 选择照片后立即开始压缩，显示压缩进度
- 压缩完成后自动进入上传流程
- 如果用户选择多张照片，队列处理（最多并行 3 张）

## 阶段 2-3: OSS 直传

### 为什么采用直传

```
传统方案：Client → Server → OSS        （服务器转发，占带宽）
直传方案：Client → OSS（签名 URL）       （服务器只签发凭证）
```

直传方案的优势：
- 服务器不承担图片传输的带宽和内存开销
- 上传速度更快（直连 OSS 节点）
- 服务器只需要处理签名请求（几 KB 的 JSON）

### STS 临时凭证流程

```
Client                    Server                    阿里云 STS
  │                         │                           │
  │ POST /api/upload/sign   │                           │
  │ { fileName, fileType }  │                           │
  │ ─────────────────────→  │                           │
  │                         │  AssumeRole               │
  │                         │ ─────────────────────────→│
  │                         │  ← 临时 AK/SK/Token       │
  │                         │  （有效期 15 分钟）         │
  │  ← { uploadUrl,        │                           │
  │       ossKey,           │                           │
  │       credentials }     │                           │
  │                         │                           │
  │ PUT uploadUrl           │                           │
  │ (with credentials)      │                    ┌──────┤
  │ ────────────────────────┼────────────────────│ OSS  │
  │  ← 200 OK              │                    └──────┘
```

### 签名 API 设计

```typescript
// POST /api/upload/sign
// Request
{
  fileName: "IMG_20240815_180530.jpg",
  fileType: "image/jpeg",
  fileSize: 4500000              // 压缩后大小，用于校验
}

// Response
{
  uploadUrl: "https://bucket.oss-cn-guangzhou.aliyuncs.com/...",
  ossKey: "couples/{coupleId}/photos/{uuid}/original.jpg",
  credentials: {
    accessKeyId: "STS.xxx",
    accessKeySecret: "xxx",
    securityToken: "xxx",
    expiration: "2024-08-15T18:20:00Z"
  }
}
```

### OSS 存储路径规范

```
couples/
  {coupleId}/
    photos/
      {uuid}/
        original.jpg       # 原图（压缩后）
        display.jpg         # 展示图 1200px
        thumbnail.jpg       # 缩略图 300px
```

按 coupleId 分目录，支持按租户管理和清理。

## 阶段 4: 确认上传

前端 OSS 上传成功后，调用 API 创建 Photo 记录：

```typescript
// POST /api/couples/:coupleId/photos
{
  ossKey: "couples/{coupleId}/photos/{uuid}/original.jpg",
  fileName: "IMG_20240815_180530.jpg",
  fileSize: 4500000,
  albumId: "album_xxx"         // 所属相册
}

// Response
{
  id: "photo_xxx",
  status: "PROCESSING",        // 立即返回，后端异步处理
  ...
}
```

此 API 返回后，前端即可显示"处理中"状态的占位卡片。

## 阶段 5: 后端异步处理

### 处理触发方式

确认上传的 API handler 在返回响应后，通过 `Promise` 异步触发后续处理（不阻塞 HTTP 响应）：

```typescript
// API handler 伪代码
export async function POST(req) {
  const photo = await prisma.photo.create({ ... status: 'PROCESSING' })

  // 异步触发，不 await
  processPhoto(photo.id).catch(err => {
    logger.error('Photo processing failed', { photoId: photo.id, err })
    prisma.photo.update({ where: { id: photo.id }, data: { status: 'FAILED', processingError: err.message } })
  })

  return Response.json(photo)
}
```

### 5a: Sharp 生成多尺寸

```typescript
import sharp from 'sharp'

async function generateSizes(ossKey: string) {
  const buffer = await downloadFromOSS(ossKey)

  const [thumbnail, display] = await Promise.all([
    sharp(buffer)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer(),

    sharp(buffer)
      .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer(),
  ])

  await Promise.all([
    uploadToOSS(`${basePath}/thumbnail.jpg`, thumbnail),
    uploadToOSS(`${basePath}/display.jpg`, display),
  ])
}
```

| 尺寸 | 用途 | 规格 | 质量 |
|------|------|------|------|
| thumbnail | 列表缩略图、懒加载占位 | 300×300 cover crop | 80% |
| display | 正文展示 | 最长边 1200px | 85% |
| original | 原图查看（可选） | 保持原始（已前端压缩） | 原始 |

### 5b: exifr 提取 EXIF

```typescript
import exifr from 'exifr'

async function extractExif(buffer: Buffer) {
  const exif = await exifr.parse(buffer, {
    pick: [
      'DateTimeOriginal',    // 拍摄时间
      'GPSLatitude',         // GPS 纬度
      'GPSLongitude',        // GPS 经度
      'Make',                // 相机品牌
      'Model',               // 相机型号
      'FocalLength',         // 焦距
      'FNumber',             // 光圈
      'ExposureTime',        // 快门速度
      'ISO',                 // ISO
      'ImageWidth',          // 图片宽度
      'ImageHeight',         // 图片高度
    ]
  })
  return normalizeExif(exif)
}
```

### 5c: 高德逆地理编码

当 EXIF 中有 GPS 坐标时，调用高德地图 API 转换为中文地名：

```typescript
async function reverseGeocode(latitude: number, longitude: number): Promise<string> {
  // 高德 API: https://restapi.amap.com/v3/geocode/regeo
  // 输入: location=longitude,latitude（注意经纬度顺序）
  // 输出: regeocode.formatted_address → "广东省广州市天河区xxx"
  //       regeocode.addressComponent → 省/市/区/街道

  // 返回格式化的地名，如 "广州·天河区" 或 "厦门·鼓浪屿"
}
```

**注意事项**：
- 高德 API 免费额度：5000 次/天，足够 MVP 使用
- GPS 坐标需要 WGS84 → GCJ-02 坐标转换（中国境内）
- 缓存相近坐标的结果，减少 API 调用

## 阶段 6-7: Agent 编排与完成

EXIF 提取完成后，不是直接调用单个模型，而是进入 `src/lib/pipeline/process-photo.ts` 驱动的 Agent 编排层（详见 [Agent 编排设计](./ai-agent.md)）。

当前真实主链如下：

1. 下载 OSS 原图
2. 生成 `display` / `thumbnail`
3. 提取并合并 EXIF
4. GPS 逆地理编码
5. 读取当前 couple 的偏好与 style memory
6. 调用 `runAIPipeline(...)`
7. 在 `COMPLETED` 或 `DEGRADED` 时写回 `Photo` 与 `PhotoAIVariant`
8. 依据运行结果决定最终 `Photo.status`

### 当前 DAG

```text
photoAnalyzer
  -> captionWriter
  -> layoutAdvisor
  -> timelineBuilder
```

其中：

- `photoAnalyzer` 先执行
- `captionWriter`、`layoutAdvisor`、`timelineBuilder` 并行执行
- 节点结果会整体写入 `PipelineRun.nodeResults`

### 运行状态

`PipelineRun` 目前有 4 种状态：

- `RUNNING`
- `COMPLETED`
- `FAILED`
- `DEGRADED`

`DEGRADED` 表示有节点失败，但不是整条链完全不可用。

### 写回结果

Pipeline 完成后，系统会分层写回：

- `Photo`：当前被前台使用的主结果，如 `aiCaption`、`aiLayout`、`aiScene`
- `PhotoAIVariant`：caption/layout 候选项
- `PipelineRun`：本次运行的 DAG、节点状态、耗时、token、错误信息

示意：

```typescript
await prisma.photo.update({
  where: { id: photoId },
  data: {
    takenAt,
    latitude,
    longitude,
    locationName,
    cameraMake,
    cameraModel,
    focalLength,
    aperture,
    shutterSpeed,
    iso,
    width,
    height,
    aiCaption,
    aiScene,
    aiMood,
    aiComposition,
    aiColorTone,
    aiLayout,
    aiKeywords,
    thumbnailUrl,
    displayUrl,
    status: 'READY' // 或在完全失败时标记为 FAILED
  }
})
```

### 照片状态决策

图片资产和 Agent 结果会一起影响最终 `Photo.status`：

- 如果整条运行 `FAILED`，照片标记为 `FAILED`
- 如果运行 `DEGRADED` 但展示图已生成，照片仍会进入 `READY`
- 如果运行 `COMPLETED` 且展示图存在，照片进入 `READY`

这意味着系统优先保证“照片可继续使用”，而不是让 AI 某个局部失败阻断整个上传体验。

## 前端状态轮询

前端创建 Photo 记录后，需要轮询处理状态：

```typescript
// 简单轮询方案（MVP）
function usePollPhotoStatus(photoId: string) {
  const [photo, setPhoto] = useState(null)

  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/couples/${coupleId}/photos/${photoId}`)
      const data = await res.json()
      setPhoto(data)
      if (data.status === 'READY' || data.status === 'FAILED') {
        clearInterval(interval)
      }
    }, 3000)  // 每 3 秒轮询
    return () => clearInterval(interval)
  }, [photoId])

  return photo
}
```

轮询间隔 3 秒，预计 11-15 秒完成处理，即 4-5 次轮询。

MVP 后可升级为 Server-Sent Events (SSE) 或 WebSocket 实现实时推送。

## 错误处理与重试

| 阶段 | 可能的错误 | 处理方式 |
|------|-----------|---------|
| 前端压缩 | 文件格式不支持 | 前端提示，不进入上传流程 |
| OSS 上传 | 网络中断 | 前端重试（最多 3 次） |
| STS 签名 | 凭证过期 | 重新请求签名 |
| Sharp 处理 | 图片损坏 | 标记 FAILED，提示用户重新上传 |
| EXIF 提取 | 无 EXIF 信息 | 跳过，相关字段留空 |
| 逆地理编码 | API 调用失败 | 跳过，locationName 留空 |
| Agent 编排层 | 节点失败或模型调用失败 | 参见 [Agent 编排设计](./ai-agent.md#14-可观测性与排障) |

核心原则：**非关键步骤失败不阻塞整体流程**。EXIF 缺失、地理编码失败、AI 生成失败都不影响照片的基本展示。
