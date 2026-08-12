import { timingSafeEqual } from 'node:crypto'

import { Injectable, UnauthorizedException } from '@nestjs/common'
import type { CanActivate, ExecutionContext } from '@nestjs/common'

import { requiredEnvironment } from '../../environment.js'

type RequestHeaders = {
  headers: {
    authorization?: string | string[]
  }
}

function matchesToken(provided: string, expected: string): boolean {
  const providedBytes = Buffer.from(provided)
  const expectedBytes = Buffer.from(expected)
  return (
    providedBytes.length === expectedBytes.length && timingSafeEqual(providedBytes, expectedBytes)
  )
}

@Injectable()
export class InternalServiceGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<RequestHeaders>()
    const authorization = request.headers.authorization
    const value = Array.isArray(authorization) ? authorization[0] : authorization
    const token = value?.startsWith('Bearer ') ? value.slice('Bearer '.length) : undefined

    if (!token || !matchesToken(token, requiredEnvironment('INTERNAL_API_TOKEN'))) {
      throw new UnauthorizedException('Invalid internal workload identity')
    }
    return true
  }
}
