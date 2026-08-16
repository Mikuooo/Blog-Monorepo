import { z } from 'zod'

import type { SystemSettings, UpdateSystemSettingsRequest } from './settings-api'

const urlOrEmpty = z
  .string()
  .max(2048, '链接不能超过 2048 个字符')
  .refine((value) => value === '' || isHttpUrl(value), '请输入完整的 http 或 https 链接')

const keywordsText = z
  .string()
  .max(1800, '关键词内容过长')
  .superRefine((value, context) => {
    const keywords = parseKeywords(value)
    if (keywords.length > 20) {
      context.addIssue({ code: 'custom', message: '最多填写 20 个关键词' })
    }
    if (keywords.some((keyword) => keyword.length > 80)) {
      context.addIssue({ code: 'custom', message: '单个关键词不能超过 80 个字符' })
    }
  })

export const settingsFormSchema = z.object({
  basic: z.object({
    faviconUrl: urlOrEmpty,
    logoUrl: urlOrEmpty,
    siteDescription: z.string().max(500, '站点描述不能超过 500 个字符'),
    siteName: z.string().trim().min(1, '请填写站点名称').max(160, '站点名称不能超过 160 个字符'),
    siteUrl: urlOrEmpty,
  }),
  content: z.object({
    articlesPerPage: z.number().int().min(10).max(100),
    commentsEnabled: z.boolean(),
    defaultArticleStatus: z.enum(['DRAFT', 'PUBLISHED']),
  }),
  seo: z.object({
    defaultDescription: z.string().max(500, 'SEO 描述不能超过 500 个字符'),
    defaultTitle: z.string().max(240, 'SEO 标题不能超过 240 个字符'),
    keywords: keywordsText,
  }),
})

export type SettingsFormValues = z.infer<typeof settingsFormSchema>

export function settingsFormDefaults(settings?: SystemSettings): SettingsFormValues {
  return {
    basic: settings?.basic ?? {
      faviconUrl: '',
      logoUrl: '',
      siteDescription: '',
      siteName: 'Blog Platform',
      siteUrl: '',
    },
    content: settings?.content ?? {
      articlesPerPage: 10,
      commentsEnabled: true,
      defaultArticleStatus: 'DRAFT',
    },
    seo: {
      defaultDescription: settings?.seo.defaultDescription ?? '',
      defaultTitle: settings?.seo.defaultTitle ?? '',
      keywords: settings?.seo.keywords.join(', ') ?? '',
    },
  }
}

export function toUpdateSettings(values: SettingsFormValues): UpdateSystemSettingsRequest {
  return {
    basic: values.basic,
    content: values.content,
    seo: {
      defaultDescription: values.seo.defaultDescription,
      defaultTitle: values.seo.defaultTitle,
      keywords: parseKeywords(values.seo.keywords),
    },
  }
}

function parseKeywords(value: string): string[] {
  return [
    ...new Set(
      value
        .split(/[,，\n]/u)
        .map((keyword) => keyword.trim())
        .filter(Boolean),
    ),
  ]
}

function isHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}
