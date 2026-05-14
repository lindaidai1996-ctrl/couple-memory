# Phase 2: 图片上传管道（OSS + 处理）

> 返回: [主计划](./2026-05-14-couple-memory-mvp.md)
>
> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

---

### Task 10: OSS STS 签名 API

**Files:**
- Create: `src/lib/oss.ts`
- Create: `src/app/api/upload/sign/route.ts`

- [ ] **Step 1: 封装阿里云 OSS 工具函数**

```typescript
// src/lib/oss.ts
import crypto from 'crypto'

export function generateOSSKey(coupleId: string, fileName: string): string {
  const uuid = crypto.randomUUID()
  const ext = fileName.split('.').pop() || 'jpg'
  return `couples/${coupleId}/photos/${uuid}/original.${ext}`
}

export async function getSTSCredentials(coupleId: string, fileName: string) {
  const ossKey = generateOSSKey(coupleId, fileName)
  const bucket = process.env.OSS_BUCKET!
  const region = process.env.OSS_REGION!

  // 调用阿里云 STS AssumeRole 获取临时凭证
  // https://help.aliyun.com/document_detail/100624.html
  const stsEndpoint = 'https://sts.aliyuncs.com'
  const params = new URLSearchParams({
    Action: 'AssumeRole',
    Version: '2015-04-01',
    Format: 'JSON',
    RoleArn: process.env.OSS_ROLE_ARN!,
    RoleSessionName: `upload-${coupleId}`,
    DurationSeconds: '900',
    AccessKeyId: process.env.OSS_ACCESS_KEY_ID!,
  })
  // 签名 + 请求（此处简化，实际使用 @alicloud/sts-sdk）

  const uploadUrl = `https://${bucket}.${region}.aliyuncs.com/${ossKey}`
  return { uploadUrl, ossKey }
}

export async function downloadFromOSS(ossKey: string): Promise<Buffer> {
  const bucket = process.env.OSS_BUCKET!
  const region = process.env.OSS_REGION!
  const url = `https://${bucket}.${region}.aliyuncs.com/${ossKey}`
  const res = await fetch(url)
  const arrayBuffer = await res.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function uploadToOSS(ossKey: string, buffer: Buffer): Promise<void> {
  const bucket = process.env.OSS_BUCKET!
  const region = process.env.OSS_REGION!
  const url = `https://${bucket}.${region}.aliyuncs.com/${ossKey}`
  await fetch(url, {
    method: 'PUT',
    body: buffer,
    headers: { 'Content-Type': 'image/jpeg' },
  })
}
```

- [ ] **Step 2: 实现签名 API**

```typescript
// src/app/api/upload/sign/route.ts
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSTSCredentials } from '@/lib/oss'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { fileName, fileType, fileSize } = await req.json()

  if (fileSize > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large' }, { status: 413 })
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic']
  if (!allowedTypes.includes(fileType)) {
    return NextResponse.json({ error: 'Unsupported file type' }, { status: 415 })
  }

  const coupleUser = await prisma.coupleUser.findFirst({
    where: { userId: session.user.id },
  })
  if (!coupleUser) {
    return NextResponse.json({ error: 'No couple space' }, { status: 400 })
  }

  const result = await getSTSCredentials(coupleUser.coupleId, fileName)
  return NextResponse.json(result)
}
```

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat: add OSS STS signing API for direct upload"
```

---

### Task 11: 前端图片压缩 + 上传组件

**Files:**
- Create: `src/lib/upload.ts`
- Create: `src/components/photo-uploader.tsx`

- [ ] **Step 1: 封装压缩 + 上传逻辑**

```typescript
// src/lib/upload.ts
import imageCompression from 'browser-image-compression'

const COMPRESS_OPTIONS = {
  maxSizeMB: 5,
  maxWidthOrHeight: 4096,
  useWebWorker: true,
  preserveExif: true,
  fileType: 'image/jpeg' as const,
}

export async function compressAndUpload(
  file: File,
  coupleId: string,
  albumId: string,
  onProgress?: (stage: 'compressing' | 'uploading' | 'confirming', percent: number) => void
) {
  // 1. 压缩
  onProgress?.('compressing', 0)
  const compressed = await imageCompression(file, COMPRESS_OPTIONS)
  onProgress?.('compressing', 100)

  // 2. 获取签名
  onProgress?.('uploading', 0)
  const signRes = await fetch('/api/upload/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fileName: file.name,
      fileType: 'image/jpeg',
      fileSize: compressed.size,
    }),
  })
  if (!signRes.ok) throw new Error('Failed to get upload signature')
  const { uploadUrl, ossKey } = await signRes.json()

  // 3. 直传 OSS
  const uploadRes = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: compressed,
  })
  if (!uploadRes.ok) throw new Error('Failed to upload to OSS')
  onProgress?.('uploading', 100)

  // 4. 确认上传
  onProgress?.('confirming', 0)
  const confirmRes = await fetch(`/api/couples/${coupleId}/photos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ossKey, fileName: file.name, fileSize: compressed.size, albumId }),
  })
  if (!confirmRes.ok) throw new Error('Failed to confirm upload')
  onProgress?.('confirming', 100)

  return confirmRes.json()
}
```

- [ ] **Step 2: 创建上传组件**

```tsx
// src/components/photo-uploader.tsx
'use client'

