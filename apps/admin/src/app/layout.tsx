import type { Metadata } from 'next'

import './globals.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  description: 'Blog Platform 内容管理后台',
  title: {
    default: '控制台 · Blog Platform',
    template: '%s · Blog Platform',
  },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
