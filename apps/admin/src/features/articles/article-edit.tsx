'use client'
import { ArticleForm } from './article-form'
import { useArticleDetail } from './article-query'
import { articleFormDefaults, type ArticleFormValues } from './article-schema'
export function ArticleEdit({ articleId }: { articleId: string }) {
  const article = useArticleDetail(articleId)
  if (article.isPending) return <p className="p-6 text-sm text-muted-foreground">正在加载文章...</p>
  if (article.isError) return <p className="p-6 text-sm text-destructive">文章加载失败，请返回列表重试。</p>
  const detail = article.data
  const values: ArticleFormValues = { ...articleFormDefaults, allowComment: detail.allowComment, canonicalUrl: detail.canonicalUrl ?? '', categoryId: detail.category?.id ?? '', content: detail.content, coverId: detail.cover?.id ?? '', hasExistingPassword: detail.passwordProtected, isFeatured: detail.isFeatured, isPinned: detail.isPinned, seoDescription: detail.seoDescription ?? '', seoTitle: detail.seoTitle ?? '', slug: detail.slug, summary: detail.summary ?? '', tagIds: detail.tags.map((tag) => tag.id), title: detail.title, visibility: detail.visibility }
  return <ArticleForm articleId={articleId} expectedVersion={detail.version} initialValues={values} />
}
