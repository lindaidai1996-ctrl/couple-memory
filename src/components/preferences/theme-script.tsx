import {
  DEFAULT_THEME,
  LOCALE_COOKIE_NAME,
  THEME_COOKIE_NAME,
} from '@/lib/preferences'

const themeScript = `
(function() {
  var themeCookie = document.cookie.split('; ').find(function(entry) {
    return entry.indexOf('${THEME_COOKIE_NAME}=') === 0
  });
  var theme = themeCookie ? decodeURIComponent(themeCookie.split('=').slice(1).join('=')) : '${DEFAULT_THEME}';
  var resolved = theme === 'system'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.dataset.theme = resolved;
})();
`

export function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: themeScript }} />
}

export const preferenceCookieNames = {
  theme: THEME_COOKIE_NAME,
  locale: LOCALE_COOKIE_NAME,
}
