import { Controller, Get, Inject, Param, ParseUUIDPipe, UseGuards } from '@nestjs/common'
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { PrismaService } from '../../../infrastructure/prisma/prisma.service.js'
import { RequirePermissions } from '../../auth/decorators/require-permissions.js'
import { PermissionGuard } from '../../auth/guards/permission.guard.js'
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard.js'
import { TrustedOriginGuard } from '../../auth/guards/trusted-origin.guard.js'
@ApiTags('admin-article-revisions') @ApiCookieAuth('session') @RequirePermissions('article.read') @UseGuards(SessionAuthGuard, TrustedOriginGuard, PermissionGuard) @Controller({ path: 'admin/articles', version: '1' })
export class AdminArticleRevisionsController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  @Get(':articleId/revisions') @ApiOperation({ operationId: 'listAdminArticleRevisions' }) @ApiOkResponse()
  async list(@Param('articleId', new ParseUUIDPipe()) articleId: string): Promise<RevisionItem[]> { return (await this.prisma.client.articleRevision.findMany({ orderBy: [{ version: 'desc' }], select: revisionSelect, where: { articleId } })).map(mapRevision) }
  @Get(':articleId/revisions/:revisionId') @ApiOperation({ operationId: 'getAdminArticleRevision' }) @ApiOkResponse()
  async get(@Param('articleId', new ParseUUIDPipe()) articleId: string, @Param('revisionId', new ParseUUIDPipe()) revisionId: string): Promise<RevisionItem> { return mapRevision(await this.prisma.client.articleRevision.findFirstOrThrow({ select: revisionSelect, where: { articleId, id: revisionId } })) }
}
const revisionSelect = { id: true, articleId: true, version: true, title: true, summary: true, content: true, createdAt: true, createdBy: { select: { id: true, displayName: true, username: true } } } as const
type RevisionItem = { id: string; articleId: string; version: number; title: string; summary: string | null; content: string; createdAt: string; createdBy: { id: string; displayName: string; username: string } }
function mapRevision(row: { id: string; articleId: string; version: number; title: string; summary: string | null; content: string; createdAt: Date; createdBy: { id: string; displayName: string; username: string } }): RevisionItem { return { ...row, createdAt: row.createdAt.toISOString() } }
