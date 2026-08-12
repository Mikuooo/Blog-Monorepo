import { PrismaPg } from '@prisma/adapter-pg'

import { PrismaClient } from './generated/prisma/client.js'

export type DatabaseClient = PrismaClient

export function createDatabaseClient(databaseUrl: string): DatabaseClient {
  const connectionString = databaseUrl.trim()
  if (!connectionString) throw new Error('A PostgreSQL connection string is required')
  const adapter = new PrismaPg({ connectionString })
  return new PrismaClient({ adapter })
}
