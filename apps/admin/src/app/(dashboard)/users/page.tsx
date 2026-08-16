import type { Metadata } from 'next'

import {
  UserPermissionManagement,
  type UserPermissionPageParams,
} from '@/features/access-control/user-permission-management'

export const metadata: Metadata = { title: '用户权限' }

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<UserPermissionPageParams>
}) {
  return <UserPermissionManagement params={await searchParams} />
}
