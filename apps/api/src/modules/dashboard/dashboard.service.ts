import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js'
@Injectable() export class DashboardService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async overview() { const [published, drafts, pendingComments, media, views] = await Promise.all([this.prisma.client.article.count({ where: { deletedAt: null, status: 'PUBLISHED' } }), this.prisma.client.article.count({ where: { deletedAt: null, status: 'DRAFT' } }), this.prisma.client.comment.count({ where: { deletedAt: null, status: 'PENDING' } }), this.prisma.client.media.count({ where: { deletedAt: null } }), this.prisma.client.articleViewDaily.aggregate({ _sum: { views: true, visitors: true } })]); return { publishedArticles: published, draftArticles: drafts, pendingComments, mediaCount: media, views: (views._sum.views ?? 0n).toString(), visitors: (views._sum.visitors ?? 0n).toString() } }
}
