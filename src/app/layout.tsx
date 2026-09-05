import type { ReactNode } from 'react'
import './tokens.css'
import { getLocale } from '@/lib/server-locale'

export const metadata = { title: 'On-course games' }

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = await getLocale()

  return (
    <html lang={locale}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif&family=Space+Grotesk:wght@400;500;700&display=swap"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
