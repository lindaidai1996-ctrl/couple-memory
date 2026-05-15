import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Couple Memory',
  description: '我们的故事',
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-film-bg text-film-text film-grain">
      {children}
    </div>
  )
}
