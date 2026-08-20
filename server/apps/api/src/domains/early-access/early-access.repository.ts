import { EarlyAccessEntry } from './early-access.entity'

export interface IEarlyAccessRepository {
  save(entry: EarlyAccessEntry): Promise<EarlyAccessEntry>
  findById(id: string): Promise<EarlyAccessEntry | null>
  findAll(params?: { type?: string }): Promise<EarlyAccessEntry[]>
}

export const EARLY_ACCESS_REPOSITORY = Symbol('EARLY_ACCESS_REPOSITORY')
