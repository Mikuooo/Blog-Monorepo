import Link from 'next/link'
import { listPublicArticles } from '../lib/public-api'

export default async function HomePage() {
  const articles = await listPublicArticles()
  return (
    <main>
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link className="text-xl font-bold" href="/">Blog Platform</Link>
          <span className="text-sm text-slate-500">{articles.total} 篇文章</span>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="text-4xl font-bold">最新文章</h1>
        <div className="mt-8 divide-y divide-slate-200 border-y border-slate-200">
          {articles.items.map((article) => (
            <article className="grid gap-3 py-7 md:grid-cols-[1fr_auto]" key={article.id}>
              <div>
                <Link className="text-2xl font-semibold hover:text-teal-700" href={`/articles/${article.slug}`}>{article.title}</Link>
                {article.summary ? <p className="mt-2 max-w-3xl leading-7 text-slate-600">{article.summary}</p> : null}
              </div>
              <div className="text-sm text-slate-500 md:text-right">
                <time dateTime={article.publishedAt}>{new Date(article.publishedAt).toLocaleDateString('zh-CN')}</time>
                <p>{article.readingTime} 分钟阅读</p>
              </div>
            </article>
          ))}
          {articles.items.length === 0 ? <p className="py-16 text-center text-slate-500">暂无已发布文章</p> : null}
        </div>
      </section>
    </main>
  )
}
