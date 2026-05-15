'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import Link from 'next/link'

export default function RegisterPage() {
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
      setError('两次输入的密码不一致')
      setLoading(false)
      return
    }

    if (password.length < 6) {
      setError('密码至少6位')
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
      setError(data.error || '注册失败，请重试')
      setLoading(false)
      return
    }

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('注册成功但自动登录失败，请手动登录')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <>
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-warm-text tracking-tight">
          创建账号
        </h1>
        <p className="text-warm-muted text-sm mt-1">开始记录你们的故事</p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-[var(--radius-md)] bg-red-50 text-error text-sm text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-warm-text mb-1.5">
            昵称
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="w-full px-4 py-3 rounded-[var(--radius-md)] border border-warm-border
              bg-warm-bg text-warm-text placeholder:text-warm-muted/60
              focus:ring-2 focus:ring-warm-accent/30 focus:border-warm-accent outline-none
              transition-all duration-200"
            placeholder="你的昵称"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-warm-text mb-1.5">
            邮箱
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
            密码
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-[var(--radius-md)] border border-warm-border
              bg-warm-bg text-warm-text placeholder:text-warm-muted/60
              focus:ring-2 focus:ring-warm-accent/30 focus:border-warm-accent outline-none
              transition-all duration-200"
            placeholder="至少6位"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-warm-text mb-1.5">
            确认密码
          </label>
          <input
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            className="w-full px-4 py-3 rounded-[var(--radius-md)] border border-warm-border
              bg-warm-bg text-warm-text placeholder:text-warm-muted/60
              focus:ring-2 focus:ring-warm-accent/30 focus:border-warm-accent outline-none
              transition-all duration-200"
            placeholder="再次输入密码"
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
          {loading ? '注册中...' : '注册'}
        </button>
      </form>

      <p className="text-center text-sm text-warm-muted mt-6">
        已有账号？
        <Link href="/login" className="text-warm-accent hover:text-warm-accent-hover font-medium ml-1">
          登录
        </Link>
      </p>
    </>
  )
}
