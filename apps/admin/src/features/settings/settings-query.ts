'use client'

import { useQuery } from '@tanstack/react-query'

import { getSettings } from './settings-api'
import type { SettingsApiError, SystemSettings } from './settings-api'

export const settingsKeys = {
  all: ['settings'] as const,
  detail: () => [...settingsKeys.all, 'system'] as const,
}

export function useSystemSettings(enabled: boolean) {
  return useQuery<SystemSettings, SettingsApiError>({
    enabled,
    queryFn: ({ signal }) => getSettings(signal),
    queryKey: settingsKeys.detail(),
  })
}
