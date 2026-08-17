import type { CreateCategoryRequest, UpdateCategoryRequest } from './category-api'
import { z } from 'zod'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

export const categoryFormSchema = z.object({
  description: z.string().trim().max(2000, '描述不能超过 2000 个字符'),
  name: z.string().trim().min(1, '请输入分类名称').max(120, '名称不能超过 120 个字符'),
  parentId: z.string(),
  slug: z
    .string()
    .trim()
    .min(1, '请输入分类别名')
    .max(160, '别名不能超过 160 个字符')
    .regex(slugPattern, '只能使用小写字母、数字和连字符'),
  sortOrder: z.number().int('排序值必须是整数'),
})

export type CategoryFormValues = z.infer<typeof categoryFormSchema>

export function categoryDefaults(category?: {
  description: string | null
  name: string
  parent: { id: string } | null
  slug: string
  sortOrder: number
}): CategoryFormValues {
  return {
    description: category?.description ?? '',
    name: category?.name ?? '',
    parentId: category?.parent?.id ?? '',
    slug: category?.slug ?? '',
    sortOrder: category?.sortOrder ?? 0,
  }
}

export function toCreateCategory(values: CategoryFormValues): CreateCategoryRequest {
  return {
    name: values.name.trim(),
    slug: values.slug.trim(),
    ...(values.description ? { description: values.description.trim() } : {}),
    ...(values.parentId ? { parentId: values.parentId } : {}),
  }
}

export function toUpdateCategory(values: CategoryFormValues): UpdateCategoryRequest {
  return {
    description: values.description.trim(),
    name: values.name.trim(),
    parentId: values.parentId || null,
    slug: values.slug.trim(),
    sortOrder: values.sortOrder,
  }
}

export function slugifyCategory(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 160)
    .replace(/-+$/u, '')
}
