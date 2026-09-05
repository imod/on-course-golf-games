import type { ReactNode } from 'react'
import './tokens.css'

export const metadata = { title: 'On-course games' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
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
