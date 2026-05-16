'use client'

import { useState } from 'react'
import type { PhotoData } from './photo-card'

const LAYOUT_OPTIONS = [
  { value: 'cinema-wide', label: '宽幅电影感' },
  { value: 'side-by-side', label: '图文并排' },
  { value: 'portrait-hero', label: '竖构图大图' },
  { value: 'grid-square', label: '方格组合' },
  { value: 'story-card', label: '卡片式' },
] as const

export function PhotoDetailModal({
  photo,
  coupleId,
  onClose,
  onUpdated,
  onSetCover,
}: {
  photo: PhotoData
  coupleId: string
  onClose: () => void
  onUpdated: () => void
  onSetCover?: (photoId: string) => Promise<void> | void
}) {
  const [tab, setTab] = useState<'info' | 'edit' | 'exif'>('info')
  const [caption, setCaption] = useState(photo.userCaption || photo.aiCaption || '')
  const [layout, setLayout] = useState(photo.aiLayout || 'side-by-side')
  const [saving, setSaving] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [settingCover, setSettingCover] = useState(false)

  async function handleSave() {
    setSaving(true)
    await fetch(`/api/couples/${coupleId}/photos/${photo.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userCaption: caption, aiLayout: layout }),
    })
    setSaving(false)
    onUpdated()
  }

  async function handleRetry() {
    setRetrying(true)
    await fetch(`/api/couples/${coupleId}/photos/${photo.id}/retry`, {
      method: 'POST',
    })
    setRetrying(false)
    onUpdated()
  }

  async function handleSetCover() {
    if (!onSetCover) return
    setSettingCover(true)
    await onSetCover(photo.id)
    setSettingCover(false)
    onUpdated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-warm-surface rounded-[var(--radius-xl)] shadow-2xl
        max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">

        {/* 图片区 */}
        <div className="relative bg-black flex-shrink-0">
          {photo.displayUrl ? (
            <img
              src={photo.displayUrl}
              alt={photo.fileName}
              className="w-full max-h-[50vh] object-contain"
            />
          ) : (
            <div className="w-full h-48 flex items-center justify-center text-warm-muted">
              暂无预览
            </div>
          )}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/40 hover:bg-black/60
              text-white rounded-full transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab 切换 */}
        <div className="flex border-b border-warm-border px-5">
          {([['info', '信息'], ['edit', '编辑'], ['exif', '拍摄参数']] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors
                ${tab === key
                  ? 'border-warm-accent text-warm-accent'
                  : 'border-transparent text-warm-muted hover:text-warm-text'
                }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab 内容 */}
        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'info' && (
            <div className="space-y-3">
              <InfoRow label="文案" value={photo.userCaption || photo.aiCaption || '-'} />
              <InfoRow label="排版" value={LAYOUT_OPTIONS.find(l => l.value === photo.aiLayout)?.label || '-'} />
              <InfoRow label="场景" value={photo.aiScene || '-'} />
              <InfoRow label="情绪" value={photo.aiMood || '-'} />
              <InfoRow label="地点" value={photo.locationName || '-'} />
              <InfoRow
                label="时间"
                value={photo.takenAt ? new Date(photo.takenAt).toLocaleDateString('zh-CN', {
                  year: 'numeric', month: 'long', day: 'numeric',
                }) : '-'}
              />
              <InfoRow label="状态" value={
                photo.status === 'READY' ? '就绪' :
                photo.status === 'PROCESSING' ? '处理中' : '失败'
              } />

              {photo.status === 'FAILED' && (
                <button
                  onClick={handleRetry}
                  disabled={retrying}
                  className="mt-2 px-4 py-2 text-sm text-white bg-warm-accent rounded-[var(--radius-md)]
                    hover:bg-warm-accent-hover disabled:opacity-50 transition-colors"
                >
                  {retrying ? '重试中...' : '重新处理'}
                </button>
              )}

              {photo.status === 'READY' && photo.canBeCover && onSetCover && (
                <button
                  onClick={handleSetCover}
                  disabled={settingCover || photo.isAlbumCover}
                  className="mt-2 px-4 py-2 text-sm text-white bg-warm-text rounded-[var(--radius-md)]
                    hover:opacity-90 disabled:opacity-50 transition-colors"
                >
                  {photo.isAlbumCover ? '当前封面' : settingCover ? '设置中...' : '设为相册封面'}
                </button>
              )}
            </div>
          )}

          {tab === 'edit' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-warm-text mb-1.5">文案</label>
                <textarea
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-[var(--radius-md)] border border-warm-border
                    bg-warm-bg text-warm-text text-sm resize-none
                    focus:ring-2 focus:ring-warm-accent/30 focus:border-warm-accent outline-none"
                  placeholder="写点什么..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-warm-text mb-1.5">排版模板</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {LAYOUT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setLayout(opt.value)}
                      className={`px-3 py-2 text-sm rounded-[var(--radius-md)] border transition-colors
                        ${layout === opt.value
                          ? 'border-warm-accent bg-warm-accent/10 text-warm-accent'
                          : 'border-warm-border text-warm-muted hover:border-warm-accent/50'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 bg-warm-accent text-white text-sm font-medium
                  rounded-[var(--radius-md)] hover:bg-warm-accent-hover
                  disabled:opacity-50 transition-colors"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          )}

          {tab === 'exif' && (
            <div className="space-y-3">
              <InfoRow label="相机" value={
                [photo.cameraMake, photo.cameraModel].filter(Boolean).join(' ') || '-'
              } />
              <InfoRow label="焦距" value={photo.focalLength || '-'} />
              <InfoRow label="光圈" value={photo.aperture || '-'} />
              <InfoRow label="快门" value={photo.shutterSpeed || '-'} />
              <InfoRow label="ISO" value={photo.iso?.toString() || '-'} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="text-sm text-warm-muted w-16 flex-shrink-0">{label}</span>
      <span className="text-sm text-warm-text">{value}</span>
    </div>
  )
}
