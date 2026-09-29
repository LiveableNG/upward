import { UniversityHireRequest } from './university-hire-request.entity'

export interface UniversityHireRequestFilterParams {
  page?: number
  limit?: number
  search?: string
  industry?: string
  placementType?: string
  status?: string
}

export interface UniversityHireRequestStats {
  totalRequests: number
  pendingRequests: number
  contactedRequests: number
  matchedRequests: number
}

export interface IUniversityHireRequestRepository {
  save(hireRequest: UniversityHireRequest): Promise<UniversityHireRequest>
  findById(id: string): Promise<UniversityHireRequest | null>
  findAll(params: UniversityHireRequestFilterParams): Promise<{ data: UniversityHireRequest[]; total: number }>
  getStats(): Promise<UniversityHireRequestStats>
  update(hireRequest: UniversityHireRequest): Promise<UniversityHireRequest>
  delete(id: string): Promise<void>
}

export const UNIVERSITY_HIRE_REQUEST_REPOSITORY = Symbol('UNIVERSITY_HIRE_REQUEST_REPOSITORY')
