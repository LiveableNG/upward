import { UniversityTrafficSource, UniversityTrafficVisit } from './university-traffic.entity'

export const UNIVERSITY_TRAFFIC_REPOSITORY = Symbol('UNIVERSITY_TRAFFIC_REPOSITORY')

export interface CreateUniversityTrafficSourceData {
  identifier: string
  name: string
  channel?: string
  targetUrl?: string
  description?: string
  isActive?: boolean
}

export interface UpdateUniversityTrafficSourceData {
  name?: string
  channel?: string
  targetUrl?: string
  description?: string
  isActive?: boolean
}

export interface RecordTrafficVisitData {
  identifier: string
  visitorId: string
  sessionId: string
  ipHash?: string
  userAgent?: string
  referer?: string
  path: string
}

export interface TrafficStatsOverview {
  totalSources: number
  totalViews: number
  uniqueViews: number
  totalConversions: number
  overallConversionRate: number
  channelBreakdown: Array<{ channel: string; views: number; uniqueViews: number; conversions: number }>
}

export interface IUniversityTrafficRepository {
  findSourceById(id: string): Promise<UniversityTrafficSource | null>
  findSourceByIdentifier(identifier: string): Promise<UniversityTrafficSource | null>
  createSource(data: CreateUniversityTrafficSourceData): Promise<UniversityTrafficSource>
  updateSource(id: string, data: UpdateUniversityTrafficSourceData): Promise<UniversityTrafficSource>
  deleteSource(id: string): Promise<void>
  listSources(options?: {
    page?: number
    limit?: number
    search?: string
    channel?: string
    isActive?: boolean
  }): Promise<{ data: UniversityTrafficSource[]; meta: { total: number; page: number; limit: number; totalPages: number } }>
  getStatsOverview(): Promise<TrafficStatsOverview>
  recordVisit(data: RecordTrafficVisitData): Promise<{ visit: UniversityTrafficVisit; isDeduplicated: boolean; isNewUnique: boolean }>
  incrementConversion(identifier: string): Promise<boolean>
  listVisitsForSource(sourceId: string, limit?: number): Promise<UniversityTrafficVisit[]>
}
