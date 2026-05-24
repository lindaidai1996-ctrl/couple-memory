'use client'

import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

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
          <Button onClick={reset} scheme="film" variant="brand">
            {t('retry')}
          </Button>
          <Button onClick={() => (window.location.href = '/')} scheme="film" variant="secondary">
            {t('backHome')}
          </Button>
        </div>
      </body>
    </html>
  )
}
