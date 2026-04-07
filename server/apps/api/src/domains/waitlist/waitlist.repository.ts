import { WaitlistEntry } from './waitlist.entity'

export interface WaitlistRepository {
  findById(id: number): Promise<WaitlistEntry | null>
  findByUuid(uuid: string): Promise<WaitlistEntry | null>
  findByEmail(email: string): Promise<WaitlistEntry | null>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  findAll(params: any): Promise<WaitlistEntry[]>
  save(entry: WaitlistEntry): Promise<void>
  delete(id: number): Promise<void>
}

export const WAITLIST_REPOSITORY = Symbol('WAITLIST_REPOSITORY')
