export type AccessControlErrorCode =
  | 'LAST_SUPER_ADMIN'
  | 'PERMISSION_NOT_FOUND'
  | 'ROLE_CODE_EXISTS'
  | 'ROLE_HAS_USERS'
  | 'ROLE_NOT_FOUND'
  | 'ROLE_SYSTEM_DELETE_FORBIDDEN'
  | 'ROLE_SYSTEM_PERMISSIONS_FORBIDDEN'
  | 'USER_NOT_FOUND'
  | 'USER_SELF_DISABLE'

export class AccessControlError extends Error {
  constructor(readonly code: AccessControlErrorCode) {
    super(code)
    this.name = 'AccessControlError'
  }
}
