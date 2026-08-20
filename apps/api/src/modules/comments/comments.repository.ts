import type { CommentItem, CommentListQuery, CommentStatus } from './comments.service.js'
export const COMMENTS_REPOSITORY = Symbol('COMMENTS_REPOSITORY')
export interface CommentsRepository { list(query: CommentListQuery): Promise<{ items: CommentItem[]; page: number; pageSize: number; total: number; totalPages: number }>; updateStatus(id: string, status: CommentStatus): Promise<CommentItem>; delete(id: string): Promise<{ id: string }> }
