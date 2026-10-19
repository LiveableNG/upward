import { AppSession, SessionEvent } from './session-tracking.entity'

export const SESSION_TRACKING_REPOSITORY = Symbol('SESSION_TRACKING_REPOSITORY')

export interface UpsertSessionData {
  sessionId: string
  anonymousId: string
  userId?: number | null
  userEmail?: string | null
  userRole?: string | null
  app?: string
  platform: string
  clientType?: string

  ipAddress?: string | null
  country?: string | null
  countryCode?: string | null
  region?: string | null
  city?: string | null
  timezone?: string | null
  locale?: string | null
  networkType?: string | null

  landingPage?: string | null
  referrer?: string | null
  utmSource?: string | null
  utmMedium?: string | null
  utmCampaign?: string | null

  deviceModel?: string | null
  osVersion?: string | null
  browser?: string | null
  screenWidth?: number | null
  screenHeight?: number | null

  entryScreen?: string | null
  exitScreen?: string | null
  lastAction?: string | null
  dropOffStage?: string | null
  hasError?: boolean
  lastError?: string | null
  eventsCount?: number
}

export interface CreateSessionEventData {
  sessionId: string
  userId?: number | null
  eventName: string
  screenName?: string | null
  stepNumber: number
  metadata?: any
  clientTimestamp: Date
}

export interface EndSessionData {
  endedAt: Date
  durationSeconds: number
  exitScreen?: string | null
  lastAction?: string | null
  dropOffStage?: string | null
}

export interface FunnelMetricsQuery {
  platform?: string
  days?: number
  app?: string
}

export interface FunnelStepMetric {
  step: number
  name: string
  count: number
  conversionRate: number
  dropOffCount: number
  dropOffRate: number
}

export interface FunnelMetricsResult {
  totalSessions: number
  paymentFunnel: {
    steps: FunnelStepMetric[]
    leakage: {
      dismissedWithoutPaying: number
      failedWithErrors: number
    }
  }
  dropOffBreakdown: Array<{ stage: string; count: number }>
  platformBreakdown: Array<{ platform: string; count: number }>
  topLocations: Array<{ city: string; countryCode: string; count: number }>
}

export interface FindSessionsQuery {
  page?: number
  limit?: number
  search?: string
  platform?: string
  dropOffStage?: string
  hasError?: boolean
}

export interface ISessionTrackingRepository {
  upsertSession(data: UpsertSessionData): Promise<AppSession>
  saveEvents(events: CreateSessionEventData[]): Promise<void>
  endSession(sessionId: string, data: EndSessionData): Promise<boolean>
  findSessionBySessionId(sessionId: string): Promise<AppSession | null>
  getFunnelMetrics(query: FunnelMetricsQuery): Promise<FunnelMetricsResult>
  findSessions(query: FindSessionsQuery): Promise<{ data: AppSession[]; total: number }>
  findSessionWithEvents(
    sessionId: string,
  ): Promise<{ session: AppSession; events: SessionEvent[] } | null>
}
