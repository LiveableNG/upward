'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { AnnouncementPopup } from './AnnouncementPopup'

export function AnnouncementManager() {
  const queryClient = useQueryClient()
  const [showPopup, setShowPopup] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
    refetchInterval: 60000, // Check every minute
  })

  const updateStateMutation = useMutation({
    mutationFn: api.updateAnnouncementState,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const activeAnnouncement = data?.activeAnnouncement

  useEffect(() => {
    if (!isLoading && activeAnnouncement && !activeAnnouncement.state.seenPopup) {
      setShowPopup(true)
      // Automatically mark as seen in backend
      updateStateMutation.mutate({
        announcementId: activeAnnouncement.id,
        seenPopup: true,
      })
    }
  }, [isLoading, activeAnnouncement, updateStateMutation])

  const handleClosePopup = () => {
    setShowPopup(false)
    if (activeAnnouncement) {
      updateStateMutation.mutate({
        announcementId: activeAnnouncement.id,
        interactedPopup: true,
      })
    }
  }

  if (!showPopup || !activeAnnouncement) return null

  return (
    <AnnouncementPopup
      title={activeAnnouncement.title}
      message={activeAnnouncement.message}
      iconType={activeAnnouncement.iconType}
      onClose={handleClosePopup}
    />
  )
}
