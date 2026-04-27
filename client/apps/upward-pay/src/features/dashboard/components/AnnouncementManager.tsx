'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { AnnouncementPopup } from './AnnouncementPopup'

export function AnnouncementManager() {
  const queryClient = useQueryClient()
  const [showPopup, setShowPopup] = useState(false)

  const { data, isLoading, isFetching } = useQuery({
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
  const activeRentReminder = data?.activeRentReminder // Priority check
  const announcementId = activeAnnouncement?.id
  const hasSeenPopup = activeAnnouncement?.state?.seenPopup
  const triggeredIdRef = React.useRef<number | null>(null)

  useEffect(() => {
    const isFromPush = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('from_push') === 'true'
    
    if (
      !isLoading && 
      !isFetching && 
      activeAnnouncement && 
      !hasSeenPopup && 
      !activeRentReminder && 
      !updateStateMutation.isPending && 
      !isFromPush &&
      triggeredIdRef.current !== activeAnnouncement.id
    ) {
      triggeredIdRef.current = activeAnnouncement.id
      setShowPopup(true)
      // Automatically mark as seen in backend
      updateStateMutation.mutate({
        announcementId: activeAnnouncement.id,
        seenPopup: true,
      })
    }
  }, [
    isLoading,
    isFetching,
    announcementId,
    hasSeenPopup,
    activeRentReminder,
    updateStateMutation.mutate,
    updateStateMutation.isPending,
  ])

  const handleClosePopup = () => {
    setShowPopup(false)
    if (activeAnnouncement) {
      updateStateMutation.mutate({
        announcementId: activeAnnouncement.id as number,
        interactedPopup: true,
        interactedBanner: true, // Also clear the red dot on the notifications tab
      })
    }
  }

  if (!showPopup || !activeAnnouncement) return null

  return (
    <AnnouncementPopup
      title={activeAnnouncement.title}
      message={activeAnnouncement.message}
      iconType={activeAnnouncement.iconType}
      url={activeAnnouncement.url}
      onClose={handleClosePopup}
    />
  )
}
