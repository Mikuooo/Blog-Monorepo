import { z } from 'zod'

export const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(3, '请输入邮箱地址或用户名')
    .max(320, '账号长度不能超过 320 个字符'),
  password: z.string().min(1, '请输入密码').max(128, '密码长度不能超过 128 个字符'),
})

export type LoginValues = z.infer<typeof loginSchema>

export function resolvePostLoginPath(value: string | null | undefined): string {
  if (!value) return '/dashboard'

  try {
    const baseUrl = new URL('http://admin.local')
    const destination = new URL(value, baseUrl)
    if (destination.origin !== baseUrl.origin || !destination.pathname.startsWith('/')) {
      return '/dashboard'
    }
    return `${destination.pathname}${destination.search}${destination.hash}`
  } catch {
    return '/dashboard'
  }
}
