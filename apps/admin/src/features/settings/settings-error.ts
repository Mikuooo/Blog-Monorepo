import { SettingsApiError } from './settings-api'

export function settingsErrorMessage(error: unknown, action: 'load' | 'update'): string {
  if (!(error instanceof SettingsApiError)) return '系统设置请求失败，请稍后重试。'
  if (error.status === 401) return '登录状态已失效，请重新登录。'
  if (error.status === 403)
    return action === 'load' ? '当前账号没有查看权限。' : '当前账号没有修改权限。'
  if (error.status === 400) return '设置内容校验失败，请检查输入后重试。'
  if (error.status >= 500) return '后台 API 暂不可用，请确认 API 服务已启动，稍后重试。'
  if (error.code === 'NETWORK_ERROR') return '无法连接后台 API，请确认服务已启动。'
  return action === 'load' ? '系统设置加载失败，请稍后重试。' : '系统设置保存失败，请稍后重试。'
}
