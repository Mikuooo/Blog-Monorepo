import type { CreateTagRequest, UpdateTagRequest } from './tag-api'
import { z } from 'zod'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

export const tagFormSchema = z.object({
  description: z.string().trim().max(2000, '描述不能超过 2000 个字符'),
  name: z.string().trim().min(1, '请输入标签名称').max(120, '名称不能超过 120 个字符'),
  slug: z
    .string()
    .trim()
    .min(1, '请输入标签别名')
    .max(160, '别名不能超过 160 个字符')
    .regex(slugPattern, '只能使用小写字母、数字和连字符'),
})

export type TagFormValues = z.infer<typeof tagFormSchema>
export const tagDefaults = (tag?: {
  description: string | null
  name: string
  slug: string
}): TagFormValues => ({
  description: tag?.description ?? '',
  name: tag?.name ?? '',
  slug: tag?.slug ?? '',
})
export const toCreateTag = (values: TagFormValues): CreateTagRequest => ({
  name: values.name.trim(),
  slug: values.slug.trim(),
  ...(values.description ? { description: values.description.trim() } : {}),
})
export const toUpdateTag = (values: TagFormValues): UpdateTagRequest => ({
  description: values.description.trim(),
  name: values.name.trim(),
  slug: values.slug.trim(),
})
export function slugifyTag(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 160)
    .replace(/-+$/u, '')
}