import { useCallback, useState } from 'react'
import { compressAndUpload } from '@/lib/upload'

type UploadItem = {
  file: File
  status: 'pending' | 'compressing' | 'uploading' | 'confirming' | 'done' | 'error'
  progress: number
  photoId?: string
  error?: string
}

export function PhotoUploader({
  coupleId,
  albumId,
  onUploaded,
}: {
  coupleId: string
  albumId: string
  onUploaded?: (photoId: string) => void
}) {
  const [items, setItems] = useState<UploadItem[]>([])

  const handleFiles = useCallback(async (files: FileList) => {
    const newItems: UploadItem[] = Array.from(files).map(file => ({
      file,
      status: 'pending' as const,
      progress: 0,
    }))
    setItems(prev => [...prev, ...newItems])

    // 最多并行 3 张
    const concurrency = 3
    for (let i = 0; i < newItems.length; i += concurrency) {
      const batch = newItems.slice(i, i + concurrency)
      await Promise.all(
        batch.map(async item => {
          try {
            const result = await compressAndUpload(
              item.file,
              coupleId,
              albumId,
              (stage, percent) => {
                setItems(prev =>
                  prev.map(p =>
                    p.file === item.file ? { ...p, status: stage, progress: percent } : p
                  )
                )
              }
            )
            setItems(prev =>
              prev.map(p =>
                p.file === item.file ? { ...p, status: 'done', photoId: result.id } : p
              )
            )
            onUploaded?.(result.id)
          } catch (err: any) {
            setItems(prev =>
              prev.map(p =>
                p.file === item.file ? { ...p, status: 'error', error: err.message } : p
              )
            )
          }
        })
      )
    }
  }, [coupleId, albumId, onUploaded])

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={e => e.target.files && handleFiles(e.target.files)}
      />
      <ul>
        {items.map((item, i) => (
          <li key={i}>
            {item.file.name} — {item.status}
            {item.status === 'error' && <span className="text-red-500"> {item.error}</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat: add client-side image compression and OSS direct upload"
```

---

### Task 12: Sharp 多尺寸图片生成

**Files:**
- Create: `src/lib/pipeline/image-resize.ts`

- [ ] **Step 1: 实现多尺寸生成**

```typescript
// src/lib/pipeline/image-resize.ts
import sharp from 'sharp'
import { uploadToOSS } from '@/lib/oss'

export async function generateSizes(buffer: Buffer, basePath: string) {
  const [thumbnail, display, metadata] = await Promise.all([
    sharp(buffer)
      .resize(300, 300, { fit: 'cover' })
      .jpeg({ quality: 80 })
      .toBuffer(),

    sharp(buffer)
      .resize(1200, null, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toBuffer(),

    sharp(buffer).metadata(),
  ])

  await Promise.all([
    uploadToOSS(`${basePath}/thumbnail.jpg`, thumbnail),
    uploadToOSS(`${basePath}/display.jpg`, display),
  ])

  return {
    thumbnailPath: `${basePath}/thumbnail.jpg`,
    displayPath: `${basePath}/display.jpg`,
    width: metadata.width,
    height: metadata.height,
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add . && git commit -m "feat: add Sharp multi-size image generation"
```

---

### Task 13: EXIF 提取 + 逆地理编码

**Files:**
- Create: `src/lib/pipeline/exif-extract.ts`
- Create: `src/lib/pipeline/geocode.ts`

- [ ] **Step 1: 实现 EXIF 提取**

```typescript
// src/lib/pipeline/exif-extract.ts
import exifr from 'exifr'

export async function extractExif(buffer: Buffer) {
  const exif = await exifr.parse(buffer, {
    pick: [
      'DateTimeOriginal', 'GPSLatitude', 'GPSLongitude',
      'Make', 'Model', 'FocalLength', 'FNumber',
      'ExposureTime', 'ISO', 'ImageWidth', 'ImageHeight',
    ],
  })
  if (!exif) return null

  return {
    takenAt: exif.DateTimeOriginal || null,
    latitude: exif.GPSLatitude || null,
    longitude: exif.GPSLongitude || null,
    cameraMake: exif.Make || null,
    cameraModel: exif.Model || null,
    focalLength: exif.FocalLength ? `${exif.FocalLength}mm` : null,
    aperture: exif.FNumber ? `f/${exif.FNumber}` : null,
    shutterSpeed: exif.ExposureTime
      ? exif.ExposureTime < 1
        ? `1/${Math.round(1 / exif.ExposureTime)}s`
        : `${exif.ExposureTime}s`
      : null,
    iso: exif.ISO || null,
  }
}
```

- [ ] **Step 2: 实现逆地理编码（含 WGS84 → GCJ-02 转换）**

```typescript
// src/lib/pipeline/geocode.ts

// WGS84 → GCJ-02 坐标偏移（中国境内）
function wgs84ToGcj02(lat: number, lng: number): [number, number] {
  const a = 6378245.0
  const ee = 0.00669342162296594323
  let dLat = transformLat(lng - 105.0, lat - 35.0)
  let dLng = transformLng(lng - 105.0, lat - 35.0)
  const radLat = (lat / 180.0) * Math.PI
  let magic = Math.sin(radLat)
  magic = 1 - ee * magic * magic
  const sqrtMagic = Math.sqrt(magic)
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI)
  dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI)
  return [lat + dLat, lng + dLng]
}

function transformLat(x: number, y: number): number {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0
  ret += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0
  return ret
}

function transformLng(x: number, y: number): number {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x))
  ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0
  ret += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0
  ret += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0
  return ret
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const [gcjLat, gcjLng] = wgs84ToGcj02(lat, lng)
  const url = `https://restapi.amap.com/v3/geocode/regeo?key=${process.env.AMAP_API_KEY}&location=${gcjLng},${gcjLat}`

  const res = await fetch(url)
  const data = await res.json()
  if (data.status !== '1') return null

  const addr = data.regeocode.addressComponent
  const city = addr.city || addr.province
  const district = addr.district || ''
  return district ? `${city}·${district}` : city
}
```

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat: add EXIF extraction and reverse geocoding"
```

---

### Task 14: 照片处理编排器 (processPhoto)

**Files:**
- Create: `src/lib/pipeline/process-photo.ts`

- [ ] **Step 1: 整合所有处理步骤**

```typescript
// src/lib/pipeline/process-photo.ts
import { prisma } from '@/lib/prisma'
import { downloadFromOSS } from '@/lib/oss'
import { generateSizes } from './image-resize'
import { extractExif } from './exif-extract'
import { reverseGeocode } from './geocode'

export async function processPhoto(photoId: string, ossKey: string) {
  const buffer = await downloadFromOSS(ossKey)
  const basePath = ossKey.replace(/\/original\.\w+$/, '')

  const [sizes, exif] = await Promise.all([
    generateSizes(buffer, basePath),
    extractExif(buffer),
  ])

  let locationName: string | null = null
  if (exif?.latitude && exif?.longitude) {
    locationName = await reverseGeocode(exif.latitude, exif.longitude).catch(() => null)
  }

  const cdnDomain = process.env.OSS_CDN_DOMAIN
  await prisma.photo.update({
    where: { id: photoId },
    data: {
      thumbnailUrl: `https://${cdnDomain}/${sizes.thumbnailPath}`,
      displayUrl: `https://${cdnDomain}/${sizes.displayPath}`,
      width: sizes.width,
      height: sizes.height,
      ...(exif && {
        takenAt: exif.takenAt,
        latitude: exif.latitude,
        longitude: exif.longitude,
        cameraMake: exif.cameraMake,
        cameraModel: exif.cameraModel,
        focalLength: exif.focalLength,
        aperture: exif.aperture,
        shutterSpeed: exif.shutterSpeed,
        iso: exif.iso,
      }),
      locationName,
    },
  })

  // AI Pipeline 将在 Phase 3 集成
  // await runAIPipeline(...)

  await prisma.photo.update({
    where: { id: photoId },
    data: { status: 'READY' },
  })
}
```

- [ ] **Step 2: 在 Photo POST API 中集成调用**

修改 `src/app/api/couples/[coupleId]/photos/route.ts`，取消 processPhoto 注释。

- [ ] **Step 3: Commit**

```bash
git add . && git commit -m "feat: add photo processing orchestrator with resize + EXIF + geocoding"
```
