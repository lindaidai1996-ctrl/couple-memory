export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* 全屏背景 — 暂用渐变，后续替换为真实照片 */}
      <div className="absolute inset-0 bg-gradient-to-br from-film-bg via-[#2a2420] to-[#1a1510]" />
      <div className="absolute inset-0 bg-[url('/images/auth-bg.jpg')] bg-cover bg-center opacity-40" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />

      {/* 暗角 vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(0,0,0,0.6)_100%)]" />

      {/* 卡片 */}
      <div className="relative z-10 w-full max-w-[420px] mx-4">
        <div className="bg-white/95 backdrop-blur-md rounded-[var(--radius-xl)] shadow-2xl p-8 sm:p-10">
          {children}
        </div>
      </div>
    </div>
  )
}
