'use client'

import React from 'react'
import { X, Sparkles, Clock, Target, Megaphone, Info } from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

const ICON_MAP: Record<string, React.ReactNode> = {
  sparkles: <Sparkles size={14} color="var(--clay)" />,
  clock: <Clock size={14} color="var(--clay)" />,
  target: <Target size={14} color="var(--clay)" />,
  megaphone: <Megaphone size={14} color="var(--clay)" />,
  info: <Info size={14} color="var(--clay)" />,
}

export function AnnouncementBanner() {
  const queryClient = useQueryClient()
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
  })

  const dismissMutation = useMutation({
    mutationFn: api.updateAnnouncementState,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const announcement = data?.activeAnnouncement

  if (!announcement || announcement.state.seenBanner) {
    return null
  }

  const handleDismiss = () => {
    dismissMutation.mutate({
      announcementId: announcement.id,
      seenBanner: true,
    })
  }

  return (
    <div className="dashboard__announcement-row">
      <div
        className="dashboard__announcement-content"
        style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        {ICON_MAP[announcement.iconType] || <Info size={14} color="var(--clay)" />}
        <p style={{ margin: 0 }}>{announcement.title}</p>
      </div>
      <button className="dashboard__announcement-close" onClick={handleDismiss}>
        <X size={14} />
      </button>
    </div>
  )
}
