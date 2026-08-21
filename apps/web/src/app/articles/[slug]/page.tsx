import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPublicArticle, type PublicArticle } from '../../../lib/public-api'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = await getPublicArticle((await params).slug)
  if (!article) return {}

  const description = article.seoDescription || article.summary || undefined
  const image = article.cover?.url ? [{ url: article.cover.url, alt: article.title }] : undefined

  return {
    alternates: article.canonicalUrl ? { canonical: article.canonicalUrl } : undefined,
    description,
    openGraph: {
      description,
      images: image,
      publishedTime: article.publishedAt,
      title: article.seoTitle || article.title,
      type: 'article',
      authors: [article.author.displayName],
    },
    title: article.seoTitle || article.title,
    twitter: { card: image ? 'summary_large_image' : 'summary', images: image, title: article.title, description },
  }
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const article = await getPublicArticle((await params).slug)
  if (!article) notFound()

  const structuredData = JSON.stringify(toArticleStructuredData(article)).replace(/</gu, '\\u003c')

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
      <Link className="text-sm font-semibold text-teal-700 transition hover:text-teal-900" href="/">
        ← 返回文章列表
      </Link>
      <article className="mt-10">
        <header className="mx-auto max-w-3xl">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-500">
            {article.category ? <Link className="font-semibold text-teal-700 hover:text-teal-900" href={`/categories/${article.category.slug}`}>{article.category.name}</Link> : null}
            <time dateTime={article.publishedAt}>{formatDate(article.publishedAt)}</time>
            <span aria-hidden="true">·</span>
            <span>{article.readingTime} 分钟阅读</span>
          </div>
          <h1 className="mt-5 text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">{article.title}</h1>
          <p className="mt-5 text-sm text-slate-500">作者：{article.author.displayName}</p>
          {article.summary ? <p className="mt-8 text-xl leading-9 text-slate-600">{article.summary}</p> : null}
          {article.tags.length > 0 ? (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="文章标签">
              {article.tags.map((tag) => <li className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600" key={tag.id}>{tag.name}</li>)}
            </ul>
          ) : null}
        </header>
        {article.cover ? <div className="relative mx-auto mt-10 aspect-[16/8] max-w-4xl overflow-hidden rounded-xl bg-slate-100"> <Image alt={article.title} className="object-cover" fill priority sizes="(max-width: 1024px) 100vw, 896px" src={article.cover.url} unoptimized /> </div> : null}
        <div className="mx-auto mt-10 max-w-3xl whitespace-pre-wrap text-base leading-8 text-slate-800 sm:text-lg sm:leading-9">{article.content}</div>
      </article>
      <script dangerouslySetInnerHTML={{ __html: structuredData }} type="application/ld+json" />
    </main>
  )
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date(value))
}

function toArticleStructuredData(article: PublicArticle) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    author: { '@type': 'Person', name: article.author.displayName },
    datePublished: article.publishedAt,
    description: article.seoDescription || article.summary || undefined,
    headline: article.title,
    image: article.cover?.url ? [article.cover.url] : undefined,
    mainEntityOfPage: { '@type': 'WebPage', '@id': article.canonicalUrl || `/articles/${article.slug}` },
  }
}
