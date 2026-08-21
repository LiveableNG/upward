import { EarlyAccessEntry } from './early-access.entity'

export interface EarlyAccessStats {
  totalSubmissions: number
  studentCount: number
  landlordCount: number
  cityBreakdown: Array<{ city: string; count: number }>
}

export interface IEarlyAccessRepository {
  save(entry: EarlyAccessEntry): Promise<EarlyAccessEntry>
  findById(id: string): Promise<EarlyAccessEntry | null>
  findAll(params?: { type?: string; search?: string; limit?: number; offset?: number }): Promise<{ entries: EarlyAccessEntry[]; total: number }>
  getStats(): Promise<EarlyAccessStats>
}

export const EARLY_ACCESS_REPOSITORY = Symbol('EARLY_ACCESS_REPOSITORY')
