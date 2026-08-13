import { Injectable, UnauthorizedException } from '@nestjs/common'

import { verifyWorkloadToken } from '@blog/shared/workload-token'

import { requiredEnvironment } from '../../environment.js'

export const INTERNAL_WORKLOAD_SCOPE = 'article.publish-scheduled'

export type InternalWorkloadIdentity = {
  scopes: ReadonlySet<string>
  subject: string
}

@Injectable()
export class InternalWorkloadIdentityVerifier {
  async verify(token: string): Promise<InternalWorkloadIdentity> {
    const secret = requiredEnvironment('INTERNAL_WORKLOAD_SECRET')
    if (Buffer.byteLength(secret) < 32) {
      throw new Error('INTERNAL_WORKLOAD_SECRET must contain at least 32 bytes')
    }

    try {
      const payload = verifyWorkloadToken(
        token,
        {
          aud: requiredEnvironment('INTERNAL_WORKLOAD_AUDIENCE'),
          iss: requiredEnvironment('INTERNAL_WORKLOAD_ISSUER'),
          sub: requiredEnvironment('INTERNAL_WORKLOAD_SUBJECT'),
        },
        secret,
      )
      return { scopes: new Set(payload.scope.split(' ').filter(Boolean)), subject: payload.sub }
    } catch {
      throw new UnauthorizedException('Invalid internal workload identity')
    }
  }
}
