import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js'

@Injectable()
export class ContentService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  page(slug: string): Promise<unknown> {
    return this.prisma.client.page.findFirstOrThrow({ select: { title: true, slug: true, content: true, contentHtml: true, seoTitle: true, seoDescription: true, publishedAt: true }, where: { deletedAt: null, slug, status: 'PUBLISHED', publishedAt: { lte: new Date() } } })
  }
  async menu(code: string): Promise<unknown> {
    const menu = await this.prisma.client.menu.findUniqueOrThrow({ where: { code }, select: { code: true, name: true, items: { where: { isVisible: true }, orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }], select: { id: true, parentId: true, type: true, label: true, url: true, sortOrder: true, page: { select: { slug: true } }, category: { select: { slug: true } } } } } })
    return { ...menu, items: menu.items.map((item) => ({ ...item, url: item.url ?? (item.page ? `/pages/${item.page.slug}` : item.category ? `/categories/${item.category.slug}` : null), page: undefined, category: undefined })) }
  }
  links(): Promise<unknown> { return this.prisma.client.link.findMany({ orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }], select: { id: true, name: true, url: true, description: true, logoUrl: true, sortOrder: true }, where: { isVisible: true } }) }
}
