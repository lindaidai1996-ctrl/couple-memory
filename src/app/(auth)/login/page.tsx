'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import Link from 'next/link'

export default function LoginPage() {
  const t = useTranslations('LoginPage')
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirect: false,
    })

    if (result?.error) {
      setError(t('error'))
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-warm-text tracking-tight">
          {t('title')}
        </h1>
        <p className="text-warm-muted text-sm mt-1">{t('subtitle')}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-red-50 text-error text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-warm-text mb-1.5">
            {t('email')}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full px-4 py-3 rounded-[var(--radius-md)] border border-warm-border
              bg-warm-bg text-warm-text placeholder:text-warm-muted/60
              focus:ring-2 focus:ring-warm-accent/30 focus:border-warm-accent outline-none
              transition-all duration-200"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-warm-text mb-1.5">
            {t('password')}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full px-4 py-3 rounded-[var(--radius-md)] border border-warm-border
              bg-warm-bg text-warm-text placeholder:text-warm-muted/60
              focus:ring-2 focus:ring-warm-accent/30 focus:border-warm-accent outline-none
              transition-all duration-200"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 mt-2 bg-warm-accent text-white font-medium rounded-[var(--radius-md)]
            hover:bg-warm-accent-hover active:scale-[0.98]
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-all duration-200 shadow-sm hover:shadow-md"
        >
          {loading ? t('submitting') : t('submit')}
        </button>
      </form>

      <p className="text-center text-sm text-warm-muted mt-6">
        {t('noAccount')}
        <Link href="/register" className="text-warm-accent hover:text-warm-accent-hover font-medium ml-1">
          {t('register')}
        </Link>
      </p>
    </>
  )
}
