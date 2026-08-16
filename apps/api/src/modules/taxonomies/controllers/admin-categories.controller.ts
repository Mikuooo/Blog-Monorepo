import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  Inject,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common'
import {
  ApiBadRequestResponse,
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
  CategoryListItem,
  TaxonomyDeleteResult,
  TaxonomyListResult,
} from '../application/taxonomy.contract.js'
import { TaxonomyError } from '../application/taxonomy.errors.js'
import { TaxonomyService } from '../application/taxonomy.service.js'
import {
  CategoryListItemDto,
  CategoryListResponseDto,
  CreateCategoryDto,
  TaxonomyDeleteResponseDto,
  TaxonomyErrorResponseDto,
  TaxonomyListQueryDto,
  UpdateCategoryDto,
} from '../dto/admin-taxonomy.dto.js'

@ApiTags('admin-categories')
@ApiCookieAuth('session')
@RequirePermissions('category.read')
@UseGuards(SessionAuthGuard, TrustedOriginGuard, PermissionGuard)
@Controller({ path: 'admin/categories', version: '1' })
export class AdminCategoriesController {
  constructor(@Inject(TaxonomyService) private readonly service: TaxonomyService) {}

  @Get()
  @ApiOperation({ operationId: 'listAdminCategories', summary: 'List categories' })
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
  @ApiOkResponse({ type: CategoryListResponseDto })
  @ApiBadRequestResponse({ type: TaxonomyErrorResponseDto })
  @ApiUnauthorizedResponse({ type: TaxonomyErrorResponseDto })
  @ApiForbiddenResponse({ type: TaxonomyErrorResponseDto })
  list(
    @Query(validationPipe(TaxonomyListQueryDto)) query: TaxonomyListQueryDto,
  ): Promise<TaxonomyListResult<CategoryListItem>> {
    return this.service.listCategories(query)
  }

  @Post()
  @RequirePermissions('category.create')
  @ApiOperation({ operationId: 'createAdminCategory', summary: 'Create a category' })
  @ApiBody({ type: CreateCategoryDto })
  @ApiCreatedResponse({ type: CategoryListItemDto })
  @ApiConflictResponse({ type: TaxonomyErrorResponseDto })
  create(
    @Body(validationPipe(CreateCategoryDto)) body: CreateCategoryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<CategoryListItem> {
    return handleTaxonomy(() => this.service.createCategory({ ...body, actorId: userId(request) }))
  }

  @Patch(':categoryId')
  @RequirePermissions('category.update')
  @ApiOperation({ operationId: 'updateAdminCategory', summary: 'Update a category' })
  @ApiParam({ format: 'uuid', name: 'categoryId', type: String })
  @ApiBody({ type: UpdateCategoryDto })
  @ApiOkResponse({ type: CategoryListItemDto })
  @ApiNotFoundResponse({ type: TaxonomyErrorResponseDto })
  @ApiConflictResponse({ type: TaxonomyErrorResponseDto })
  update(
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @Body(validationPipe(UpdateCategoryDto)) body: UpdateCategoryDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<CategoryListItem> {
    return handleTaxonomy(() =>
      this.service.updateCategory({ ...body, actorId: userId(request), categoryId }),
    )
  }

  @Delete(':categoryId')
  @RequirePermissions('category.delete')
  @ApiOperation({ operationId: 'deleteAdminCategory', summary: 'Soft-delete a category' })
  @ApiParam({ format: 'uuid', name: 'categoryId', type: String })
  @ApiOkResponse({ type: TaxonomyDeleteResponseDto })
  @ApiNotFoundResponse({ type: TaxonomyErrorResponseDto })
  @ApiConflictResponse({ type: TaxonomyErrorResponseDto })
  delete(
    @Param('categoryId', new ParseUUIDPipe()) categoryId: string,
    @Req() request: AuthenticatedRequest,
  ): Promise<TaxonomyDeleteResult> {
    return handleTaxonomy(() => this.service.deleteCategory(categoryId, userId(request)))
  }
}

export function validationPipe(expectedType: new () => object): ValidationPipe {
  return new ValidationPipe({
    expectedType,
    forbidNonWhitelisted: true,
    transform: true,
    whitelist: true,
  })
}

export async function handleTaxonomy<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    if (!(error instanceof TaxonomyError)) throw error
    const statusCode = error.code.endsWith('_NOT_FOUND') ? 404 : 409
    const messages: Record<TaxonomyError['code'], string> = {
      CATEGORY_HAS_CHILDREN: 'Delete or move child categories first.',
      CATEGORY_NOT_FOUND: 'The requested category was not found.',
      CATEGORY_PARENT_CYCLE: 'A category cannot be its own ancestor.',
      CATEGORY_PARENT_NOT_FOUND: 'The selected parent category was not found.',
      CATEGORY_SLUG_EXISTS: 'The category slug is already in use.',
      TAG_NAME_EXISTS: 'The tag name is already in use.',
      TAG_NOT_FOUND: 'The requested tag was not found.',
      TAG_SLUG_EXISTS: 'The tag slug is already in use.',
    }
    throw new HttpException(
      { code: error.code, message: messages[error.code], statusCode },
      statusCode,
    )
  }
}

export function userId(request: AuthenticatedRequest): string {
  if (!request.auth)
    throw new HttpException(
      { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication is required.', statusCode: 401 },
      401,
    )
  return request.auth.user.id
}
