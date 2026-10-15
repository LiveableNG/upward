import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { API_BASE } from './api-client'

export interface TrackEventOptions {
  metadata?: Record<string, any>
  screenName?: string
}

export interface SessionUserInfo {
  id?: number | null
  email?: string | null
  role?: string | null
}

interface QueuedEvent {
  eventName: string
  screenName?: string | null
  stepNumber: number
  metadata?: any
  clientTimestamp: string
}

const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes
const FLUSH_INTERVAL_MS = 2500 // Batch events every 2.5s
const MAX_QUEUE_SIZE = 10

class SessionTracker {
  private sessionId: string = ''
  private anonymousId: string = ''
  private userInfo: SessionUserInfo = {}
  private currentScreen: string = 'INITIAL'
  private stepCounter: number = 0
  private lastActivityAt: number = Date.now()
  private eventQueue: QueuedEvent[] = []
  private flushTimer: any = null
  private isInitialized: boolean = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.init()
    }
  }

  public init() {
    if (this.isInitialized || typeof window === 'undefined') return
    this.isInitialized = true

    this.anonymousId = this.getOrCreateAnonymousId()
    this.sessionId = this.getOrCreateSessionId()

    // Listen to lifecycle events for session closure & state flushes
    this.setupLifecycleListeners()
  }

  private getOrCreateAnonymousId(): string {
    try {
      let id = localStorage.getItem('upward_anon_id')
      if (!id) {
        id = 'anon_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now()
        localStorage.setItem('upward_anon_id', id)
      }
      return id
    } catch {
      return 'anon_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now()
    }
  }

  private getOrCreateSessionId(): string {
    const now = Date.now()
    try {
      const storedSession = localStorage.getItem('upward_session_id')
      const storedTime = localStorage.getItem('upward_session_last_active')

      if (storedSession && storedTime) {
        const timeDiff = now - parseInt(storedTime, 10)
        if (timeDiff < INACTIVITY_TIMEOUT_MS) {
          localStorage.setItem('upward_session_last_active', String(now))
          return storedSession
        }
      }

      // Generate new session ID
      const newSession = 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + now
      localStorage.setItem('upward_session_id', newSession)
      localStorage.setItem('upward_session_last_active', String(now))
      return newSession
    } catch {
      return 'sess_' + Math.random().toString(36).substring(2, 11) + '_' + now
    }
  }

  private getPlatform(): string {
    if (Capacitor.isNativePlatform()) {
      return Capacitor.getPlatform() // 'ios' | 'android'
    }
    return 'web'
  }

  private setupLifecycleListeners() {
    // 1. Browser Page Visibility & Unload
    if (typeof window !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          this.flush(true)
        }
      })

      window.addEventListener('pagehide', () => {
        this.flush(true)
      })
    }

    // 2. Capacitor Native App State Changes
    if (Capacitor.isNativePlatform()) {
      try {
        App.addListener('appStateChange', ({ isActive }) => {
          if (!isActive) {
            this.trackEvent('APP_BACKGROUNDED')
            this.flush(true)
          } else {
            this.trackEvent('APP_FOREGROUNDED')
          }
        })
      } catch (err) {
        console.warn('[SessionTracker] Could not attach Capacitor App listener', err)
      }
    }
  }

  public identify(user: SessionUserInfo) {
    this.userInfo = { ...this.userInfo, ...user }
    if (typeof window !== 'undefined') {
      this.trackEvent('USER_IDENTIFIED', { userId: user.id, email: user.email })
    }
  }

  public trackScreen(screenName: string, metadata?: Record<string, any>) {
    this.currentScreen = screenName
    this.trackEvent('VIEW_SCREEN', { ...metadata, screen: screenName }, screenName)
  }

  public trackEvent(eventName: string, metadata?: Record<string, any>, screenName?: string) {
    if (typeof window === 'undefined') return
    if (!this.isInitialized) this.init()

    this.lastActivityAt = Date.now()
    try {
      localStorage.setItem('upward_session_last_active', String(this.lastActivityAt))
    } catch {}

    this.stepCounter++

    const event: QueuedEvent = {
      eventName,
      screenName: screenName || this.currentScreen,
      stepNumber: this.stepCounter,
      metadata: metadata || null,
      clientTimestamp: new Date().toISOString(),
    }

    this.eventQueue.push(event)

    // Critical events flush immediately
    const immediateEvents = [
      'PAYMENT_SUCCESS',
      'PAYSTACK_CLOSED_UNPAID',
      'PAYMENT_ERROR',
      'AUTH_FAILED',
      'LOGIN_SUCCESS',
      'SIGNUP_SUCCESS',
    ]

    if (immediateEvents.includes(eventName) || this.eventQueue.length >= MAX_QUEUE_SIZE) {
      this.flush(false)
    } else {
      this.scheduleFlush()
    }
  }

  private scheduleFlush() {
    if (this.flushTimer) return
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null
      this.flush(false)
    }, FLUSH_INTERVAL_MS)
  }

  public async flush(isExiting: boolean = false) {
    if (this.eventQueue.length === 0 && !isExiting) return

    const eventsToShip = [...this.eventQueue]
    this.eventQueue = []

    const payload = {
      session: {
        sessionId: this.sessionId,
        anonymousId: this.anonymousId,
        userId: this.userInfo.id || undefined,
        userEmail: this.userInfo.email || undefined,
        userRole: this.userInfo.role || 'GUEST',
        app: 'upward-pay',
        platform: this.getPlatform(),
        clientType: Capacitor.isNativePlatform() ? 'native_app' : 'browser',
        screenWidth: typeof window !== 'undefined' ? window.innerWidth : undefined,
        screenHeight: typeof window !== 'undefined' ? window.innerHeight : undefined,
        locale: typeof navigator !== 'undefined' ? navigator.language : undefined,
        entryScreen: this.currentScreen,
      },
      events: eventsToShip,
    }

    const endpoint = `${API_BASE}/public/tracking/session/event`

    try {
      if (isExiting && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
        navigator.sendBeacon(endpoint, blob)
      } else {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          keepalive: isExiting,
        })
      }
    } catch (err) {
      console.warn('[SessionTracker] Failed to flush events:', err)
      // Re-queue events if send failed and not exiting
      if (!isExiting) {
        this.eventQueue = [...eventsToShip, ...this.eventQueue]
      }
    }
  }

  public async endSession(dropOffStage?: string) {
    if (!this.sessionId) return
    const endpoint = `${API_BASE}/public/tracking/session/end`
    const body = JSON.stringify({
      sessionId: this.sessionId,
      exitScreen: this.currentScreen,
      dropOffStage: dropOffStage || undefined,
    })

    try {
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([body], { type: 'application/json' })
        navigator.sendBeacon(endpoint, blob)
      } else {
        await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          keepalive: true,
        })
      }
    } catch (err) {
      console.warn('[SessionTracker] Failed to end session:', err)
    }
  }
}

export const sessionTracker = new SessionTracker()
