'use client'

import { useCallback, useState } from 'react'
import { compressAndUpload, type UploadStage } from '@/lib/upload'

type UploadItem = {
  id: string
  fileName: string
  status: 'pending' | UploadStage | 'done' | 'error'
  progress: number
  photoId?: string
  error?: string
}

const STAGE_LABELS: Record<UploadItem['status'], string> = {
  pending: '等待中',
  compressing: '压缩中',
  uploading: '上传中',
  confirming: '确认中',
  done: '完成',
  error: '失败',
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

  const updateItem = useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems(prev => prev.map(item => (item.id === id ? { ...item, ...patch } : item)))
  }, [])

  const handleFiles = useCallback(async (files: FileList) => {
    const newItems: UploadItem[] = Array.from(files).map((file, i) => ({
      id: `${Date.now()}-${i}`,
      fileName: file.name,
      status: 'pending' as const,
      progress: 0,
    }))
    setItems(prev => [...prev, ...newItems])

    const fileArray = Array.from(files)
    const concurrency = 3
    for (let i = 0; i < fileArray.length; i += concurrency) {
      const batch = fileArray.slice(i, i + concurrency)
      await Promise.all(
        batch.map(async (file, batchIdx) => {
          const item = newItems[i + batchIdx]
          try {
            const result = await compressAndUpload(
              file,
              coupleId,
              albumId,
              (stage, percent) => updateItem(item.id, { status: stage, progress: percent })
            )
            updateItem(item.id, { status: 'done', photoId: result.id })
            onUploaded?.(result.id)
          } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err || '上传失败')
            updateItem(item.id, { status: 'error', error: message })
          }
        })
      )
    }
  }, [coupleId, albumId, onUploaded, updateItem])

  return (
    <div className="space-y-4">
      <label className="block cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center transition-colors hover:border-gray-400">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        <p className="text-sm text-gray-600">点击或拖拽照片到此处上传</p>
        <p className="mt-1 text-xs text-gray-400">支持 JPEG、PNG、WebP、HEIC，单张最大 10MB</p>
      </label>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map(item => (
            <li key={item.id} className="flex items-center justify-between rounded bg-gray-50 px-3 py-2 text-sm">
              <span className="truncate">{item.fileName}</span>
              <span className={item.status === 'error' ? 'text-red-500' : 'text-gray-500'}>
                {item.status === 'error' ? item.error : STAGE_LABELS[item.status]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
