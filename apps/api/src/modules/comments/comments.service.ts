import { Inject, Injectable } from '@nestjs/common'
import { COMMENTS_REPOSITORY, type CommentsRepository } from './comments.repository.js'
export type CommentStatus = 'APPROVED' | 'PENDING' | 'REJECTED' | 'SPAM'
export type CommentListQuery = { articleId?: string; page: number; pageSize: number; status?: CommentStatus }
export type CommentItem = { articleId: string; content: string; createdAt: string; id: string; nickname: string | null; status: CommentStatus; updatedAt: string }
@Injectable() export class CommentsService {
  constructor(@Inject(COMMENTS_REPOSITORY) private readonly repository: CommentsRepository) {}
  listPublic(articleId: string, page: number, pageSize: number) { return this.list({ articleId, page, pageSize, status: 'APPROVED' }) }
  list(query: CommentListQuery) { return this.repository.list(query) }
  updateStatus(id: string, status: CommentStatus) { return this.repository.updateStatus(id, status) }
  delete(id: string) { return this.repository.delete(id) }
}
