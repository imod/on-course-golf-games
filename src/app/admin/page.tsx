import { AdminPanel } from './AdminPanel'
import { getLocale } from '@/lib/server-locale'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const locale = await getLocale()

  return (
    <main>
      <AdminPanel locale={locale} />
    </main>
  )
}
