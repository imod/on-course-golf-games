import { listChallenges, listPlayers } from '@/server/catalog'
import { SetupForm } from './SetupForm'
import { LanguageToggle } from '@/components/LanguageToggle'
import { getDict } from '@/lib/i18n'
import { getLocale } from '@/lib/server-locale'

export const dynamic = 'force-dynamic'

export default async function SetupPage() {
  const [players, challenges, locale] = await Promise.all([
    listPlayers(),
    listChallenges(),
    getLocale(),
  ])
  const dict = getDict(locale)

  return (
    <main style={{ maxWidth: 430, margin: '0 auto', padding: '24px 20px 32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 34, lineHeight: 1.05, margin: '0 0 18px' }}>
          {dict.newRound}
        </h1>
        <LanguageToggle locale={locale} />
      </div>
      <SetupForm players={players} challenges={challenges} locale={locale} />
    </main>
  )
}
