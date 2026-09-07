import Link from 'next/link'
import { getDict, type Locale } from '@/lib/i18n'

/**
 * The one way out of every screen that isn't the rounds list. Rendered small
 * and quiet above the title, so it never competes with the screen's own
 * actions — but always present, including on a finished round.
 */
export function BackLink({ locale, href = '/' }: { locale: Locale; href?: string }) {
  const dict = getDict(locale)

  return (
    <Link
      href={href}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        minHeight: 44,
        color: 'var(--muted)',
        textDecoration: 'none',
        fontSize: 13,
        letterSpacing: 0.6,
      }}
    >
      <span aria-hidden="true">←</span>
      {dict.backToRounds}
    </Link>
  )
}
