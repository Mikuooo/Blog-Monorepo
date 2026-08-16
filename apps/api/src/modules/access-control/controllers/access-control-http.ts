import { HttpException, ValidationPipe } from '@nestjs/common'

import type { AuthenticatedRequest } from '../../auth/auth-request.js'
import { AccessControlError } from '../application/access-control.errors.js'

export function validationPipe(expectedType: new () => object): ValidationPipe {
  return new ValidationPipe({
    expectedType,
    forbidNonWhitelisted: true,
    transform: true,
    whitelist: true,
  })
}

export async function handleAccessControl<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work()
  } catch (error) {
    if (!(error instanceof AccessControlError)) throw error
    const statusCode = error.code.endsWith('_NOT_FOUND') ? 404 : 409
    const messages: Record<AccessControlError['code'], string> = {
      LAST_SUPER_ADMIN: 'At least one active super administrator must remain.',
      PERMISSION_NOT_FOUND: 'One or more selected permissions were not found.',
      ROLE_CODE_EXISTS: 'The role code is already in use.',
      ROLE_HAS_USERS: 'Remove all users from the role before deleting it.',
      ROLE_NOT_FOUND: 'The requested role was not found.',
      ROLE_SYSTEM_DELETE_FORBIDDEN: 'System roles cannot be deleted.',
      ROLE_SYSTEM_PERMISSIONS_FORBIDDEN: 'System role permissions cannot be changed.',
      USER_NOT_FOUND: 'The requested user was not found.',
      USER_SELF_DISABLE: 'The current user cannot disable their own account.',
    }
    throw new HttpException(
      { code: error.code, message: messages[error.code], statusCode },
      statusCode,
    )
  }
}

export function authenticatedUserId(request: AuthenticatedRequest): string {
  if (!request.auth) {
    throw new HttpException(
      { code: 'AUTHENTICATION_REQUIRED', message: 'Authentication is required.', statusCode: 401 },
      401,
    )
  }
  return request.auth.user.id
}
