'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Capacitor } from '@capacitor/core'
import { App } from '@capacitor/app'
import { HardUpdateModal } from './components/HardUpdateModal'
import { SoftUpdateBottomSheet } from './components/SoftUpdateBottomSheet'
import { FeatureGatedModal } from './components/FeatureGatedModal'
import { API_BASE, getAppVersionInfo } from '@/lib/api-client'
import '@/styles/app-update.css'

export type UpdateStatus = 'HARD_UPDATE' | 'SOFT_UPDATE' | 'FEATURE_GATED' | 'UP_TO_DATE' | 'NONE'

export interface AppVersionPolicyDto {
  status: UpdateStatus
  maintenance: boolean
  currentVersion: string
  currentBuild: number
  latestVersion: string
  latestBuild: number
  minSupportedVersion: string
  minBuildNumber: number
  forceUpdate: boolean
  gatedFeatures: string[]
  policy: {
    title: string | null
    message: string | null
    releaseNotes: string[] | null
    storeUrl: string
    fallbackStoreUrl: string
  }
}

interface AppUpdateContextType {
  policy: AppVersionPolicyDto | null
  status: UpdateStatus
  isChecking: boolean
  checkPolicy: () => Promise<void>
  isFeatureGated: (featureName: string) => boolean
  triggerFeatureGateModal: (featureName: string) => void
}

const AppUpdateContext = createContext<AppUpdateContextType | undefined>(undefined)

const SNOOZE_KEY = 'upward_soft_update_snooze'
const SNOOZE_DURATION_MS = 24 * 60 * 60 * 1000 // 24 hours

