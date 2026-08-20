import { Controller, Get, Inject, Param } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger'
import { ContentService } from './content.service.js'
@ApiTags('public-content') @Controller({ path: 'public', version: '1' }) export class ContentController {
  constructor(@Inject(ContentService) private readonly service: ContentService) {}
  @Get('pages/:slug') @ApiOperation({ operationId: 'getPublicPage' }) @ApiOkResponse() page(@Param('slug') slug: string) { return this.service.page(slug) }
  @Get('menus/:code') @ApiOperation({ operationId: 'getPublicMenu' }) @ApiOkResponse() menu(@Param('code') code: string) { return this.service.menu(code) }
  @Get('links') @ApiOperation({ operationId: 'listPublicLinks' }) @ApiOkResponse() links() { return this.service.links() }
}
