import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'

export const usePmNotifications = () => {
  return useQuery({
    queryKey: ['pm-notifications'],
    queryFn: async () => {
      const res = await api.get('/pm/notifications')
      return res || { notifications: [], unreadCount: 0 }
    },
    refetchInterval: 10000, // Poll every 10 seconds for real-time alerts
    staleTime: 5000,
  })
}

export const usePmPopups = () => {
  return useQuery({
    queryKey: ['pm-popups'],
    queryFn: async () => {
      const res = await api.get('/pm/notifications/popups')
      return res || []
    },
    refetchInterval: 10000, // Poll every 10 seconds for real-time pop-up alerts
    staleTime: 5000,
  })
}

export const usePmNotificationActions = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  const markRead = useMutation({
    mutationFn: async (uuid: string) => {
      return api.patch(`/pm/notifications/${uuid}/read`, {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['pm-popups'] })
    },
    onError: () => {
      toast.error('Failed to mark notification as read')
    }
  })

  const markAllRead = useMutation({
    mutationFn: async () => {
      return api.post('/pm/notifications/read-all', {})
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-notifications'] })
      queryClient.invalidateQueries({ queryKey: ['pm-popups'] })
      toast.success('All notifications marked as read')
    },
    onError: () => {
      toast.error('Failed to mark all as read')
    }
  })

  return {
    markRead,
    markAllRead,
  }
}
