import { Module } from '@nestjs/common'

import { ReadonlyPrismaService } from './readonly-prisma.service.js'
import { PrismaService } from './prisma.service.js'

@Module({
  exports: [PrismaService, ReadonlyPrismaService],
  providers: [PrismaService, ReadonlyPrismaService],
})
export class PrismaInfrastructureModule {}
