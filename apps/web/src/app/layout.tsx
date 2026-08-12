import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  description: 'A public blog powered by the Blog Platform monorepo.',
  title: {
    default: 'Blog Platform',
    template: '%s · Blog Platform',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
