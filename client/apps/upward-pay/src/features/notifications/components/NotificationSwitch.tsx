'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Bell, Loader2 } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { PushNotificationService } from '../services/pushNotificationService'
import { OPEN_NOTIFICATION_PROMPT_EVENT } from './NotificationPromptModal'
import { useToast } from '@/components/common/Toast'

export function NotificationSwitch() {
  const [isAvailable, setIsAvailable] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [isSystemDenied, setIsSystemDenied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const { success, error } = useToast()

  const refreshStatus = useCallback(async () => {
    const available = await PushNotificationService.isAvailable()
    setIsAvailable(available)
    if (available) {
      const status = await PushNotificationService.getPermissionStatus()
      setIsEnabled(status === 'granted')
      setIsSystemDenied(status === 'denied')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    refreshStatus()

    if (Capacitor.isNativePlatform()) {
      const handleAppState = App.addListener('appStateChange', (state) => {
        if (state.isActive) {
          refreshStatus()
        }
      })
      return () => {
        handleAppState.then((h) => h.remove()).catch(() => {})
      }
    }
  }, [refreshStatus])

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
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(OPEN_NOTIFICATION_PROMPT_EVENT))
          }
          return
        }

        setProcessing(true)
        const granted = await PushNotificationService.requestPermission()
        if (granted) {
          await PushNotificationService.registerDevice()
          setIsEnabled(true)
          setIsSystemDenied(false)
          success('Push notifications enabled')
        } else {
          setIsEnabled(false)
          setIsSystemDenied(true)
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(OPEN_NOTIFICATION_PROMPT_EVENT))
          }
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
          <span className="settings-page__row-desc">
            {isSystemDenied ? 'Disabled in device settings — tap to enable' : 'Stay updated with payment alerts'}
          </span>
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
