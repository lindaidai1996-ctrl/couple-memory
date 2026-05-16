'use client'

import { useTranslations } from 'next-intl'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const t = useTranslations('ErrorPage')
  return (
    <html lang="zh-CN">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#faf8f5',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <p style={{ fontSize: '72px', fontWeight: 700, color: '#ede8e3', margin: '0 0 16px' }}>
          Oops
        </p>
        <p style={{ fontSize: '16px', color: '#3d3530', margin: '0 0 8px' }}>
          {t('title')}
        </p>
        <p style={{ fontSize: '14px', color: '#9c8e82', margin: '0 0 32px' }}>
          {t('subtitle')}
        </p>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={reset}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#fff',
              background: '#c4956a',
              border: 'none',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            {t('retry')}
          </button>
          <button
            onClick={() => (window.location.href = '/')}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 500,
              color: '#9c8e82',
              background: 'transparent',
              border: '1px solid #ede8e3',
              borderRadius: '12px',
              cursor: 'pointer',
            }}
          >
            {t('backHome')}
          </button>
        </div>
      </body>
    </html>
  )
}
