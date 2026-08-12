import { describe, expect, it } from 'vitest'

import { SystemService } from './system.service.js'

describe('SystemService', () => {
  it('reports the API process as alive', () => {
    expect(new SystemService().getHealth()).toEqual({ service: 'api', status: 'ok' })
  })
})
