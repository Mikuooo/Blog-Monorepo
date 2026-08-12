export type ArticleStatus = 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'SCHEDULED'

export type ArticleFixture = {
  author: string
  category: string
  id: string
  publishedAt: string | null
  status: ArticleStatus
  title: string
  updatedAt: string
  views: number
}

export const articleFixtures: ArticleFixture[] = [
  {
    author: '林默',
    category: '工程实践',
    id: 'art-001',
    publishedAt: '2026-08-12 14:30',
    status: 'PUBLISHED',
    title: '从零构建一个可维护的内容平台',
    updatedAt: '2026-08-12 14:30',
    views: 12840,
  },
  {
    author: '林默',
    category: '前端开发',
    id: 'art-002',
    publishedAt: null,
    status: 'DRAFT',
    title: 'Next.js Server Components 实践笔记',
    updatedAt: '2026-08-12 09:12',
    views: 0,
  },
  {
    author: '陈序',
    category: '独立开发',
    id: 'art-003',
    publishedAt: null,
    status: 'IN_REVIEW',
    title: '写给独立开发者的内容工作流',
    updatedAt: '2026-08-11 18:46',
    views: 0,
  },
  {
    author: '林默',
    category: '后端架构',
    id: 'art-004',
    publishedAt: '2026-08-10 11:05',
    status: 'PUBLISHED',
    title: '如何设计可靠的后台任务',
    updatedAt: '2026-08-10 11:05',
    views: 9321,
  },
  {
    author: '周屿',
    category: '产品设计',
    id: 'art-005',
    publishedAt: '2026-08-15 09:00',
    status: 'SCHEDULED',
    title: '内容管理系统的信息架构',
    updatedAt: '2026-08-09 16:20',
    views: 0,
  },
  {
    author: '陈序',
    category: '数据库',
    id: 'art-006',
    publishedAt: '2026-08-08 08:30',
    status: 'PUBLISHED',
    title: 'PostgreSQL 事务边界的常见误区',
    updatedAt: '2026-08-08 08:30',
    views: 7640,
  },
]
