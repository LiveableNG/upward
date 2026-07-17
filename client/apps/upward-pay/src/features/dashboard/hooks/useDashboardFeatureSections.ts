'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/AuthContext'
import { api } from '@/lib/api'
import { useRsiEnrolment } from '@/features/rent-support-insurance/hooks/useRsiEnrolment'
import {
  DASHBOARD_FEATURE_SECTIONS,
  type DashboardFeatureItem,
  type DashboardFeatureSection,
} from '../constants/dashboardFeatures'
import { hasRentalInfo, needsIdentityVerification } from '../utils/profileCompletion'
import { isSavingsWalletEnabled } from '../utils/savingsWallet'

export type DashboardFeatureItemView = DashboardFeatureItem & {
  badge?: string
}

export type DashboardFeatureSectionView = {
  id: string
  label: string
  items: DashboardFeatureItemView[]
}

export function useDashboardFeatureSections() {
  const { user } = useAuth()
  const { enrolments, loaded: rsiLoaded } = useRsiEnrolment()
  const { data: benefitsStatus, isError: benefitsError } = useQuery({
    queryKey: ['benefits-status'],
    queryFn: () => api.getBenefitsStatus(),
    staleTime: 5 * 60 * 1000,
    retry: 1,
  })

  return useMemo(() => {
    const hasRental = hasRentalInfo(user)
    const activePropertyUuids = (user?.properties || [])
      .filter((property) => !property.isPastTenancy)
      .map((property) => property.uuid || String(property.id))

    const rsiIncomplete =
      hasRental &&
      rsiLoaded &&
      activePropertyUuids.length > 0 &&
      !activePropertyUuids.every((propertyUuid) =>
        enrolments.some((record) => record.form.propertyUuid === propertyUuid),
      )

    const benefitsInactive = !benefitsError && benefitsStatus ? !benefitsStatus.isActive : false
    const identityNeeded = needsIdentityVerification(user)

    const badgeByFeatureId: Record<string, string | undefined> = {
      'rent-support-insurance': rsiIncomplete ? 'Enrol' : undefined,
      benefits: benefitsInactive ? 'Activate' : undefined,
      'verify-identity': identityNeeded ? 'Required' : undefined,
    }

    const savingsEnabled = isSavingsWalletEnabled(user)

    const sections: DashboardFeatureSectionView[] = DASHBOARD_FEATURE_SECTIONS.map(
      (section: DashboardFeatureSection) => ({
        ...section,
        items: section.items
          .filter((item) => {
            if (item.id === 'rent-support-insurance') return hasRental
            return true
          })
          .map((item) => {
            if (item.id === 'save-for-rent' && savingsEnabled) {
              return {
                ...item,
                href: '/dashboard/savings',
                comingSoon: false,
                description: 'Build up funds for your next rent payment',
                badge: badgeByFeatureId[item.id],
              }
            }

            return {
              ...item,
              badge: badgeByFeatureId[item.id],
            }
          }),
      }),
    ).filter((section) => section.items.length > 0)

    const pendingCount = Object.values(badgeByFeatureId).filter(Boolean).length

    return { sections, pendingCount }
  }, [benefitsError, benefitsStatus, enrolments, rsiLoaded, user])
}
