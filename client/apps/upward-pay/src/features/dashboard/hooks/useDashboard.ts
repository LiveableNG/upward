'use client'

import { useState, useEffect, useCallback } from 'react'
import { getDashboardData } from '../services/dashboardService'
import { type DashboardData } from '../types'

interface UseDashboardReturn {
  data: DashboardData | null
  loading: boolean
  error: string
  reload: () => void
}

export function useDashboard(): UseDashboardReturn {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await getDashboardData()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return { data, loading, error, reload: load }
}
