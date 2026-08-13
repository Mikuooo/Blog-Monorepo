import { signWorkloadToken } from '@blog/shared/workload-token'

export type WorkloadTokenConfiguration = {
  audience: string
  issuer: string
  secret: string
  subject: string
}

export function createWorkloadTokenProvider(configuration: WorkloadTokenConfiguration) {
  return async (): Promise<string> =>
    signWorkloadToken(
      {
        aud: configuration.audience,
        iss: configuration.issuer,
        scope: 'article.publish-scheduled',
        sub: configuration.subject,
      },
      configuration.secret,
    )
}
