import { Injectable } from '@nestjs/common'
import type { OnModuleDestroy } from '@nestjs/common'

import { getRequiredEnvironmentVariable } from '@blog/config'
import { createDatabaseClient, type DatabaseClient } from '@blog/database'

@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: DatabaseClient

  constructor() {
    this.client = createDatabaseClient(getRequiredEnvironmentVariable('DATABASE_URL'))
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect()
  }
}
