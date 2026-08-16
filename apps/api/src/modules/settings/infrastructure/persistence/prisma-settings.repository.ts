import { Inject, Injectable } from '@nestjs/common'

import type { DatabaseClient } from '@blog/database'

import { PrismaService } from '../../../../infrastructure/prisma/prisma.service.js'
import type {
  SettingRecord,
  SettingsRepository,
  SettingValue,
  SettingWrite,
} from '../../application/settings.contract.js'

type TransactionClient = Parameters<Parameters<DatabaseClient['$transaction']>[0]>[0]

@Injectable()
export class PrismaSettingsRepository implements SettingsRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async findSettings(keys: string[]): Promise<SettingRecord[]> {
    const settings = await this.prisma.client.setting.findMany({
      orderBy: { key: 'asc' },
      select: { key: true, updatedAt: true, value: true },
      where: { key: { in: keys } },
    })
    return settings.map(mapSetting)
  }

  async updateSettings(actorId: string, values: SettingWrite[]): Promise<SettingRecord[]> {
    return this.prisma.client.$transaction(async (transaction) => {
      const keys = values.map(({ key }) => key)
      const previous = await transaction.setting.findMany({
        select: { key: true, value: true },
        where: { key: { in: keys } },
      })
      await Promise.all(values.map((value) => upsertSetting(transaction, value)))
      await transaction.auditLog.create({
        data: {
          action: 'settings.update',
          after: valuesByKey(values),
          before: Object.fromEntries(previous.map((setting) => [setting.key, setting.value])),
          resource: 'settings',
          resourceId: 'system',
          userId: actorId,
        },
      })
      return (
        await transaction.setting.findMany({
          orderBy: { key: 'asc' },
          select: { key: true, updatedAt: true, value: true },
          where: { key: { in: keys } },
        })
      ).map(mapSetting)
    })
  }
}

function upsertSetting(transaction: TransactionClient, setting: SettingWrite) {
  return transaction.setting.upsert({
    create: setting,
    update: {
      description: setting.description,
      isPublic: setting.isPublic,
      type: setting.type,
      value: setting.value,
    },
    where: { key: setting.key },
  })
}

function valuesByKey(values: SettingWrite[]): Record<string, SettingValue> {
  return Object.fromEntries(values.map(({ key, value }) => [key, value]))
}

function mapSetting(setting: { key: string; updatedAt: Date; value: unknown }): SettingRecord {
  return { key: setting.key, updatedAt: setting.updatedAt.toISOString(), value: setting.value }
}
