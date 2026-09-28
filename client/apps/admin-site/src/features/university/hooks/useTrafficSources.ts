import { useState, useCallback } from 'react'
import { apiService } from '../../../services/api.service'
import { showToast } from '@upward/client-core'
import type {
  TrafficSourceRecord,
  TrafficStats,
  TrafficVisitRecord,
  CreateSourceFormData,
} from '../types'
import { copyTrackingLink } from '../utils'

export const useTrafficSources = (token: string) => {
  const [trafficSources, setTrafficSources] = useState<TrafficSourceRecord[]>([])
  const [trafficStats, setTrafficStats] = useState<TrafficStats | null>(null)
  const [loadingTraffic, setLoadingTraffic] = useState(true)
  const [loadingTrafficStats, setLoadingTrafficStats] = useState(true)
  const [trafficPage, setTrafficPage] = useState(1)
  const [trafficTotalPages, setTrafficTotalPages] = useState(1)
  const [trafficSearch, setTrafficSearch] = useState('')
  const [trafficChannelFilter, setTrafficChannelFilter] = useState('ALL')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isVisitsModalOpen, setIsVisitsModalOpen] = useState(false)
  const [selectedSourceForVisits, setSelectedSourceForVisits] = useState<TrafficSourceRecord | null>(null)
  const [visitsList, setVisitsList] = useState<TrafficVisitRecord[]>([])
  const [loadingVisits, setLoadingVisits] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [creatingSource, setCreatingSource] = useState(false)

  const fetchTrafficStats = useCallback(async () => {
    setLoadingTrafficStats(true)
    try {
      const response = await apiService.get('/admin/university/traffic/stats', token)
      if (response && response.data) {
        setTrafficStats(response.data)
      }
    } catch (error) {
      console.error('Failed to fetch traffic stats:', error)
    } finally {
      setLoadingTrafficStats(false)
    }
  }, [token])

  const fetchTrafficSources = useCallback(
    async (pageNum = trafficPage, channel = trafficChannelFilter, search = trafficSearch) => {
      setLoadingTraffic(true)
      try {
        let url = `/admin/university/traffic/sources?page=${pageNum}&limit=50`
        if (channel !== 'ALL') url += `&channel=${channel}`
        if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`

        const response = await apiService.get(url, token)
        if (response && response.data) {
          setTrafficSources(response.data)
          setTrafficTotalPages(response.meta?.totalPages || 1)
        }
      } catch (error) {
        console.error('Failed to fetch traffic sources:', error)
        showToast('Failed to load traffic sources', true)
      } finally {
        setLoadingTraffic(false)
      }
    },
    [token, trafficPage, trafficChannelFilter, trafficSearch]
  )

  const fetchVisitsForSource = useCallback(
    async (source: TrafficSourceRecord) => {
      setSelectedSourceForVisits(source)
      setIsVisitsModalOpen(true)
      setLoadingVisits(true)
      try {
        const response = await apiService.get(
          `/admin/university/traffic/sources/${source.id}/visits?limit=50`,
          token
        )
        if (response && response.data) {
          setVisitsList(response.data)
        }
      } catch (error) {
        console.error('Failed to fetch source visits:', error)
        showToast('Failed to load recent visits', true)
      } finally {
        setLoadingVisits(false)
      }
    },
    [token]
  )

  const handleCreateSource = useCallback(
    async (formData: CreateSourceFormData): Promise<boolean> => {
      setCreatingSource(true)
      try {
        const response = await apiService.post(
          '/admin/university/traffic/sources',
          {
            name: formData.name.trim(),
            identifier: formData.identifier.trim().toLowerCase(),
            channel: formData.channel,
            targetUrl: formData.targetUrl.trim() || '/university',
            description: formData.description.trim() || undefined,
          },
          token
        )

        if (response && response.success) {
          showToast('Tracking source created successfully!')
          setIsCreateModalOpen(false)
          fetchTrafficSources(1)
          fetchTrafficStats()
          return true
        } else {
          showToast(response?.message || 'Failed to create tracking source', true)
          return false
        }
      } catch (error: any) {
        console.error('Failed to create tracking source:', error)
        showToast(error?.response?.data?.message || error?.message || 'Failed to create source', true)
        return false
      } finally {
        setCreatingSource(false)
      }
    },
    [token, fetchTrafficSources, fetchTrafficStats]
  )

  const handleToggleSourceActive = useCallback(
    async (source: TrafficSourceRecord) => {
      try {
        const response = await apiService.patch(
          `/admin/university/traffic/sources/${source.id}`,
          { isActive: !source.isActive },
          token
        )
        if (response && response.success) {
          showToast(`Tracking link ${!source.isActive ? 'activated' : 'paused'}`)
          fetchTrafficSources(trafficPage)
        }
      } catch (error) {
        console.error('Failed to update source status:', error)
        showToast('Failed to update status', true)
      }
    },
    [token, trafficPage, fetchTrafficSources]
  )

  const handleCopyLink = useCallback((identifier: string, targetUrl = '/academy') => {
    copyTrackingLink(identifier, targetUrl, () => {
      setCopiedId(identifier)
      setTimeout(() => setCopiedId(null), 2500)
    })
  }, [])

  return {
    trafficSources,
    setTrafficSources,
    trafficStats,
    loadingTraffic,
    loadingTrafficStats,
    trafficPage,
    setTrafficPage,
    trafficTotalPages,
    trafficSearch,
    setTrafficSearch,
    trafficChannelFilter,
    setTrafficChannelFilter,
    isCreateModalOpen,
    setIsCreateModalOpen,
    isVisitsModalOpen,
    setIsVisitsModalOpen,
    selectedSourceForVisits,
    setSelectedSourceForVisits,
    visitsList,
    loadingVisits,
    copiedId,
    creatingSource,
    fetchTrafficStats,
    fetchTrafficSources,
    fetchVisitsForSource,
    handleCreateSource,
    handleToggleSourceActive,
    handleCopyLink,
  }
}
