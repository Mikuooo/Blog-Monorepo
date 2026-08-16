import type { Metadata } from 'next'

import { TagManagement, type TagPageParams } from '@/features/tags/tag-management'

export const metadata: Metadata = { title: '标签管理' }

export default async function TagsPage({ searchParams }: { searchParams: Promise<TagPageParams> }) {
  return <TagManagement params={await searchParams} />
}
