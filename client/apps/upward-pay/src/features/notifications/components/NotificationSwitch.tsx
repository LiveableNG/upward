'use client'

import React, { useEffect, useState } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { PushNotificationService } from '../services/pushNotificationService'
import { useToast } from '@/components/common/Toast'

export function NotificationSwitch() {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const { success, error } = useToast()

  useEffect(() => {
    async function checkStatus() {
      const available = await PushNotificationService.isAvailable()
      setIsAvailable(available)
      if (available) {
        const status = await PushNotificationService.getPermissionStatus()
        setIsEnabled(status === 'granted')
      }
      setLoading(false)
    }
    checkStatus()
  }, [])

  const handleToggle = async () => {
    if (processing) return

    try {
      if (isEnabled) {
        setProcessing(true)
        await PushNotificationService.unregisterDevice()
        setIsEnabled(false)
        success('Push notifications disabled')
      } else {
        const status = await PushNotificationService.getPermissionStatus()

        if (status === 'denied') {
          error('Notification permission is denied. Please enable it in your phone settings.')
          return
        }

        setProcessing(true)
        const granted = await PushNotificationService.requestPermission()
        if (granted) {
          await PushNotificationService.registerDevice()
          setIsEnabled(true)
          success('Push notifications enabled')
        } else {
          setIsEnabled(false)
          error('Permission not granted')
        }
      }
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Failed to update notification settings')
    } finally {
      setProcessing(false)
    }
  }

  if (loading || !isAvailable) return null

  return (
    <button type="button" className="settings-page__row" onClick={handleToggle}>
      <span className="settings-page__row-left">
        <span className="settings-page__row-icon">
          <Bell size={18} />
        </span>
        <span className="settings-page__row-text">
          <span className="settings-page__row-title">Push notifications</span>
          <span className="settings-page__row-desc">Stay updated with payment alerts</span>
        </span>
      </span>
      <span
        className={`settings-page__switch ${isEnabled ? 'settings-page__switch--on' : ''} ${processing ? 'settings-page__switch--loading' : ''}`}
        aria-hidden
      >
        <span className="settings-page__switch-handle">
          {processing ? <Loader2 size={12} className="settings-page__switch-spin" /> : null}
        </span>
      </span>
    </button>
  )
}
