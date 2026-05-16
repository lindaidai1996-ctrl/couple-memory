'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'

interface InviteInfo {
  coupleName: string
  ownerName: string | null
  ownerAvatar: string | null
  expiresAt: string | null
  memberCount: number
}

type PageState =
  | { status: 'loading' }
  | { status: 'ready'; info: InviteInfo }
  | { status: 'error'; code: number; message: string; coupleName?: string }
  | { status: 'accepting' }
  | { status: 'success' }

export default function InvitePage() {
  const params = useParams()
  const router = useRouter()
  const code = params.code as string
  const [state, setState] = useState<PageState>({ status: 'loading' })

  useEffect(() => {
    async function fetchInfo() {
      const res = await fetch(`/api/invite/${code}/info`)
      if (res.ok) {
        const info: InviteInfo = await res.json()
        setState({ status: 'ready', info })
        return
      }
      const data = await res.json()
      if (res.status === 410) {
        setState({ status: 'error', code: 410, message: '邀请已过期', coupleName: data.coupleName })
      } else if (res.status === 404) {
        setState({ status: 'error', code: 404, message: '邀请链接无效' })
      } else {
        setState({ status: 'error', code: res.status, message: '加载失败' })
      }
    }
    fetchInfo()
  }, [code])

  async function handleAccept() {
    setState({ status: 'accepting' })
    const res = await fetch(`/api/invite/${code}/accept`, { method: 'POST' })
    if (res.ok) {
      setState({ status: 'success' })
      setTimeout(() => router.push('/dashboard'), 1500)
      return
    }
    const data = await res.json()
    if (res.status === 401) {
      const callbackUrl = encodeURIComponent(`/invite/${code}`)
      router.push(`/login?callbackUrl=${callbackUrl}`)
      return
    }
    if (res.status === 409) {
      const msg = data.error === 'Already a member' ? '你已经是成员了' : '空间已满员'
      setState({ status: 'error', code: 409, message: msg })
      return
    }
    setState({ status: 'error', code: res.status, message: data.error || '加入失败' })
  }

  function formatExpiry(expiresAt: string | null) {
    if (!expiresAt) return null
    const diff = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    if (diff <= 0) return '即将过期'
    return `邀请将在 ${diff} 天后过期`
  }

  return (
    <div className="min-h-screen bg-film-bg text-film-text film-grain flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-[var(--radius-xl)] p-8 text-center"
        style={{
          backgroundColor: 'var(--color-film-surface)',
          border: '1px solid rgba(139,115,85,0.2)',
        }}
      >
        {state.status === 'loading' && <LoadingState />}
        {state.status === 'ready' && (
          <ReadyState info={state.info} onAccept={handleAccept} formatExpiry={formatExpiry} />
        )}
        {state.status === 'accepting' && <AcceptingState />}
        {state.status === 'success' && <SuccessState />}
        {state.status === 'error' && (
          <ErrorState code={state.code} message={state.message} coupleName={state.coupleName} />
        )}
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="space-y-4 py-4">
      <div className="w-16 h-16 rounded-full bg-film-bg animate-pulse mx-auto" />
      <div className="h-4 w-32 bg-film-bg rounded animate-pulse mx-auto" />
    </div>
  )
}

function ReadyState({
  info,
  onAccept,
  formatExpiry,
}: {
  info: InviteInfo
  onAccept: () => void
  formatExpiry: (e: string | null) => string | null
}) {
  const expiry = formatExpiry(info.expiresAt)

  return (
    <>
      <div className="flex items-center justify-center mb-6">
        <div className="w-14 h-14 rounded-full bg-film-accent/20 border-2 border-film-accent/40 flex items-center justify-center overflow-hidden">
          {info.ownerAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={info.ownerAvatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-film-accent text-lg font-medium">
              {info.ownerName?.[0] ?? '?'}
            </span>
          )}
        </div>
        <div className="w-14 h-14 rounded-full bg-film-bg border-2 border-film-muted/30 flex items-center justify-center -ml-4">
          <span className="text-film-muted text-lg">?</span>
        </div>
      </div>

      <h1
        className="text-xl font-bold mb-2"
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {info.coupleName}
      </h1>
      <p className="text-sm text-film-muted mb-6">
        {info.ownerName ?? '对方'}邀请你成为伴侣
      </p>

      <button
        onClick={onAccept}
        className="w-full py-3 text-sm font-medium text-film-text bg-film-accent
          rounded-[var(--radius-md)] hover:opacity-90 transition-opacity"
      >
        加入空间
      </button>

      {expiry && (
        <p className="text-xs text-film-muted mt-4">{expiry}</p>
      )}
    </>
  )
}

function AcceptingState() {
  return (
    <div className="py-8">
      <div className="w-8 h-8 border-2 border-film-accent border-t-transparent rounded-full animate-spin mx-auto mb-4" />
      <p className="text-sm text-film-muted">加入中...</p>
    </div>
  )
}

function SuccessState() {
  return (
    <div className="py-8">
      <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <p className="text-sm text-film-text">加入成功，正在跳转...</p>
    </div>
  )
}

function ErrorState({
  code,
  message,
  coupleName,
}: {
  code: number
  message: string
  coupleName?: string
}) {
  return (
    <div className="py-4">
      {coupleName && (
        <p className="text-sm text-film-muted mb-2">{coupleName}</p>
      )}
      <p className="text-base text-film-text mb-2">{message}</p>
      <p className="text-xs text-film-muted mb-6">
        {code === 410 && '请联系对方重新发送邀请链接'}
        {code === 404 && '请确认链接是否正确'}
        {code === 409 && ''}
      </p>
      <Link
        href="/"
        className="inline-block px-5 py-2.5 text-sm font-medium text-film-muted border border-film-surface
          rounded-[var(--radius-md)] hover:bg-film-surface transition-colors"
      >
        返回首页
      </Link>
    </div>
  )
}
