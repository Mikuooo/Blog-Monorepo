import { UnrecoverableError } from 'bullmq'

export type HeartbeatJobV1 = {
  requestedAt: string
  version: 1
}

export function validateHeartbeatJob(payload: HeartbeatJobV1): void {
  if (payload.version !== 1 || Number.isNaN(Date.parse(payload.requestedAt))) {
    throw new UnrecoverableError('Unsupported or invalid heartbeat job payload')
  }
}
