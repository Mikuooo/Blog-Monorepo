import { Inject, Injectable } from '@nestjs/common'

import {
  ACCESS_CONTROL_REPOSITORY,
  type AccessControlListQuery,
  type AccessControlRepository,
  type AdminRoleListItem,
  type AdminUserListItem,
  type CreateRoleCommand,
  type DeleteRoleResult,
  type PageResult,
  type PermissionSummary,
  type UpdateRoleCommand,
  type UpdateUserRolesCommand,
  type UpdateUserStatusCommand,
  type UserListQuery,
} from './access-control.contract.js'

@Injectable()
export class AccessControlService {
  constructor(
    @Inject(ACCESS_CONTROL_REPOSITORY) private readonly repository: AccessControlRepository,
  ) {}

  createRole(command: CreateRoleCommand): Promise<AdminRoleListItem> {
    return this.repository.createRole(command)
  }

  deleteRole(roleId: string, actorId: string): Promise<DeleteRoleResult> {
    return this.repository.deleteRole(roleId, actorId)
  }

  listPermissions(): Promise<PermissionSummary[]> {
    return this.repository.listPermissions()
  }

  listRoles(query: AccessControlListQuery): Promise<PageResult<AdminRoleListItem>> {
    return this.repository.listRoles(query)
  }

  listUsers(query: UserListQuery): Promise<PageResult<AdminUserListItem>> {
    return this.repository.listUsers(query)
  }

  updateRole(command: UpdateRoleCommand): Promise<AdminRoleListItem> {
    return this.repository.updateRole(command)
  }

  updateUserRoles(command: UpdateUserRolesCommand): Promise<AdminUserListItem> {
    return this.repository.updateUserRoles(command)
  }

  updateUserStatus(command: UpdateUserStatusCommand): Promise<AdminUserListItem> {
    return this.repository.updateUserStatus(command)
  }
}
