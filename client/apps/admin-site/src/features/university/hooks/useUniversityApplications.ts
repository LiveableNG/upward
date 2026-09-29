import { useState, useCallback } from 'react'
import { apiService } from '../../../services/api.service'
import { showToast } from '@upward/client-core'
import type { UniversityApplicationRecord, ApplicationStats } from '../types'

export const useUniversityApplications = (token: string) => {
  const [applications, setApplications] = useState<UniversityApplicationRecord[]>([])
  const [appStats, setAppStats] = useState<ApplicationStats | null>(null)
  const [loadingApps, setLoadingApps] = useState(true)
  const [appPage, setAppPage] = useState(1)
  const [appTotalPages, setAppTotalPages] = useState(1)
  const [appSearch, setAppSearch] = useState('')
  const [selectedApp, setSelectedApp] = useState<UniversityApplicationRecord | null>(null)

  const fetchAppStats = useCallback(async () => {
    try {
      const response = await apiService.get('/admin/university/applications/stats', token)
      if (response && response.data) {
        setAppStats(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch university application stats:', error)
    }
  }, [token])

  const fetchApplications = useCallback(
    async (pageNum = appPage, searchQuery = appSearch) => {
      setLoadingApps(true)
      try {
        let url = `/admin/university/applications?page=${pageNum}&limit=50`
        if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`

        const response = await apiService.get(url, token)
        if (response && response.data) {
          setApplications(response.data)
          setAppTotalPages(response.meta?.totalPages || 1)
        }
      } catch (error) {
        console.error('Failed to fetch university applications:', error)
        showToast('Failed to load full applications', true)
      } finally {
        setLoadingApps(false)
      }
    },
    [token, appPage, appSearch]
  )

  const handleUpdateAppStatus = useCallback(
    async (id: string, updates: { status?: string; feeStatus?: string; notes?: string }) => {
      try {
        const res = await apiService.patch(`/admin/university/applications/${id}`, updates, token)
        if (res && res.success) {
          showToast('Application updated successfully')
          if (selectedApp && selectedApp.id === id) {
            setSelectedApp(res.data)
          }
          fetchApplications(appPage)
          fetchAppStats()
        }
      } catch (err) {
        console.error('Failed to update application status:', err)
        showToast('Failed to update application status', true)
      }
    },
    [token, selectedApp, appPage, fetchApplications, fetchAppStats]
  )

  return {
    applications,
    setApplications,
    appStats,
    loadingApps,
    appPage,
    setAppPage,
    appTotalPages,
    appSearch,
    setAppSearch,
    selectedApp,
    setSelectedApp,
    fetchAppStats,
    fetchApplications,
    handleUpdateAppStatus,
  }
}
