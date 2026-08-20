import type { Metadata } from 'next'
import { DashboardOverview } from '@/features/dashboard/dashboard-overview'
import { DashboardTaskSwitcher } from '@/features/dashboard/components/dashboard-task-switcher'
export const metadata: Metadata = { title: '工作台' }
export default function DashboardPage() { return <div className="grid min-w-0 gap-4"><DashboardOverview /><DashboardTaskSwitcher /></div> }
