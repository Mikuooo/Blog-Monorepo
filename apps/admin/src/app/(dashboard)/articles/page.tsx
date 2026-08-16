import type { Metadata } from 'next'

import { ArticleList, type ArticleListParams } from '@/features/articles/article-list'

export const metadata: Metadata = { title: '文章管理' }

export default async function ArticlesPage({
  searchParams,
}: {
  searchParams: Promise<ArticleListParams>
}) {
  return <ArticleList params={await searchParams} />
}
