import { Controller, Get } from '@nestjs/common'
import { ApiOkResponse, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger'
import { Inject } from '@nestjs/common'
import { TaxonomyService } from '../application/taxonomy.service.js'
import type { PublicTaxonomyItem } from '../application/taxonomy.contract.js'

class PublicTaxonomyItemDto { @ApiProperty({ type: String }) id!: string; @ApiProperty({ type: String }) name!: string; @ApiProperty({ type: String }) slug!: string; @ApiProperty({ nullable: true, type: String }) description!: string | null; @ApiProperty({ type: Number }) articleCount!: number }

@ApiTags('public-taxonomies')
@Controller({ path: 'public', version: '1' })
export class PublicTaxonomiesController {
  constructor(@Inject(TaxonomyService) private readonly service: TaxonomyService) {}
  @Get('categories') @ApiOperation({ operationId: 'listPublicCategories' }) @ApiOkResponse({ isArray: true, type: PublicTaxonomyItemDto }) categories(): Promise<PublicTaxonomyItem[]> { return this.service.listPublicCategories() }
  @Get('tags') @ApiOperation({ operationId: 'listPublicTags' }) @ApiOkResponse({ isArray: true, type: PublicTaxonomyItemDto }) tags(): Promise<PublicTaxonomyItem[]> { return this.service.listPublicTags() }
}
