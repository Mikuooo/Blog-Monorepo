import type { Metadata } from 'next'
import Link from 'next/link'

import { PageHeader } from '@/components/page-header'
import { ArticleForm } from '@/features/articles/article-form'

export const metadata: Metadata = { title: '新建文章' }

export default function NewArticlePage() {
  return (
    <>
      <PageHeader
        actions={
          <Link
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
            href="/articles"
          >
            返回文章列表
          </Link>
        }
        description="编写内容并保存为草稿，后续可在文章管理中继续完善和发布。"
        eyebrow="Content"
        title="新建文章"
      />
      <ArticleForm />
    </>
  )
}
