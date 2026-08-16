import { describe, expect, it } from 'vitest'

import { roleDefaults, roleFormSchema, toCreateRole, toUpdateRole } from './access-control-schema'

describe('access control form schemas', () => {
  it('normalizes role creation', () => {
    const values = roleFormSchema.parse({
      code: ' CONTENT_EDITOR ',
      description: '  编辑内容  ',
      name: '  内容编辑  ',
      permissionIds: ['123e4567-e89b-42d3-a456-426614174000'],
    })
    expect(toCreateRole(values)).toEqual({
      code: 'CONTENT_EDITOR',
      description: '编辑内容',
      name: '内容编辑',
      permissionIds: ['123e4567-e89b-42d3-a456-426614174000'],
    })
  })

  it('rejects invalid role codes', () => {
    expect(roleFormSchema.safeParse({ ...roleDefaults(), code: 'content editor' }).success).toBe(
      false,
    )
  })

  it('does not send permission changes for system roles', () => {
    const values = roleFormSchema.parse({
      code: 'SUPER_ADMIN',
      description: '',
      name: 'Super administrator',
      permissionIds: ['123e4567-e89b-42d3-a456-426614174000'],
    })
    expect(toUpdateRole(values, true)).not.toHaveProperty('permissionIds')
  })
})
