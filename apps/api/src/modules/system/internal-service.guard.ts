import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'

import {
  INTERNAL_WORKLOAD_SCOPE,
  InternalWorkloadIdentityVerifier,
} from './internal-workload-identity.js'

type RequestHeaders = {
  headers: {
    authorization?: string | string[]
  }
}

@Injectable()
export class InternalServiceGuard implements CanActivate {
  constructor(
    @Inject(InternalWorkloadIdentityVerifier)
    private readonly identityVerifier: InternalWorkloadIdentityVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestHeaders>()
    const authorization = request.headers.authorization
    const value = Array.isArray(authorization) ? authorization[0] : authorization
    const token = value?.startsWith('Bearer ') ? value.slice('Bearer '.length) : undefined

    if (!token) throw new UnauthorizedException('Invalid internal workload identity')
    const identity = await this.identityVerifier.verify(token)
    if (!identity.scopes.has(INTERNAL_WORKLOAD_SCOPE)) throw new ForbiddenException('Missing scope')
    return true
  }
}
