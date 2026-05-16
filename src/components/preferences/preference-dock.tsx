import { LocaleSwitcher } from '@/components/preferences/locale-switcher'
import { ThemeToggle } from '@/components/preferences/theme-toggle'

export function PreferenceDock({ showTheme = true }: { showTheme?: boolean }) {
  return (
    <div className="absolute right-4 top-4 z-30 flex items-center gap-2">
      <LocaleSwitcher />
      {showTheme ? <ThemeToggle /> : null}
    </div>
  )
}
