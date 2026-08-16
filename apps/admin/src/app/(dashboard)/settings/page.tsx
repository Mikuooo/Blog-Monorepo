import type { Metadata } from 'next'

import { SystemSettingsManagement } from '@/features/settings/system-settings-management'

export const metadata: Metadata = { title: '系统设置' }

export default function SettingsPage() {
  return <SystemSettingsManagement />
}
