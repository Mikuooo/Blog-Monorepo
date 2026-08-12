import { describe, expect, it } from 'vitest'

import { getRequiredEnvironmentVariable, MissingEnvironmentVariableError } from './index.js'

describe('getRequiredEnvironmentVariable', () => {
  it('returns a trimmed configured value', () => {
    expect(getRequiredEnvironmentVariable('TOKEN', { TOKEN: ' value ' })).toBe('value')
  })

  it('rejects a missing value', () => {
    expect(() => getRequiredEnvironmentVariable('TOKEN', {})).toThrow(
      MissingEnvironmentVariableError,
    )
  })
})
