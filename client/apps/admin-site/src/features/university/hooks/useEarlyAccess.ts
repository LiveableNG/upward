import { useState, useCallback } from 'react'
import { apiService } from '../../../services/api.service'
import { showToast } from '@upward/client-core'
import type { EarlyAccessRecord, EarlyAccessStats } from '../types'

export const useEarlyAccess = (token: string) => {
  const [records, setRecords] = useState<EarlyAccessRecord[]>([])
  const [stats, setStats] = useState<EarlyAccessStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'STUDENT' | 'LANDLORD'>('ALL')
  const [search, setSearch] = useState('')
  const [selectedRecord, setSelectedRecord] = useState<EarlyAccessRecord | null>(null)

  const fetchStats = useCallback(async () => {
    setLoadingStats(true)
    try {
      const response = await apiService.get('/admin/early-access/stats', token)
      if (response && response.data) {
        setStats(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch early access stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }, [token])

  const fetchRecords = useCallback(
    async (pageNum = page, currentFilter = typeFilter, currentSearch = search) => {
      setLoading(true)
      try {
        let url = `/admin/early-access?page=${pageNum}&limit=50`
        if (currentFilter !== 'ALL') url += `&type=${currentFilter}`
        if (currentSearch.trim()) url += `&search=${encodeURIComponent(currentSearch.trim())}`

        const response = await apiService.get(url, token)
        if (response && response.data) {
          setRecords(response.data)
          setTotalPages(response.meta?.totalPages || 1)
        }
      } catch (error) {
        console.error('Failed to fetch early access records:', error)
        showToast('Failed to load early access applications', true)
      } finally {
        setLoading(false)
      }
    },
    [token, page, typeFilter, search]
  )

  return {
    records,
    setRecords,
    stats,
    loading,
    loadingStats,
    page,
    setPage,
    totalPages,
    typeFilter,
    setTypeFilter,
    search,
    setSearch,
    selectedRecord,
    setSelectedRecord,
    fetchStats,
    fetchRecords,
  }
}
