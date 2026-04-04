'use client'

import { useState, useEffect, useCallback } from 'react'
import { getDashboardData } from '../services/dashboardService'
import { type DashboardData, type Notification } from '../types'

interface UseDashboardReturn {
  data: DashboardData | null
  loading: boolean
  error: string
  reload: () => void
  notifications: Notification[]
  setNotifications: React.Dispatch<React.SetStateAction<Notification[]>>
}

export function useDashboard(): UseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notifications, setNotifications] = useState<Notification[]>([])

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getDashboardData()
      setData(result)

      if (!result.tenant.hasCompletedOnboarding) {
        const notifs: Notification[] =
          result.pendingPayments.length > 0
            ? [
                {
                  id: 'notif-pending',
                  text: `You have a pending payment from ${result.pendingPayments[0].company_name}. Pay now to start building your score.`,
                  iconType: 'clock',
                },
              ]
            : [
                {
                  id: 'notif-1',
                  text: 'Welcome! Make your first rent payment to start building your Rent Credibility Score.',
                  iconType: 'sparkles',
                },
              ]
        setNotifications(notifs)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, reload: load, notifications, setNotifications }
}
