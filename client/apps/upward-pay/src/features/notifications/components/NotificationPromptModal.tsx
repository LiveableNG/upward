'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { Bell, CheckCircle2, Clock, ShieldCheck, AlertCircle, ArrowUpRight, Loader2 } from 'lucide-react'
import { PushNotificationService } from '../services/pushNotificationService'
import { useAuth } from '@/features/auth/AuthContext'
import { useToast } from '@/components/common/Toast'
import '@/styles/notification-prompt.css'

export const OPEN_NOTIFICATION_PROMPT_EVENT = 'app:open-notification-prompt'
const DISMISSED_KEY = 'upward_push_prompt_dismissed_until'
const COOLDOWN_DAYS_MS = 3 * 24 * 60 * 60 * 1000

export function NotificationPromptModal() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const [isVisible, setIsVisible] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<string>('prompt')
  const [processing, setProcessing] = useState(false)

  const checkStatusAndEvaluate = useCallback(async (force = false) => {
    if (!Capacitor.isNativePlatform() || !user) return

    try {
      const status = await PushNotificationService.getPermissionStatus()
      setPermissionStatus(status)

      if (status === 'granted') {
        setIsVisible(false)
        return
      }

      if (!force) {
        const dismissedUntil = localStorage.getItem(DISMISSED_KEY)
        if (dismissedUntil && Number(dismissedUntil) > Date.now()) {
          return
        }
      }

      setIsVisible(true)
    } catch {
      // Ignore background check errors
    }
  }, [user])

  useEffect(() => {
    if (!Capacitor.isNativePlatform() || !user) return

    const timer = setTimeout(() => {
      checkStatusAndEvaluate(false)
    }, 1200)

    const handleForceOpen = () => {
      checkStatusAndEvaluate(true)
    }

    const handleAppState = App.addListener('appStateChange', (state) => {
      if (state.isActive) {
        PushNotificationService.getPermissionStatus().then((status) => {
          setPermissionStatus(status)
          if (status === 'granted') {
            PushNotificationService.registerDevice()
            success('Push notifications enabled')
            handleClose()
          }
        })
      }
    })

    window.addEventListener(OPEN_NOTIFICATION_PROMPT_EVENT, handleForceOpen)

    return () => {
      clearTimeout(timer)
      window.removeEventListener(OPEN_NOTIFICATION_PROMPT_EVENT, handleForceOpen)
      handleAppState.then((h) => h.remove()).catch(() => {})
    }
  }, [user, checkStatusAndEvaluate, success])

  const handleClose = () => {
    if (isClosing) return
    setIsClosing(true)
    setTimeout(() => {
      setIsVisible(false)
      setIsClosing(false)
    }, 200)
  }

  const handleDismiss = () => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now() + COOLDOWN_DAYS_MS))
    } catch {
      // Ignore local storage error
    }
    handleClose()
  }

  const handleAction = async () => {
    if (processing) return

    if (permissionStatus === 'denied') {
      await PushNotificationService.openSystemSettings()
      return
    }

    setProcessing(true)
    try {
      const granted = await PushNotificationService.requestPermission()
      if (granted) {
        await PushNotificationService.registerDevice()
        setPermissionStatus('granted')
        success('Push notifications enabled')
        handleClose()
      } else {
        setPermissionStatus('denied')
        error('Notification permission was not granted')
      }
    } catch (err: unknown) {
      error(err instanceof Error ? err.message : 'Could not request notification permission')
    } finally {
      setProcessing(false)
    }
  }

  if (!Capacitor.isNativePlatform() || !isVisible) return null

  const isDenied = permissionStatus === 'denied'
  const isAndroid = Capacitor.getPlatform() === 'android'

  return (
    <div
      className={`notification-prompt-overlay ${isClosing ? 'notification-prompt-overlay--closing' : ''}`}
      onClick={handleDismiss}
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-prompt-title"
    >
      <div
        className={`notification-prompt-sheet ${isClosing ? 'notification-prompt-sheet--closing' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="notification-prompt__drag-handle" aria-hidden="true" />

        <div className="notification-prompt__header">
          <div className="notification-prompt__icon-wrap" aria-hidden="true">
            <Bell size={26} strokeWidth={2.2} />
          </div>
          <h2 id="notification-prompt-title" className="notification-prompt__title">
            Never miss a rent update
          </h2>
          <p className="notification-prompt__subtitle">
            Stay on top of receipts, rent due dates, and property alerts in real-time.
          </p>
        </div>

        {isDenied ? (
          <div className="notification-prompt__denied-box">
            <div className="notification-prompt__denied-header">
              <AlertCircle size={16} strokeWidth={2.2} />
              <span>Notifications disabled in system settings</span>
            </div>
            <ol className="notification-prompt__denied-steps">
              {isAndroid ? (
                <>
                  <li>Tap <strong>Open Device Settings</strong> below</li>
                  <li>Select <strong>Notifications</strong></li>
                  <li>Toggle <strong>Allow notifications</strong> ON</li>
                </>
              ) : (
                <>
                  <li>Tap <strong>Open Device Settings</strong> below</li>
                  <li>Tap <strong>Notifications</strong></li>
                  <li>Turn on <strong>Allow Notifications</strong></li>
                </>
              )}
            </ol>
          </div>
        ) : (
          <div className="notification-prompt__features">
            <div className="notification-prompt__feature-item">
              <div className="notification-prompt__feature-icon" aria-hidden="true">
                <CheckCircle2 size={16} strokeWidth={2.4} />
              </div>
              <div className="notification-prompt__feature-text">
                <span className="notification-prompt__feature-title">Instant payment receipts</span>
                <span className="notification-prompt__feature-desc">
                  Immediate confirmation the second your rent is received.
                </span>
              </div>
            </div>

            <div className="notification-prompt__feature-item">
              <div className="notification-prompt__feature-icon" aria-hidden="true">
                <Clock size={16} strokeWidth={2.4} />
              </div>
              <div className="notification-prompt__feature-text">
                <span className="notification-prompt__feature-title">Rent due-date reminders</span>
                <span className="notification-prompt__feature-desc">
                  Timely reminders to avoid penalties and protect your score.
                </span>
              </div>
            </div>

            <div className="notification-prompt__feature-item">
              <div className="notification-prompt__feature-icon" aria-hidden="true">
                <ShieldCheck size={16} strokeWidth={2.4} />
              </div>
              <div className="notification-prompt__feature-text">
                <span className="notification-prompt__feature-title">Property manager alerts</span>
                <span className="notification-prompt__feature-desc">
                  Direct announcements and important updates from your PM.
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="notification-prompt__actions">
          <button
            type="button"
            className="notification-prompt__btn-primary"
            onClick={handleAction}
            disabled={processing}
          >
            {processing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : isDenied ? (
              <>
                <span>Open Device Settings</span>
                <ArrowUpRight size={17} strokeWidth={2.2} />
              </>
            ) : (
              <>
                <span>Enable notifications</span>
              </>
            )}
          </button>

          <button
            type="button"
            className="notification-prompt__btn-secondary"
            onClick={handleDismiss}
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
