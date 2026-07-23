import type { HomeRequestLocation, PmHomeRequest } from '@/features/pm/services/homeRequestService'
import type { TenantHomeRequestStatus } from '@/features/pm/constants/tenantHomeRequests'

export function homeRequestLocationKey(location: HomeRequestLocation): string {
  return [location.state, location.area, location.subArea ?? ''].join('|')
}

export function formatTenantHomeRequestLocation(location: HomeRequestLocation): string {
  if (location.subArea) return `${location.area} - ${location.subArea}`
  return location.area
}

export function formatTenantHomeRequestLocations(locations: HomeRequestLocation[]): string {
  if (locations.length === 0) return 'No locations'
  return locations.map(formatTenantHomeRequestLocation).join(', ')
}

export function formatTenantHomeRequestCurrency(amount: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatTenantHomeRequestBudget(min: number, max: number): string {
  return `${formatTenantHomeRequestCurrency(min)} – ${formatTenantHomeRequestCurrency(max)}/yr`
}

export function formatPropertyTypes(types: string[]): string {
  if (!types.length) return 'Any'
  return types
    .map((type) => type.charAt(0).toUpperCase() + type.slice(1))
    .join(', ')
}

export function statusLabelKey(status: string): TenantHomeRequestStatus {
  if (status === 'contacted' || status === 'assigned' || status === 'closed') return status
  return 'submitted'
}

export function matchesHomeRequestSearch(request: PmHomeRequest, query: string): boolean {
  if (!query.trim()) return true
  const needle = query.trim().toLowerCase()
  const haystack = [
    ...request.locations.flatMap((location) => [
      location.state,
      location.area,
      location.subArea,
      formatTenantHomeRequestLocation(location),
    ]),
    formatTenantHomeRequestLocations(request.locations),
    formatTenantHomeRequestBudget(request.budgetMin, request.budgetMax),
    formatPropertyTypes(request.propertyTypes),
    request.notes,
    request.displayName,
    `${request.beds} bed`,
    request.moveInDate,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return haystack.includes(needle)
}
