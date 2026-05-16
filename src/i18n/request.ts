import { cookies, headers } from 'next/headers'
import { getRequestConfig } from 'next-intl/server'
import { LOCALE_COOKIE_NAME, pickLocale } from '@/lib/preferences'

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const locale = pickLocale(
    cookieStore.get(LOCALE_COOKIE_NAME)?.value,
    headerStore.get('accept-language')
  )

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  }
})
