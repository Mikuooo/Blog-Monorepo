import { describe, expect, it } from 'vitest'

import { SettingsApiError } from './settings-api'
import { settingsErrorMessage } from './settings-error'

describe('settings error message', () => {
  it('explains that a server-side gateway failure usually means the API is unavailable', () => {
    expect(
      settingsErrorMessage(new SettingsApiError('SETTINGS_REQUEST_FAILED', 500), 'update'),
    ).toBe('后台 API 暂不可用，请确认 API 服务已启动，稍后重试。')
    expect(settingsErrorMessage(new SettingsApiError('BAD_GATEWAY', 502), 'load')).toBe(
      '后台 API 暂不可用，请确认 API 服务已启动，稍后重试。',
    )
  })

  it('keeps permission and network failures actionable', () => {
    expect(settingsErrorMessage(new SettingsApiError('PERMISSION_DENIED', 403), 'update')).toBe(
      '当前账号没有修改权限。',
    )
    expect(settingsErrorMessage(new SettingsApiError('NETWORK_ERROR', 0), 'load')).toBe(
      '无法连接后台 API，请确认服务已启动。',
    )
  })
})
