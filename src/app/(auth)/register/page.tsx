'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'
import { ArrowRightIcon, Button, PlusIcon } from '@/components/ui/button'

const inputClassName = `h-[42px] w-full rounded-[var(--radius-md)] border border-warm-border
  bg-[var(--dashboard-input-bg)] px-3 text-sm text-warm-text placeholder:text-[color:var(--dashboard-text-faint)]
  outline-none transition-[border-color,box-shadow,transform,background-color] duration-200
  hover:border-warm-accent/30 focus:border-warm-accent/40 focus:shadow-[var(--dashboard-focus-ring)] focus:-translate-y-px`

export default function RegisterPage() {
  const t = useTranslations('RegisterPage')
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const confirmPassword = formData.get('confirmPassword') as string

    if (password !== confirmPassword) {
      setError(t('errorPasswordMismatch'))
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError(t('errorPasswordShort'))
      setLoading(false)
      return
    }

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error || t('errorRegisterFailed'))
      setLoading(false)
      return
    }

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError(t('errorAutoLoginFailed'))
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <>
      <div className="mb-6 space-y-3">
        <div className="inline-flex rounded-full border border-warm-border bg-[var(--dashboard-accent-soft)] px-3 py-2 text-[10px] uppercase tracking-[0.18em] text-warm-accent">
          Shared Space
        </div>
        <div className="space-y-2">
          <h1 className="font-[var(--font-display)] text-[clamp(28px,4vw,40px)] leading-[0.94] tracking-[-0.05em] text-warm-text">
            {t('title')}
          </h1>
          <p className="max-w-[34ch] text-[13px] leading-6 text-warm-muted">
            {t('subtitle')}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-[var(--radius-md)] border border-red-200/70 bg-red-50/80 px-4 py-3 text-sm text-error dark:border-red-500/20 dark:bg-red-500/10">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="block text-xs font-medium text-warm-text">
            {t('name')}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className={inputClassName}
            placeholder={t('namePlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="block text-xs font-medium text-warm-text">
            {t('email')}
          </label>
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

        <div className="space-y-2">
          <label htmlFor="password" className="block text-xs font-medium text-warm-text">
            {t('password')}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className={inputClassName}
            placeholder={t('passwordPlaceholder')}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="confirmPassword" className="block text-xs font-medium text-warm-text">
            {t('confirmPassword')}
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className={inputClassName}
            placeholder={t('confirmPasswordPlaceholder')}
          />
        </div>

        <Button
          type="submit"
          loading={loading}
          fullWidth
          variant="brand"
          leadingIcon={<PlusIcon />}
          trailingIcon={!loading ? <ArrowRightIcon /> : undefined}
        >
          {loading ? t('submitting') : t('submit')}
        </Button>
      </form>

      <p className="mt-5 text-center text-sm text-warm-muted">
        {t('hasAccount')}
        <Link href="/login" className="ml-1 font-medium text-warm-accent hover:text-warm-accent-hover">
          {t('login')}
        </Link>
      </p>
    </>
  )
}
