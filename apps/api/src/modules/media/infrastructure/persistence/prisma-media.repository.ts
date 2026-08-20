import { Inject, Injectable } from '@nestjs/common'
import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js'
import type { MediaListQuery, MediaListResult, MediaRecord, MediaRepository } from '../../application/media.contract.js'

@Injectable()
export class PrismaMediaRepository implements MediaRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}
  async complete(input: Parameters<MediaRepository['complete']>[0]): Promise<MediaRecord> {
    const extension = input.originalName.includes('.') ? input.originalName.split('.').pop()?.toLowerCase().slice(0, 32) ?? null : null
    const media = await this.prisma.client.media.upsert({
      create: { bucket: input.bucket, extension, filename: input.filename, mediaType: input.mediaType, mimeType: input.mimeType, objectKey: input.key, originalName: input.originalName, size: BigInt(input.size), storageProvider: 'S3', uploaderId: input.actorId, url: input.stableUrl },
      update: {},
      where: { objectKey: input.key },
      select: mediaSelect,
    })
    return mapMedia(media)
  }
  async findById(id: string, includeDeleted = false) {
    const media = await this.prisma.client.media.findFirst({ select: { ...mediaSelect, deletedAt: true }, where: { id, ...(includeDeleted ? {} : { deletedAt: null }) } })
    return media ? { ...mapMedia(media), deletedAt: media.deletedAt?.toISOString() ?? null } : null
  }
  async list(query: MediaListQuery): Promise<MediaListResult> {
    const keyword = query.keyword?.trim()
    const where = { deletedAt: null, ...(query.mediaType ? { mediaType: query.mediaType } : {}), ...(keyword ? { OR: [{ originalName: { contains: keyword, mode: 'insensitive' as const } }, { filename: { contains: keyword, mode: 'insensitive' as const } }] } : {}) }
    const [items, total] = await Promise.all([
      this.prisma.client.media.findMany({ orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: mediaSelect, skip: (query.page - 1) * query.pageSize, take: query.pageSize, where }),
      this.prisma.client.media.count({ where }),
    ])
    return { items: items.map(mapMedia), page: query.page, pageSize: query.pageSize, total, totalPages: total === 0 ? 0 : Math.ceil(total / query.pageSize) }
  }
  async softDelete(id: string) {
    const current = await this.findById(id, true)
    if (!current) return null
    if (!current.deletedAt) await this.prisma.client.media.update({ data: { deletedAt: new Date() }, where: { id } })
    return current
  }
}

const mediaSelect = { bucket: true, createdAt: true, filename: true, id: true, mediaType: true, mimeType: true, objectKey: true, originalName: true, size: true, url: true } as const
function mapMedia(media: { bucket: string; createdAt: Date; filename: string; id: string; mediaType: MediaRecord['mediaType']; mimeType: string; objectKey: string; originalName: string; size: bigint; url: string }): MediaRecord {
  return { ...media, createdAt: media.createdAt.toISOString(), size: media.size.toString() }
}
