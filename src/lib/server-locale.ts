import { cookies, headers } from 'next/headers'
import { detectLocaleFromAcceptLanguage, isLocale, LOCALE_COOKIE, type Locale } from '@/lib/i18n'

/**
 * Server-only: reads the locale cookie, falling back to Accept-Language
 * detection on a first visit (no cookie yet). Kept out of `i18n.ts` so that
 * module can stay importable from client components — `next/headers` cannot
 * cross that boundary.
 */
export async function getLocale(): Promise<Locale> {
  const cookieStore = await cookies()
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value
  if (isLocale(fromCookie)) return fromCookie

  const headerList = await headers()
  return detectLocaleFromAcceptLanguage(headerList.get('accept-language'))
}