export const AppUpdateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [policyData, setPolicyData] = useState<AppVersionPolicyDto | null>(null)
  const [status, setStatus] = useState<UpdateStatus>('NONE')
  const [isChecking, setIsChecking] = useState(false)
  const [showSoftUpdate, setShowSoftUpdate] = useState(false)
  const [activeGatedFeature, setActiveGatedFeature] = useState<string | null>(null)

  const checkPolicy = useCallback(async () => {
    const isDev = process.env.NODE_ENV === 'development'
    const isDebugWeb =
      isDev &&
      typeof window !== 'undefined' &&
      (new URLSearchParams(window.location.search).has('debug_update') ||
        localStorage.getItem('debug_update') === 'true')

    if (!Capacitor.isNativePlatform() && !isDebugWeb) {
      return
    }

    const platform = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'android'
    const appInfo = await getAppVersionInfo()

    try {
      setIsChecking(true)
      const res = await fetch(
        `${API_BASE}/public/app/version-policy?platform=${platform}&version=${appInfo.version}&build=${appInfo.build}&app=upward-pay`,
        { cache: 'no-store' },
      )

      if (!res.ok) return

      const json = await res.json()
      if (json.success && json.data) {
        const data: AppVersionPolicyDto = json.data
        setPolicyData(data)
        setStatus(data.status)

        // Evaluate soft update snooze
        if (data.status === 'SOFT_UPDATE') {
          const snoozedAt = localStorage.getItem(SNOOZE_KEY)
          if (snoozedAt) {
            const timePassed = Date.now() - parseInt(snoozedAt, 10)
            if (timePassed < SNOOZE_DURATION_MS) {
              setShowSoftUpdate(false)
              return
            }
          }
          setShowSoftUpdate(true)
        }
      }
    } catch (err) {
      console.warn('[AppUpdateProvider] Failed to check version policy:', err)
    } finally {
      setIsChecking(false)
    }
  }, [])

  useEffect(() => {
    // 1. Initial boot check
    checkPolicy()

    // 2. Foreground resume check (when switching back to app)
    let listenerHandle: any = null
    if (Capacitor.isNativePlatform()) {
      App.addListener('appStateChange', (state) => {
        if (state.isActive) {
          console.log('[AppUpdateProvider] App resumed, re-evaluating version policy...')
          checkPolicy()
        }
      }).then((handle) => {
        listenerHandle = handle
      })
    }

    // 3. Listen for in-flight HTTP 426 Upgrade Required responses
    const handleUpgradeRequired = (event: any) => {
      const isDev = process.env.NODE_ENV === 'development'
      const isDebugWeb =
        isDev &&
        typeof window !== 'undefined' &&
        (new URLSearchParams(window.location.search).has('debug_update') ||
          localStorage.getItem('debug_update') === 'true')

      if (!Capacitor.isNativePlatform() && !isDebugWeb) {
        return
      }

      console.warn('[AppUpdateProvider] Received upward:version-upgrade-required event:', event.detail)
      const detail = event.detail
      if (detail?.type === 'FEATURE_GATED') {
        setActiveGatedFeature(detail.feature || 'PAYMENTS')
      } else {
        // Instant hard lock
        setStatus('HARD_UPDATE')
      }
    }

    window.addEventListener('upward:version-upgrade-required', handleUpgradeRequired)

    return () => {
      if (listenerHandle?.remove) {
        listenerHandle.remove()
      }
      window.removeEventListener('upward:version-upgrade-required', handleUpgradeRequired)
    }
  }, [checkPolicy])

  const dismissSoftUpdate = () => {
    localStorage.setItem(SNOOZE_KEY, Date.now().toString())
    setShowSoftUpdate(false)
  }

  const isFeatureGated = useCallback(
    (featureName: string): boolean => {
      if (!policyData?.gatedFeatures) return false
      return policyData.gatedFeatures.includes(featureName) && status === 'FEATURE_GATED'
    },
    [policyData, status],
  )

  const triggerFeatureGateModal = (featureName: string) => {
    setActiveGatedFeature(featureName)
  }

  return (
    <AppUpdateContext.Provider
      value={{
        policy: policyData,
        status,
        isChecking,
        checkPolicy,
        isFeatureGated,
        triggerFeatureGateModal,
      }}
    >
      {children}

      {/* 1. Hard Gate / Maintenance Lockout */}
      {(status === 'HARD_UPDATE' || policyData?.forceUpdate || policyData?.maintenance) && policyData && (
        <HardUpdateModal
          currentVersion={policyData.currentVersion}
          latestVersion={policyData.latestVersion}
          title={policyData.policy.title}
          message={policyData.policy.message}
          releaseNotes={policyData.policy.releaseNotes}
          storeUrl={policyData.policy.storeUrl}
          fallbackStoreUrl={policyData.policy.fallbackStoreUrl}
          isMaintenance={policyData.maintenance}
        />
      )}

      {/* 2. Soft Update Bottom Sheet */}
      {status === 'SOFT_UPDATE' && showSoftUpdate && policyData && (
        <SoftUpdateBottomSheet
          currentVersion={policyData.currentVersion}
          latestVersion={policyData.latestVersion}
          title={policyData.policy.title}
          message={policyData.policy.message}
          releaseNotes={policyData.policy.releaseNotes}
          storeUrl={policyData.policy.storeUrl}
          fallbackStoreUrl={policyData.policy.fallbackStoreUrl}
          onDismiss={dismissSoftUpdate}
        />
      )}

      {/* 3. Action-Specific Feature Gate Modal */}
      {activeGatedFeature && policyData && (
        <FeatureGatedModal
          featureName={activeGatedFeature}
          latestVersion={policyData.latestVersion}
          title={policyData.policy.title}
          message={policyData.policy.message}
          storeUrl={policyData.policy.storeUrl}
          fallbackStoreUrl={policyData.policy.fallbackStoreUrl}
          onClose={() => setActiveGatedFeature(null)}
        />
      )}
    </AppUpdateContext.Provider>
  )
}

export function useAppUpdate() {
  const context = useContext(AppUpdateContext)
  if (!context) {
    throw new Error('useAppUpdate must be used within an AppUpdateProvider')
  }
  return context
}
