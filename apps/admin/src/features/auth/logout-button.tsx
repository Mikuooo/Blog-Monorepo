'use client'

import { Button } from '@blog/ui/components/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'

import { Icon } from '@/components/icons'

import { logout } from './auth-api'
import { authKeys } from './auth-query'

export function LogoutButton({ className }: { className?: string }) {
  const queryClient = useQueryClient()
  const router = useRouter()
  const logoutMutation = useMutation({
    mutationFn: logout,
    onSuccess: async () => {
      await queryClient.cancelQueries({ queryKey: authKeys.all })
      queryClient.setQueryData(authKeys.currentUser(), null)
      router.replace('/login')
      router.refresh()
    },
  })
  const label = logoutMutation.isError ? '退出失败，点击重试' : '退出登录'

  return (
    <Button
      aria-label={label}
      className={className}
      disabled={logoutMutation.isPending}
      onClick={() => logoutMutation.mutate()}
      size="icon"
      title={label}
      variant="ghost"
    >
      <Icon className="size-4" name="log-out" />
    </Button>
  )
}
