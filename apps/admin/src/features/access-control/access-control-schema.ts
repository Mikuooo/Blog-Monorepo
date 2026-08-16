import { z } from 'zod'

import type { AdminRole, CreateRoleRequest, UpdateRoleRequest } from './access-control-api'

const roleCodePattern = /^[A-Z][A-Z0-9_]*$/u

export const roleFormSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, '请输入角色代码')
    .max(80, '角色代码不能超过 80 个字符')
    .regex(roleCodePattern, '角色代码只能使用大写字母、数字和下划线'),
  description: z.string().trim().max(500, '描述不能超过 500 个字符'),
  name: z.string().trim().min(1, '请输入角色名称').max(120, '名称不能超过 120 个字符'),
  permissionIds: z.array(z.string().uuid()).max(200),
})

export type RoleFormValues = z.infer<typeof roleFormSchema>

export function roleDefaults(role?: AdminRole): RoleFormValues {
  return {
    code: role?.code ?? '',
    description: role?.description ?? '',
    name: role?.name ?? '',
    permissionIds: role?.permissions.map(({ id }) => id) ?? [],
  }
}

export function toCreateRole(values: RoleFormValues): CreateRoleRequest {
  return {
    code: values.code.trim(),
    name: values.name.trim(),
    permissionIds: values.permissionIds,
    ...(values.description ? { description: values.description.trim() } : {}),
  }
}

export function toUpdateRole(values: RoleFormValues, isSystem: boolean): UpdateRoleRequest {
  return {
    description: values.description.trim(),
    name: values.name.trim(),
    ...(isSystem ? {} : { permissionIds: values.permissionIds }),
  }
}
