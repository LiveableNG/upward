import { useMemo } from 'react'

import { useAuth } from '@/features/auth/AuthProvider'

export type MyHomeProperty = {
  uuid: string
  label: string
  unitName?: string
  managerDisplayName?: string
  managerEmail?: string
}

export function useMyHomeProperties(): MyHomeProperty[] {
  const { user } = useAuth()

  return useMemo(() => {
    return (user?.properties ?? [])
      .filter((p) => !p.isPastTenancy && p.uuid && p.externalUnitId)
      .map((property) => {
        const location = property.location
        const label =
          [location?.address, location?.area, location?.state].filter(Boolean).join(', ') ||
          property.address ||
          'Your home'

        return {
          uuid: property.uuid as string,
          label,
          unitName: property.unitName,
          managerDisplayName: property.managerName || property.companyName,
          managerEmail: undefined,
        }
      })
  }, [user?.properties])
}

export function useHasMyHome(): boolean {
  return useMyHomeProperties().length > 0
}
