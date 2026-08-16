export type DefaultArticleStatus = 'DRAFT' | 'PUBLISHED'

export type BasicSettings = {
  faviconUrl: string
  logoUrl: string
  siteDescription: string
  siteName: string
  siteUrl: string
}

export type SeoSettings = {
  defaultDescription: string
  defaultTitle: string
  keywords: string[]
}

export type ContentSettings = {
  articlesPerPage: number
  commentsEnabled: boolean
  defaultArticleStatus: DefaultArticleStatus
}

export type SystemSettings = {
  basic: BasicSettings
  content: ContentSettings
  seo: SeoSettings
  updatedAt: string | null
}

export type UpdateSystemSettingsCommand = {
  actorId: string
  settings: Omit<SystemSettings, 'updatedAt'>
}

export type SettingValue = boolean | number | string | string[]
export type SettingValueType = 'BOOLEAN' | 'JSON' | 'NUMBER' | 'STRING'

export type SettingRecord = {
  key: string
  updatedAt: string
  value: unknown
}

export type SettingWrite = {
  description: string
  isPublic: boolean
  key: string
  type: SettingValueType
  value: SettingValue
}

export const SETTINGS_REPOSITORY = Symbol('SETTINGS_REPOSITORY')

export interface SettingsRepository {
  findSettings(keys: string[]): Promise<SettingRecord[]>
  updateSettings(actorId: string, values: SettingWrite[]): Promise<SettingRecord[]>
}
