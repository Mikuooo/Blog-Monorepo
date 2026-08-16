import { Inject, Injectable } from '@nestjs/common'

import {
  SETTINGS_REPOSITORY,
  type SettingRecord,
  type SettingsRepository,
  type SettingValue,
  type SettingValueType,
  type SettingWrite,
  type SystemSettings,
  type UpdateSystemSettingsCommand,
} from './settings.contract.js'

type SettingDefinition = {
  description: string
  isPublic: boolean
  type: SettingValueType
}

const settingDefinitions = {
  'content.articles_per_page': {
    description: 'Default number of articles displayed on each page.',
    isPublic: true,
    type: 'NUMBER',
  },
  'content.comments_enabled': {
    description: 'Whether comments are enabled by default.',
    isPublic: true,
    type: 'BOOLEAN',
  },
  'content.default_article_status': {
    description: 'Default status used by content authoring workflows.',
    isPublic: false,
    type: 'STRING',
  },
  'seo.default_description': {
    description: 'Default search description for pages without an override.',
    isPublic: true,
    type: 'STRING',
  },
  'seo.default_title': {
    description: 'Default search title for pages without an override.',
    isPublic: true,
    type: 'STRING',
  },
  'seo.keywords': {
    description: 'Default search keywords.',
    isPublic: true,
    type: 'JSON',
  },
  'site.description': {
    description: 'Public site description.',
    isPublic: true,
    type: 'STRING',
  },
  'site.favicon_url': {
    description: 'Public favicon URL.',
    isPublic: true,
    type: 'STRING',
  },
  'site.logo_url': {
    description: 'Public site logo URL.',
    isPublic: true,
    type: 'STRING',
  },
  'site.name': {
    description: 'Public site name.',
    isPublic: true,
    type: 'STRING',
  },
  'site.url': {
    description: 'Canonical public site URL.',
    isPublic: true,
    type: 'STRING',
  },
} satisfies Record<string, SettingDefinition>

@Injectable()
export class SettingsService {
  constructor(@Inject(SETTINGS_REPOSITORY) private readonly repository: SettingsRepository) {}

  async getSettings(): Promise<SystemSettings> {
    return buildSettings(await this.repository.findSettings(Object.keys(settingDefinitions)))
  }

  async updateSettings(command: UpdateSystemSettingsCommand): Promise<SystemSettings> {
    const values = toSettingWrites(command.settings)
    return buildSettings(await this.repository.updateSettings(command.actorId, values))
  }
}

function toSettingWrites(settings: UpdateSystemSettingsCommand['settings']): SettingWrite[] {
  const values: Record<keyof typeof settingDefinitions, SettingValue> = {
    'content.articles_per_page': settings.content.articlesPerPage,
    'content.comments_enabled': settings.content.commentsEnabled,
    'content.default_article_status': settings.content.defaultArticleStatus,
    'seo.default_description': settings.seo.defaultDescription,
    'seo.default_title': settings.seo.defaultTitle,
    'seo.keywords': settings.seo.keywords,
    'site.description': settings.basic.siteDescription,
    'site.favicon_url': settings.basic.faviconUrl,
    'site.logo_url': settings.basic.logoUrl,
    'site.name': settings.basic.siteName,
    'site.url': settings.basic.siteUrl,
  }
  return Object.entries(settingDefinitions).map(([key, definition]) => ({
    ...definition,
    key,
    value: values[key as keyof typeof settingDefinitions],
  }))
}

function buildSettings(records: SettingRecord[]): SystemSettings {
  const values = new Map(records.map((record) => [record.key, record.value]))
  const updatedAt = records.reduce<string | null>(
    (latest, record) => (!latest || record.updatedAt > latest ? record.updatedAt : latest),
    null,
  )
  return {
    basic: {
      faviconUrl: stringValue(values.get('site.favicon_url'), ''),
      logoUrl: stringValue(values.get('site.logo_url'), ''),
      siteDescription: stringValue(values.get('site.description'), ''),
      siteName: stringValue(values.get('site.name'), 'Blog Platform'),
      siteUrl: stringValue(values.get('site.url'), ''),
    },
    content: {
      articlesPerPage: boundedInteger(values.get('content.articles_per_page'), 10, 100, 10),
      commentsEnabled: booleanValue(values.get('content.comments_enabled'), true),
      defaultArticleStatus:
        values.get('content.default_article_status') === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
    },
    seo: {
      defaultDescription: stringValue(values.get('seo.default_description'), ''),
      defaultTitle: stringValue(values.get('seo.default_title'), ''),
      keywords: stringArrayValue(values.get('seo.keywords')),
    },
    updatedAt,
  }
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

function booleanValue(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

function boundedInteger(
  value: unknown,
  minimum: number,
  maximum: number,
  fallback: number,
): number {
  return typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= minimum &&
    value <= maximum
    ? value
    : fallback
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : []
}
