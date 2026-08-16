import { Injectable } from '@nestjs/common'
import type { OnModuleDestroy } from '@nestjs/common'

import { getRequiredEnvironmentVariable } from '@blog/config'
import { createDatabaseClient, type DatabaseClient } from '@blog/database'

@Injectable()
export class ReadonlyPrismaService implements OnModuleDestroy {
  readonly client: DatabaseClient

  constructor() {
    const databaseUrl =
      (process.env.NODE_ENV === 'test' ? undefined : process.env.DATABASE_READONLY_URL?.trim()) ||
      getRequiredEnvironmentVariable('DATABASE_URL')
    this.client = createDatabaseClient(databaseUrl)
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect()
  }
}
