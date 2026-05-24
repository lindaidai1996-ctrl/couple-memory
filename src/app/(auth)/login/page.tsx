'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowRightIcon, Button } from '@/components/ui/button'

const inputClassName = `h-[42px] w-full rounded-[var(--radius-md)] border border-warm-border
  bg-[var(--dashboard-input-bg)] px-3 text-sm text-warm-text placeholder:text-[color:var(--dashboard-text-faint)]
  outline-none transition-[border-color,box-shadow,transform,background-color] duration-200
  hover:border-warm-accent/30 focus:border-warm-accent/40 focus:shadow-[var(--dashboard-focus-ring)] focus:-translate-y-px`

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
      <div className="mb-4 space-y-2">
        <div className="inline-flex rounded-full border border-warm-border bg-[var(--dashboard-accent-soft)] px-3 py-1.5 text-[10px] uppercase tracking-[0.18em] text-warm-accent">
          Private Access
        </div>
        <div className="space-y-1.5">
          <h1 className="font-[var(--font-display)] text-[clamp(28px,4vw,40px)] leading-[0.94] tracking-[-0.05em] text-warm-text">
            {t('title')}
          </h1>
          <p className="text-[12px] leading-5 text-warm-muted sm:text-[13px] sm:whitespace-nowrap">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-[var(--radius-md)] border border-red-200/70 bg-red-50/80 px-3 py-2.5 text-sm text-error dark:border-red-500/20 dark:bg-red-500/10">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs text-warm-muted">
            <label htmlFor="email" className="font-medium text-warm-text">
              {t('email')}
            </label>
          </div>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className={inputClassName}
            placeholder="name@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-3 text-xs text-warm-muted">
            <label htmlFor="password" className="font-medium text-warm-text">
              {t('password')}
            </label>
          </div>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className={inputClassName}
            placeholder="••••••••"
          />
        </div>

        <div className="flex items-center justify-between gap-3 text-xs text-warm-muted">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" defaultChecked className="h-4 w-4 accent-warm-accent" />
            <span>{t('remember')}</span>
          </label>
          <span>{t('sessionNote')}</span>
        </div>

        <div className="space-y-2 pt-0.5">
          <Button
            type="submit"
            loading={loading}
            fullWidth
            variant="secondary"
            trailingIcon={<ArrowRightIcon />}
          >
            {loading ? t('submitting') : t('submit')}
          </Button>
        </div>
      </form>

      <p className="mt-4 text-center text-sm text-warm-muted">
        {t('noAccount')}
        <Link href="/register" className="ml-1 font-medium text-warm-accent hover:text-warm-accent-hover">
          {t('register')}
        </Link>
      </p>
    </>
  )
}
