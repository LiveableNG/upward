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
    setProcessing(true)

    try {
      if (isEnabled) {
        await PushNotificationService.unregisterDevice()
        setIsEnabled(false)
        success('Push notifications disabled')
      } else {
        const status = await PushNotificationService.getPermissionStatus()
        
        if (status === 'denied') {
          error('Notification permission was denied. Please enable it in system settings.')
          return
        }

        const granted = await PushNotificationService.requestPermission()
        if (granted) {
          await PushNotificationService.registerDevice()
          setIsEnabled(true)
          success('Push notifications enabled')
        } else {
          error('Permission not granted')
        }
      }
    } catch (err: any) {
      error(err.message || 'Failed to update notification settings')
    } finally {
      setProcessing(false)
    }
  }

  if (loading || !isAvailable) return null

  return (
    <div className="settings-item" onClick={handleToggle}>
      <div className="settings-item__left">
        <div className="settings-item__icon-wrap">
          <Bell size={18} color="var(--clay)" />
        </div>
        <div>
          <span className="settings-item__title">Push Notifications</span>
          <p className="settings-item__sub">Stay updated with payment alerts</p>
        </div>
      </div>
      <div className={`switch ${isEnabled ? 'is-active' : ''} ${processing ? 'is-loading' : ''}`}>
        <div className="switch__handle">
          {processing && <Loader2 size={12} className="animate-spin" />}
        </div>
      </div>

      <style jsx>{`
        .switch {
          width: 44px;
          height: 24px;
          background: var(--surface2);
          border-radius: 12px;
          padding: 2px;
          transition: all 0.3s;
          cursor: pointer;
          border: 1px solid var(--border);
        }
        .switch.is-active {
          background: var(--clay);
          border-color: var(--clay);
        }
        .switch__handle {
          width: 18px;
          height: 18px;
          background: white;
          border-radius: 50%;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--clay);
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .switch.is-active .switch__handle {
          transform: translateX(20px);
        }
        .switch.is-loading {
          opacity: 0.7;
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
