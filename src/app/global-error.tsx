'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
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
          页面开小差了
        </p>
        <p style={{ fontSize: '14px', color: '#9c8e82', margin: '0 0 32px' }}>
          别担心，刷新一下通常就好了
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
            刷新页面
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
            返回首页
          </button>
        </div>
      </body>
    </html>
  )
}
