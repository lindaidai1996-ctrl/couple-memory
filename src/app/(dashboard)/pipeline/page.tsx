'use client'

import { useEffect, useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

type RunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED' | 'DEGRADED'

type PipelineRunListItem = {
  id: string
  status: RunStatus
  triggerType: string | null
  attemptNumber: number
  summary: string | null
  startedAt: string
  duration: number | null
  photo: {
    id: string
    albumId: string
    fileName: string
    thumbnailUrl: string | null
    album: {
      id: string
      title: string
    } | null
  } | null
}

type PipelineRunDetail = {
  id: string
  status: RunStatus
  triggerType: string | null
  attemptNumber: number
  summary: string | null
  errorCode: string | null
  totalTokens: number | null
  totalCost: number | null
  duration: number | null
  nodeResults: unknown
  photo: {
    id: string
    status: string
    processingError: string | null
    fileName: string
    thumbnailUrl: string | null
    album: {
      id: string
      title: string
    } | null
  } | null
}

type Translator = (key: string, values?: Record<string, string | number>) => string

export function buildPipelineStatusOptions(t: Translator): Array<{ label: string; value: '' | RunStatus }> {
  return [
    { label: t('allStatuses'), value: '' },
    { label: t('running'), value: 'RUNNING' },
    { label: t('completed'), value: 'COMPLETED' },
    { label: t('failed'), value: 'FAILED' },
    { label: t('degraded'), value: 'DEGRADED' },
  ]
}

export function buildPipelineUiText(t: Translator) {
  return {
    title: t('title'),
    subtitle: t('subtitle'),
    recentRuns: t('recentRuns'),
    runDetail: t('runDetail'),
  }
}

export default function PipelineRunsPage() {
  const t = useTranslations('PipelinePage')
  const locale = useLocale()
  const [coupleId, setCoupleId] = useState<string | null>(null)
  const [status, setStatus] = useState<'' | RunStatus>('')
  const [runs, setRuns] = useState<PipelineRunListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [runDetail, setRunDetail] = useState<PipelineRunDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [errorText, setErrorText] = useState<string | null>(null)
  const statusOptions = useMemo(() => buildPipelineStatusOptions(t), [t])
  const uiText = useMemo(() => buildPipelineUiText(t), [t])

  useEffect(() => {
    async function fetchRuns() {
      setLoading(true)
      setErrorText(null)

      const coupleRes = await fetch('/api/couples/mine')
      if (!coupleRes.ok) {
        setLoading(false)
        setErrorText(t('loadCoupleFailed'))
        return
      }
      const couple = await coupleRes.json()
      setCoupleId(couple.id)

      const query = new URLSearchParams({ limit: '50' })
      if (status) query.set('status', status)
      const runsRes = await fetch(`/api/couples/${couple.id}/runs?${query.toString()}`)
      if (!runsRes.ok) {
        setLoading(false)
        setErrorText(t('loadRunsFailed'))
        return
      }

      const data = await runsRes.json()
      setRuns(data.runs ?? [])
      setLoading(false)
    }

    fetchRuns()
  }, [status, t])

  useEffect(() => {
    async function fetchRunDetail() {
      if (!coupleId || !selectedRunId) {
        setRunDetail(null)
        return
      }

      setDetailLoading(true)
      const res = await fetch(`/api/couples/${coupleId}/runs/${selectedRunId}`)
      if (res.ok) {
        setRunDetail(await res.json())
      } else {
        setRunDetail(null)
      }
      setDetailLoading(false)
    }

    fetchRunDetail()
  }, [coupleId, selectedRunId])

  const statusPillClass = useMemo(
    () => ({
      RUNNING: 'bg-info/10 text-info border border-info/20',
      COMPLETED: 'bg-success/10 text-success border border-success/20',
      FAILED: 'bg-error/10 text-error border border-error/20',
      DEGRADED: 'bg-warning/10 text-warning border border-warning/20',
    }),
    []
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-warm-text">{uiText.title}</h1>
          <p className="text-sm text-warm-muted mt-1">{uiText.subtitle}</p>
        </div>

        <select
          value={status}
          onChange={e => setStatus(e.target.value as '' | RunStatus)}
          className="px-3 py-2 rounded-[var(--radius-md)] border border-warm-border bg-warm-surface text-sm text-warm-text"
        >
          {statusOptions.map(option => (
            <option key={option.label} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {errorText && (
        <div className="rounded-[var(--radius-md)] border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
          {errorText}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-4">
        <section className="bg-warm-surface border border-warm-border rounded-[var(--radius-lg)] overflow-hidden">
          <div className="px-4 py-3 border-b border-warm-border text-sm font-semibold text-warm-text">
            {uiText.recentRuns}
          </div>

          {loading ? (
            <div className="p-4 text-sm text-warm-muted">{t('loading')}</div>
          ) : runs.length === 0 ? (
            <div className="p-8 text-sm text-warm-muted text-center">{t('empty')}</div>
          ) : (
            <div className="divide-y divide-warm-border/70">
              {runs.map(run => (
                <button
                  key={run.id}
                  onClick={() => setSelectedRunId(run.id)}
                  className={`w-full text-left px-4 py-3 hover:bg-warm-bg/70 transition-colors ${
                    selectedRunId === run.id ? 'bg-warm-bg' : ''
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-warm-text truncate">
                        {run.photo?.fileName || run.id}
                      </p>
                      <p className="text-xs text-warm-muted mt-1 truncate">
                        {run.photo?.album?.title || t('unknownAlbum')} · {t('attempt', { count: run.attemptNumber })}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusPillClass[run.status]}`}>
                      {run.status}
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 text-xs text-warm-muted">
                    <span>{new Date(run.startedAt).toLocaleString(locale)}</span>
                    {run.duration !== null && <span>{run.duration} ms</span>}
                    {run.triggerType && <span>{run.triggerType}</span>}
                  </div>
                  {run.summary && (
                    <p className="mt-2 text-xs text-warm-muted line-clamp-2">{run.summary}</p>
                  )}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="bg-warm-surface border border-warm-border rounded-[var(--radius-lg)] overflow-hidden">
          <div className="px-4 py-3 border-b border-warm-border text-sm font-semibold text-warm-text">
            {uiText.runDetail}
          </div>

          {!selectedRunId ? (
            <div className="p-8 text-sm text-warm-muted text-center">
              {t('selectRun')}
            </div>
          ) : detailLoading ? (
            <div className="p-4 text-sm text-warm-muted">{t('loadingDetail')}</div>
          ) : !runDetail ? (
            <div className="p-4 text-sm text-error">{t('loadDetailFailed')}</div>
          ) : (
            <div className="p-4 space-y-3 text-sm">
              <DetailRow label="Run ID" value={runDetail.id} mono />
              <DetailRow label={t('status')} value={runDetail.status} />
              <DetailRow label={t('triggerType')} value={runDetail.triggerType || '-'} />
              <DetailRow label={t('attemptNumber')} value={String(runDetail.attemptNumber)} />
              <DetailRow label={t('duration')} value={runDetail.duration !== null ? `${runDetail.duration} ms` : '-'} />
              <DetailRow label="Token" value={runDetail.totalTokens !== null ? String(runDetail.totalTokens) : '-'} />
              <DetailRow label="Cost" value={runDetail.totalCost !== null ? String(runDetail.totalCost) : '-'} />
              <DetailRow label={t('errorCode')} value={runDetail.errorCode || '-'} />
              <DetailRow label={t('summary')} value={runDetail.summary || '-'} />
              <DetailRow label={t('photoStatus')} value={runDetail.photo?.status || '-'} />
              <DetailRow label={t('processingError')} value={runDetail.photo?.processingError || '-'} />

              <div className="pt-3 border-t border-warm-border">
                <p className="text-xs font-medium text-warm-text mb-2">{t('nodeResults')}</p>
                <pre className="text-xs bg-warm-bg rounded-[var(--radius-sm)] p-3 overflow-auto max-h-64 text-warm-muted">
                  {JSON.stringify(runDetail.nodeResults, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function DetailRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="grid grid-cols-[88px_1fr] gap-2">
      <span className="text-warm-muted">{label}</span>
      <span className={`${mono ? 'font-mono text-xs break-all' : ''} text-warm-text`}>{value}</span>
    </div>
  )
}
