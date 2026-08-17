import type { components } from '@blog/api-types'
import { z } from 'zod'

export type CreateArticleRequest = components['schemas']['CreateAdminArticleDto']

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

const optionalUuid = z
  .string()
  .trim()
  .refine((value) => !value || uuidPattern.test(value), '请输入有效的 UUID')

export const articleFormSchema = z
  .object({
    allowComment: z.boolean(),
    canonicalUrl: z
      .string()
      .trim()
      .max(2048, '规范链接不能超过 2048 个字符')
      .refine((value) => !value || isHttpUrl(value), '请输入以 http:// 或 https:// 开头的链接'),
    categoryId: optionalUuid,
    content: z.string().trim().min(1, '请输入文章正文'),
    coverId: optionalUuid,
    isFeatured: z.boolean(),
    isPinned: z.boolean(),
    password: z.string().max(128, '访问密码不能超过 128 个字符'),
    seoDescription: z.string().trim().max(500, 'SEO 描述不能超过 500 个字符'),
    seoTitle: z.string().trim().max(240, 'SEO 标题不能超过 240 个字符'),
    slug: z
      .string()
      .trim()
      .min(1, '请输入文章别名')
      .max(240, '文章别名不能超过 240 个字符')
      .regex(slugPattern, '只能使用小写字母、数字和连字符，且不能以连字符开头或结尾'),
    summary: z.string().trim().max(5000, '摘要不能超过 5000 个字符'),
    tagIds: z.array(z.string().regex(uuidPattern, '标签 ID 无效')).max(50, '标签最多选择 50 个'),
    title: z.string().trim().min(1, '请输入文章标题').max(240, '标题不能超过 240 个字符'),
    visibility: z.enum(['PUBLIC', 'PRIVATE', 'PASSWORD']),
  })
  .superRefine((values, context) => {
    if (values.visibility === 'PASSWORD' && values.password.length < 8) {
      context.addIssue({
        code: 'custom',
        message: '密码可见文章需要至少 8 位访问密码',
        path: ['password'],
      })
    }
  })

export type ArticleFormValues = z.infer<typeof articleFormSchema>

export const articleFormDefaults: ArticleFormValues = {
  allowComment: true,
  canonicalUrl: '',
  categoryId: '',
  content: '',
  coverId: '',
  isFeatured: false,
  isPinned: false,
  password: '',
  seoDescription: '',
  seoTitle: '',
  slug: '',
  summary: '',
  tagIds: [],
  title: '',
  visibility: 'PUBLIC',
}

export function toCreateArticleRequest(values: ArticleFormValues): CreateArticleRequest {
  const tagIds = [...new Set(values.tagIds)]

  return {
    allowComment: values.allowComment,
    content: values.content.trim(),
    isFeatured: values.isFeatured,
    isPinned: values.isPinned,
    slug: values.slug.trim(),
    title: values.title.trim(),
    visibility: values.visibility,
    ...(values.canonicalUrl ? { canonicalUrl: values.canonicalUrl } : {}),
    ...(values.categoryId ? { categoryId: values.categoryId } : {}),
    ...(values.coverId ? { coverId: values.coverId } : {}),
    ...(values.password && values.visibility === 'PASSWORD' ? { password: values.password } : {}),
    ...(values.seoDescription ? { seoDescription: values.seoDescription } : {}),
    ...(values.seoTitle ? { seoTitle: values.seoTitle } : {}),
    ...(values.summary ? { summary: values.summary } : {}),
    ...(tagIds.length ? { tagIds } : {}),
  }
}

export function slugifyTitle(value: string): string {
  return value
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 240)
    .replace(/-+$/u, '')
}

function isHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol)
  } catch {
    return false
  }
}
