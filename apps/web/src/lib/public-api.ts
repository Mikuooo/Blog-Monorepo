export type PublicArticle = {
  id: string
  title: string
  slug: string
  summary: string | null
  publishedAt: string
  readingTime: number
  author: { displayName: string; username: string }
  category: { id: string; name: string; slug: string } | null
  cover: { height: number | null; url: string; width: number | null } | null
  tags: Array<{ id: string; name: string; slug: string }>
  content?: string
  contentHtml?: string | null
  canonicalUrl?: string | null
  seoTitle?: string | null
  seoDescription?: string | null
}
type PublicArticleList = { items: PublicArticle[]; page: number; pageSize: number; total: number; totalPages: number }
const baseUrl = (process.env.WEB_API_BASE_URL?.trim() || 'http://localhost:3001').replace(/\/$/u, '')
export async function listPublicArticles(page = 1, keyword = ''): Promise<PublicArticleList> { try { const response = await fetch(`${baseUrl}/api/v1/public/articles?page=${page}&pageSize=12${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ''}`, { next: { revalidate: 60 } }); if (!response.ok) return { items: [], page, pageSize: 12, total: 0, totalPages: 0 }; return response.json() as Promise<PublicArticleList> } catch { return { items: [], page, pageSize: 12, total: 0, totalPages: 0 } } }
export async function getPublicArticle(slug: string): Promise<PublicArticle | null> { try { const response = await fetch(`${baseUrl}/api/v1/public/articles/${encodeURIComponent(slug)}`, { next: { revalidate: 60 } }); if (response.status === 404 || !response.ok) return null; return response.json() as Promise<PublicArticle> } catch { return null } }
