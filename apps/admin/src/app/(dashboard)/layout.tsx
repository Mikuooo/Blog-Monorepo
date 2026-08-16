import type { ReactNode } from 'react'

import { AdminShell } from '@/components/admin-shell'
import { AuthBoundary } from '@/features/auth/auth-boundary'

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthBoundary>
      <AdminShell>{children}</AdminShell>
    </AuthBoundary>
  )
}
