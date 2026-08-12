import type { Metadata } from 'next'

import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  description: 'Authenticated editorial workspace for Blog Platform.',
  title: 'Blog Platform Admin',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
