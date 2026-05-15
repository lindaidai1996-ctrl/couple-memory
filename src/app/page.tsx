import Link from 'next/link'

export default function Home() {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-film-bg via-[#2a2420] to-[#1a1510]" />
      <div className="absolute inset-0 bg-[url('/images/auth-bg.jpg')] bg-cover bg-center opacity-40" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />

      <div className="relative z-10 w-full max-w-[480px] mx-4">
        <div className="bg-white/95 backdrop-blur-md rounded-[var(--radius-xl)] shadow-2xl p-10 sm:p-12">
          <h1 className="text-3xl font-bold tracking-tight text-black">
            Couple Memory
          </h1>
          <p className="mt-2 text-base text-zinc-500">
            AI-driven couple memory platform
          </p>

          <div className="mt-8 flex flex-col gap-3">
            <Link
              href="/login"
              className="w-full py-3 px-4 bg-black text-white rounded-[var(--radius-lg)] text-center font-medium hover:bg-zinc-800 transition-colors"
            >
              登录
            </Link>
            <Link
              href="/register"
              className="w-full py-3 px-4 border border-zinc-300 text-black rounded-[var(--radius-lg)] text-center font-medium hover:bg-zinc-100 transition-colors"
            >
              注册
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
