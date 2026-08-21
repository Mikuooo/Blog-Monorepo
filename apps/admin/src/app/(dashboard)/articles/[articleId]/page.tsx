import type { Metadata } from 'next'
import { ArticleEdit } from '@/features/articles/article-edit'
export const metadata: Metadata = { title: '编辑文章' }
export default async function EditArticlePage({ params }: { params: Promise<{ articleId: string }> }) { return <ArticleEdit articleId={(await params).articleId} /> }
