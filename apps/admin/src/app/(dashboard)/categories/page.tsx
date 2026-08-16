import type { Metadata } from 'next'

import {
  CategoryManagement,
  type CategoryPageParams,
} from '@/features/categories/category-management'

export const metadata: Metadata = { title: '分类管理' }

export default async function CategoriesPage({
  searchParams,
}: {
  searchParams: Promise<CategoryPageParams>
}) {
  return <CategoryManagement params={await searchParams} />
}
