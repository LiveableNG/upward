import {
  DEFAULT_HOME_REQUEST_TIMELINE,
  HOME_REQUEST_PROPERTY_TYPES,
  HOME_REQUEST_STORAGE_KEY,
  MOCK_HOME_REQUESTS,
  type HomeRequest,
  type HomeRequestPropertyType,
} from '../constants/exclusiveHomeRequests'
import type { HomeRequestLocation } from '../constants/homeRequestLocations'
import {
  formatHomeRequestLocations,
  getPrimaryHomeRequestState,
} from './homeRequestLocations'

export type CreateHomeRequestInput = {
  locations: HomeRequestLocation[]
  budgetMin: number
  budgetMax: number
  propertyType: HomeRequestPropertyType
  beds: number
  moveInDate: string
  notes?: string
}

type LegacyHomeRequest = {
  city?: string
  areas?: string
}

function normalizeHomeRequest(request: HomeRequest & LegacyHomeRequest): HomeRequest {
  if (Array.isArray(request.locations) && request.locations.length > 0) {
    return {
      ...(request as HomeRequest),
      propertyType: request.propertyType ?? 'any',
    }
  }

  const state = (request.city === 'Abuja' ? 'FCT - Abuja' : request.city || 'Lagos') as HomeRequest['locations'][number]['state']
  const locations =
    request.areas
      ?.split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const [area, subArea] = part.split(' - ').map((piece) => piece.trim())
        return subArea
          ? { state, area, subArea }
          : { state, area }
      }) ?? []

  return {
    ...request,
    locations,
    propertyType: request.propertyType ?? 'any',
  }
}

function readStoredRequests(): HomeRequest[] {
  if (typeof window === 'undefined') return []

  try {
    const raw = localStorage.getItem(HOME_REQUEST_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Array<HomeRequest & LegacyHomeRequest>
    return Array.isArray(parsed) ? parsed.map(normalizeHomeRequest) : []
  } catch {
    return []
  }
}

function writeStoredRequests(requests: HomeRequest[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(HOME_REQUEST_STORAGE_KEY, JSON.stringify(requests))
}

export function getAllHomeRequests(): HomeRequest[] {
  const stored = readStoredRequests()
  if (stored.length > 0) return stored
  return MOCK_HOME_REQUESTS
}

export function getHomeRequestById(id: string): HomeRequest | undefined {
  return getAllHomeRequests().find((request) => request.id === id)
}

export function createHomeRequest(input: CreateHomeRequestInput): HomeRequest {
  return {
    id: `req-${Date.now()}`,
    locations: input.locations,
    budgetMin: input.budgetMin,
    budgetMax: input.budgetMax,
    propertyType: input.propertyType,
    beds: input.beds,
    moveInDate: input.moveInDate,
    notes: input.notes?.trim() || undefined,
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    timeline: DEFAULT_HOME_REQUEST_TIMELINE.map((step, index) => ({
      ...step,
      state: index === 0 ? 'current' : 'upcoming',
    })),
  }
}

export function saveHomeRequest(request: HomeRequest) {
  const stored = readStoredRequests()
  const withoutMock = stored.filter((item) => !item.id.startsWith('req-lekki'))
  const next = [request, ...withoutMock.filter((item) => item.id !== request.id)]
  writeStoredRequests(next)
}

export function formatHomeRequestPropertyType(propertyType: HomeRequestPropertyType): string {
  return (
    HOME_REQUEST_PROPERTY_TYPES.find((option) => option.value === propertyType)?.label ?? 'Any'
  )
}

export function formatHomeRequestSummary(request: HomeRequest): string {
  const state = getPrimaryHomeRequestState(request.locations)
  const locations = formatHomeRequestLocations(request.locations)
  const propertyType = formatHomeRequestPropertyType(request.propertyType)
  return `${propertyType} · ${request.beds} bed · ${state}${state ? ' · ' : ''}${locations}`
}

export function formatBudgetRange(min: number, max: number): string {
  const formatter = new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  })
  return `${formatter.format(min)} – ${formatter.format(max)}/yr`
}
