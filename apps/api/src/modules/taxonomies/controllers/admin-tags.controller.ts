import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import {
  ApiBody,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger'

import type { AuthenticatedRequest } from '../../auth/auth-request.js'
import { RequirePermissions } from '../../auth/decorators/require-permissions.js'
import { PermissionGuard } from '../../auth/guards/permission.guard.js'
import { SessionAuthGuard } from '../../auth/guards/session-auth.guard.js'
import { TrustedOriginGuard } from '../../auth/guards/trusted-origin.guard.js'
import type {
  TagListItem,
  TaxonomyDeleteResult,
  TaxonomyListResult,
} from '../application/taxonomy.contract.js'
import { TaxonomyService } from '../application/taxonomy.service.js'
import {
  CreateTagDto,
  TagListItemDto,
  TagListResponseDto,
  TaxonomyDeleteResponseDto,
  TaxonomyErrorResponseDto,
  TaxonomyListQueryDto,
  UpdateTagDto,
} from '../dto/admin-taxonomy.dto.js'
import { handleTaxonomy, userId, validationPipe } from './admin-categories.controller.js'

@ApiTags('admin-tags')
@ApiCookieAuth('session')
@RequirePermissions('tag.read')
@UseGuards(SessionAuthGuard, TrustedOriginGuard, PermissionGuard)
@Controller({ path: 'admin/tags', version: '1' })
export class AdminTagsController {
  constructor(@Inject(TaxonomyService) private readonly service: TaxonomyService) {}

  @Get()
  @ApiOperation({ operationId: 'listAdminTags', summary: 'List tags' })
  @ApiQuery({ maxLength: 120, name: 'keyword', required: false, type: String })
  @ApiQuery({ default: 1, minimum: 1, name: 'page', required: false, type: Number })
  @ApiQuery({
    default: 20,
    maximum: 100,
    minimum: 1,
    name: 'pageSize',
    required: false,
    type: Number,
  })
  @ApiOkResponse({ type: TagListResponseDto })
  @ApiUnauthorizedResponse({ type: TaxonomyErrorResponseDto })
  @ApiForbiddenResponse({ type: TaxonomyErrorResponseDto })
  list(
    @Query(validationPipe(TaxonomyListQueryDto)) query: TaxonomyListQueryDto,
  ): Promise<TaxonomyListResult<TagListItem>> {
    return this.service.listTags(query)
  }

  @Post()
  @RequirePermissions('tag.create')
  @ApiOperation({ operationId: 'createAdminTag', summary: 'Create a tag' })
  @ApiBody({ type: CreateTagDto })
  @ApiCreatedResponse({ type: TagListItemDto })
  @ApiConflictResponse({ type: TaxonomyErrorResponseDto })
  create(
    @Body(validationPipe(CreateTagDto)) body: CreateTagDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<TagListItem> {
    return handleTaxonomy(() => this.service.createTag({ ...body, actorId: userId(request) }))
  }

  @Patch(':tagId')
  @RequirePermissions('tag.update')
  @ApiOperation({ operationId: 'updateAdminTag', summary: 'Update a tag' })
  @ApiParam({ format: 'uuid', name: 'tagId', type: String })
  @ApiBody({ type: UpdateTagDto })
  @ApiOkResponse({ type: TagListItemDto })
  @ApiNotFoundResponse({ type: TaxonomyErrorResponseDto })
  @ApiConflictResponse({ type: TaxonomyErrorResponseDto })
  update(
    @Param('tagId', new ParseUUIDPipe()) tagId: string,
    @Body(validationPipe(UpdateTagDto)) body: UpdateTagDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<TagListItem> {
    return handleTaxonomy(() =>
      this.service.updateTag({ ...body, actorId: userId(request), tagId }),
    )
  }

  @Delete(':tagId')
  @RequirePermissions('tag.delete')
  @ApiOperation({ operationId: 'deleteAdminTag', summary: 'Delete a tag' })
  @ApiParam({ format: 'uuid', name: 'tagId', type: String })
  @ApiOkResponse({ type: TaxonomyDeleteResponseDto })
  @ApiNotFoundResponse({ type: TaxonomyErrorResponseDto })
  delete(
    @Param('tagId', new ParseUUIDPipe()) tagId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<TaxonomyDeleteResult> {
    return handleTaxonomy(() => this.service.deleteTag(tagId, userId(request)))
  }
}
