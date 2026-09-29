import { useState, useCallback } from 'react'
import { apiService } from '../../../services/api.service'
import { showToast } from '@upward/client-core'
import type {
  UniversityHireRequestRecord,
  UniversityHireRequestStats,
} from '../types'

export const useUniversityHireRequests = (token: string) => {
  const [hireRequests, setHireRequests] = useState<UniversityHireRequestRecord[]>([])
  const [hireStats, setHireStats] = useState<UniversityHireRequestStats | null>(null)
  const [loadingHireRequests, setLoadingHireRequests] = useState(true)
  const [loadingHireStats, setLoadingHireStats] = useState(true)
  const [hirePage, setHirePage] = useState(1)
  const [hireTotalPages, setHireTotalPages] = useState(1)
  const [hireSearch, setHireSearch] = useState('')
  const [hireStatusFilter, setHireStatusFilter] = useState('ALL')
  const [hireIndustryFilter, setHireIndustryFilter] = useState('ALL')
  const [hirePlacementFilter, setHirePlacementFilter] = useState('ALL')
  const [selectedHireRequest, setSelectedHireRequest] = useState<UniversityHireRequestRecord | null>(null)

  const fetchHireStats = useCallback(async () => {
    setLoadingHireStats(true)
    try {
      // The admin hire-requests endpoint returns stats alongside data
      const response = await apiService.get('/admin/university/hire-requests?limit=1', token)
      if (response && response.stats) {
        setHireStats(response.stats)
      }
    } catch (error) {
      console.error('Failed to fetch university hire request stats:', error)
    } finally {
      setLoadingHireStats(false)
    }
  }, [token])

  const fetchHireRequests = useCallback(
    async (
      pageNum = hirePage,
      status = hireStatusFilter,
      industry = hireIndustryFilter,
      placement = hirePlacementFilter,
      search = hireSearch
    ) => {
      setLoadingHireRequests(true)
      try {
        let url = `/admin/university/hire-requests?page=${pageNum}&limit=50`
        if (status !== 'ALL') url += `&status=${status}`
        if (industry !== 'ALL') url += `&industry=${encodeURIComponent(industry)}`
        if (placement !== 'ALL') url += `&placementType=${placement}`
        if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`

        const response = await apiService.get(url, token)
        if (response && response.data) {
          setHireRequests(response.data)
          if (response.stats) {
            setHireStats(response.stats)
          }
          const total = response.total || response.data.length || 0
          setHireTotalPages(Math.max(1, Math.ceil(total / 50)))
        }
      } catch (error) {
        console.error('Failed to fetch university hire requests:', error)
        showToast('Failed to load employer hire requests', true)
      } finally {
        setLoadingHireRequests(false)
      }
    },
    [token, hirePage, hireStatusFilter, hireIndustryFilter, hirePlacementFilter, hireSearch]
  )

  const handleUpdateHireStatus = useCallback(
    async (id: string, updates: { status?: string; notes?: string }) => {
      try {
        const response = await apiService.patch(`/admin/university/hire-requests/${id}`, updates, token)
        if (response && response.success) {
          showToast('Hiring request updated successfully!')
          if (selectedHireRequest && selectedHireRequest.id === id) {
            setSelectedHireRequest(response.data)
          }
          fetchHireRequests(hirePage)
          fetchHireStats()
        } else {
          showToast(response?.message || 'Failed to update hiring request', true)
        }
      } catch (error: any) {
        console.error('Failed to update hire request:', error)
        showToast(error?.message || 'Failed to update request', true)
      }
    },
    [token, selectedHireRequest, hirePage, fetchHireRequests, fetchHireStats]
  )

  return {
    hireRequests,
    setHireRequests,
    hireStats,
    loadingHireRequests,
    loadingHireStats,
    hirePage,
    setHirePage,
    hireTotalPages,
    hireSearch,
    setHireSearch,
    hireStatusFilter,
    setHireStatusFilter,
    hireIndustryFilter,
    setHireIndustryFilter,
    hirePlacementFilter,
    setHirePlacementFilter,
    selectedHireRequest,
    setSelectedHireRequest,
    fetchHireStats,
    fetchHireRequests,
    handleUpdateHireStatus,
  }
}
