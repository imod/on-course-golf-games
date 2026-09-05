'use client'

import { useRouter } from 'next/navigation'
import { getDict, LOCALE_COOKIE, type Locale } from '@/lib/i18n'

/**
 * Quiet, small toggle for the header of each screen. Sets the locale cookie
 * and refreshes so the server re-renders in the other language. The visible
 * label is the target language's own short code — "DE" / "EN" — which, like
 * a flag icon, is not itself translated.
 */
export function LanguageToggle({ locale }: { locale: Locale }) {
  const router = useRouter()
  const dict = getDict(locale)
  const other: Locale = locale === 'de' ? 'en' : 'de'

  function switchTo(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`
    router.refresh()
  }

  return (
    <button
      type="button"
      aria-label={dict.switchLanguage}
      onClick={() => switchTo(other)}
      style={{
        minWidth: 44,
        height: 44,
        padding: '0 10px',
        border: '1px solid var(--rule)',
        borderRadius: 6,
        background: 'transparent',
        color: 'var(--muted)',
        fontFamily: 'var(--sans)',
        fontSize: 12,
        letterSpacing: 0.8,
        cursor: 'pointer',
      }}
    >
      {other.toUpperCase()}
    </button>
  )
}
