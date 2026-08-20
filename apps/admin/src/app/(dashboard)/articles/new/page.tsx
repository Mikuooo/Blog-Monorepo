import type { Metadata } from 'next'

import { ArticleForm } from '@/features/articles/article-form'

export const metadata: Metadata = { title: '新建文章' }

export default function NewArticlePage() {
  return (
    <>
      <ArticleForm />
    </>
  )
}
