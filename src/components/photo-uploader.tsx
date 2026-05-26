'use client'

import { useCallback, useState } from 'react'
import { useTranslations } from 'next-intl'
import { compressAndUpload, type UploadStage } from '@/lib/upload'

type UploadItem = {
  id: string
  fileName: string
  status: 'pending' | UploadStage | 'done' | 'error'
  progress: number
  photoId?: string
  error?: string
}

type Translator = (key: string) => string

export function buildPhotoUploaderDropzoneClassName() {
  return [
    'cm-upload-dropzone',
    'block cursor-pointer rounded-[var(--radius-xl)] border-2 border-dashed px-8 py-8 text-center transition-colors',
  ].join(' ')
}

export function buildPhotoUploaderUploadItemClassName(status: UploadItem['status']) {
  return [
    'cm-upload-progress-item',
    'rounded-[var(--radius-md)] border px-3 py-2.5',
    status === 'error' ? 'cm-upload-progress-item--error' : 'cm-upload-progress-item--active',
  ].join(' ')
}

export function buildPhotoUploaderProgressTrackClassName() {
  return [
    'cm-upload-progress-track',
    'relative mt-2 h-2 overflow-hidden rounded-full',
  ].join(' ')
}

export function buildPhotoUploaderProgressFillClassName() {
  return [
    'cm-upload-progress-fill',
    'absolute inset-y-0 left-0 rounded-full transition-[width] duration-200 ease-out',
  ].join(' ')
}

export function formatUploadProgressPercent(progress: number) {
  return `${Math.min(100, Math.max(0, Math.round(progress)))}%`
}

export function buildUploaderStageLabels(t: Translator): Record<UploadItem['status'], string> {
  return {
    pending: t('pending'),
    compressing: t('compressing'),
    uploading: t('uploading'),
    confirming: t('confirming'),
    done: t('done'),
    error: t('error'),
  }
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
  const t = useTranslations('PhotoUploader')
  const stageLabels = buildUploaderStageLabels(t)
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
            const message = err instanceof Error ? err.message : String(err || t('uploadFailed'))
            updateItem(item.id, { status: 'error', error: message })
          }
        })
      )
    }
  }, [coupleId, albumId, onUploaded, t, updateItem])

  return (
    <div className="space-y-4">
      <label className={buildPhotoUploaderDropzoneClassName()}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic"
          multiple
          className="hidden"
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        <p className="text-sm text-warm-text">{t('dropzoneTitle')}</p>
        <p className="mt-1 text-xs text-warm-muted">{t('dropzoneHint')}</p>
      </label>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map(item => {
            const progressPercent = item.status === 'done' ? '100%' : formatUploadProgressPercent(item.progress)
            const statusLabel = item.status === 'error' ? item.error : stageLabels[item.status]

            return (
              <li key={item.id} className={buildPhotoUploaderUploadItemClassName(item.status)}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-warm-text">{item.fileName}</span>
                  <span className={item.status === 'error' ? 'text-[var(--color-error)]' : 'text-warm-muted'}>
                    {statusLabel}
                  </span>
                </div>

                {item.status !== 'error' ? (
                  <div className={buildPhotoUploaderProgressTrackClassName()} aria-hidden="true">
                    <span
                      className={buildPhotoUploaderProgressFillClassName()}
                      style={{ width: progressPercent }}
                    />
                  </div>
                ) : null}

                {item.status !== 'error' ? (
                  <div className="mt-1 flex items-center justify-end text-[11px] text-warm-muted">
                    {progressPercent}
                  </div>
                ) : null}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
