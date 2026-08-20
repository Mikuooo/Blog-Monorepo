import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../../infrastructure/prisma/prisma.service.js'
import type { CommentItem, CommentListQuery, CommentStatus } from './comments.service.js'
import type { CommentsRepository } from './comments.repository.js'
@Injectable() export class PrismaCommentsRepository implements CommentsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async list(query: CommentListQuery) { const where = { deletedAt: null, ...(query.articleId ? { articleId: query.articleId } : {}), ...(query.status ? { status: query.status } : {}) }; const [rows, total] = await Promise.all([this.prisma.client.comment.findMany({ orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], select: commentSelect, skip: (query.page - 1) * query.pageSize, take: query.pageSize, where }), this.prisma.client.comment.count({ where })]); return { items: rows.map(mapComment), page: query.page, pageSize: query.pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize) } }
  async updateStatus(id: string, status: CommentStatus) { return mapComment(await this.prisma.client.comment.update({ data: { status }, select: commentSelect, where: { deletedAt: null, id } })) }
  async delete(id: string) { await this.prisma.client.comment.update({ data: { deletedAt: new Date() }, where: { id } }); return { id } }
}
const commentSelect = { articleId: true, content: true, createdAt: true, id: true, nickname: true, status: true, updatedAt: true } as const
function mapComment(row: { articleId: string; content: string; createdAt: Date; id: string; nickname: string | null; status: CommentStatus; updatedAt: Date }): CommentItem { return { ...row, createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString() } }
