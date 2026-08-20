import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicArticle } from '../../../lib/public-api'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = await getPublicArticle((await params).slug)
  return article ? { title: article.seoTitle || article.title, description: article.seoDescription || article.summary } : {}
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = await getPublicArticle((await params).slug)
  if (!article) notFound()
  return <main className="mx-auto max-w-3xl px-6 py-12">
    <Link className="text-sm font-medium text-teal-700" href="/">返回文章列表</Link>
    <article className="mt-8">
      <h1 className="text-4xl font-bold leading-tight">{article.title}</h1>
      <p className="mt-4 text-sm text-slate-500">{new Date(article.publishedAt).toLocaleDateString('zh-CN')} · {article.readingTime} 分钟阅读</p>
      {article.summary ? <p className="mt-8 text-xl leading-8 text-slate-600">{article.summary}</p> : null}
      <div className="mt-10 whitespace-pre-wrap text-base leading-8 text-slate-800">{article.content}</div>
    </article>
  </main>
}
