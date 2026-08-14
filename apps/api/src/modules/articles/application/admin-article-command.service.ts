import { Inject, Injectable } from '@nestjs/common'

import { hashPassword } from '@blog/shared/password'

import {
  ADMIN_ARTICLE_COMMAND_REPOSITORY,
  type AdminArticleCommandRepository,
  type AdminArticleCommandResult,
  type ArticleEditableInput,
  type ArticleVersionCommand,
  type CreateAdminArticleCommand,
  type ScheduleAdminArticleCommand,
  type UpdateAdminArticleCommand,
} from './admin-article-command.contract.js'
import { AdminArticleCommandError } from './admin-article-command.errors.js'

export type ArticlePasswordInput = { clearPassword?: boolean; password?: string }

@Injectable()
export class AdminArticleCommandService {
  constructor(
    @Inject(ADMIN_ARTICLE_COMMAND_REPOSITORY)
    private readonly repository: AdminArticleCommandRepository,
  ) {}

  async create(
    input: Omit<CreateAdminArticleCommand, 'clearPassword' | 'passwordHash'> & ArticlePasswordInput,
  ): Promise<AdminArticleCommandResult> {
    const password = await passwordMutation(input)
    return this.repository.create({
      ...editableFields(input),
      ...password,
      actorId: input.actorId,
      content: input.content,
      slug: input.slug,
      title: input.title,
    })
  }

  async update(
    input: Omit<UpdateAdminArticleCommand, 'clearPassword' | 'passwordHash'> & ArticlePasswordInput,
  ): Promise<AdminArticleCommandResult> {
    const password = await passwordMutation(input)
    return this.repository.update({
      ...editableFields(input),
      ...password,
      actorId: input.actorId,
      articleId: input.articleId,
      expectedVersion: input.expectedVersion,
    })
  }

  publish(command: ArticleVersionCommand): Promise<AdminArticleCommandResult> {
    return this.repository.publish(command)
  }

  schedule(command: ScheduleAdminArticleCommand): Promise<AdminArticleCommandResult> {
    if (command.scheduledAt.getTime() <= Date.now()) {
      throw new AdminArticleCommandError('ARTICLE_INVALID_SCHEDULE_TIME')
    }
    return this.repository.schedule(command)
  }

  cancelSchedule(command: ArticleVersionCommand): Promise<AdminArticleCommandResult> {
    return this.repository.cancelSchedule(command)
  }

  archive(command: ArticleVersionCommand): Promise<AdminArticleCommandResult> {
    return this.repository.archive(command)
  }
}

async function passwordMutation(input: ArticlePasswordInput) {
  if (input.password && input.clearPassword) {
    throw new AdminArticleCommandError('ARTICLE_PASSWORD_MUTATION_CONFLICT')
  }
  if (input.password) return { passwordHash: await hashPassword(input.password) }
  return input.clearPassword ? { clearPassword: true } : {}
}

function editableFields(input: ArticleEditableInput): ArticleEditableInput {
  const fields: ArticleEditableInput = {}
  for (const key of [
    'allowComment',
    'canonicalUrl',
    'categoryId',
    'content',
    'coverId',
    'isFeatured',
    'isPinned',
    'seoDescription',
    'seoTitle',
    'slug',
    'summary',
    'tagIds',
    'title',
    'visibility',
  ] as const) {
    if (input[key] !== undefined) Object.assign(fields, { [key]: input[key] })
  }
  return fields
}
