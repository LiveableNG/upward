'use client'

import React, { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { RentReminderBanner } from './RentReminderBanner'
import { RentReminderPopup } from './RentReminderPopup'

export interface RentReminderAlert {
  propertyUuid: string
  daysLeft: number
  urgency: 'notice' | 'warning' | 'critical' | 'overdue'
  address: string
}

/**
 * RentReminderManager (Stateful backend-driven version)
 * 
 * Instead of calculating logic on the client, this component listens to the 
 * "activeAnnouncement" from the backend. If the announcement has 'isTransactional: true',
 * it renders the high-urgency rent UI. This handles cross-device "seen" states.
 */
export function RentReminderManager() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showPopup, setShowPopup] = useState(false)

  // 1. Fetch notifications & reminders
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api.getNotifications(),
    refetchInterval: 60000, 
  })

  // 2. Mutation to mark notification as read (Real ID)
  const markReadMutation = useMutation({
    mutationFn: (id: number) => api.markNotificationRead(String(id)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })

  const reminder = data?.activeRentReminder
  const isRentAlert = !!reminder
  
  // For the popup, we'll show it once per session if there's an active reminder
  useEffect(() => {
    if (!isLoading && isRentAlert) {
      const sessionKey = `popup_seen_${reminder.id}`
      if (!sessionStorage.getItem(sessionKey)) {
        setShowPopup(true)
        sessionStorage.setItem(sessionKey, 'true')
      }
    }
  }, [isLoading, isRentAlert, reminder?.id])

  const handleClosePopup = () => {
    setShowPopup(false)
  }

  const handleDismissBanner = () => {
    if (reminder) {
      markReadMutation.mutate(reminder.id)
    }
  }

  const handlePayNow = () => {
    if (reminder?.url) {
      router.push(reminder.url)
      markReadMutation.mutate(reminder.id)
      setShowPopup(false)
    }
  }

  if (isLoading || !isRentAlert) return null

  const alert: RentReminderAlert = {
    propertyUuid: reminder.propertyUuid,
    daysLeft: reminder.daysLeft,
    urgency: reminder.urgencyLevel,
    address: reminder.message.split(' rent for ')[1]?.split(' is ')[0] || 'your property'
  }

  return (
    <>
      <div className="rent-reminder-banner-wrap">
        <RentReminderBanner
          alert={alert}
          onDismiss={handleDismissBanner}
          onPayNow={handlePayNow}
        />
      </div>

      {showPopup && (
        <RentReminderPopup
          alert={alert}
          onClose={handleClosePopup}
          onPayNow={handlePayNow}
        />
      )}
    </>
  )
}
