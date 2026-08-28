import { UniversityApplication } from './university-application.entity'

export const UNIVERSITY_APPLICATION_REPOSITORY = Symbol('UNIVERSITY_APPLICATION_REPOSITORY')

export interface ApplicationStats {
  totalApplications: number
  pendingReviewCount: number
  admittedCount: number
  feePaidCount: number
}

export interface IUniversityApplicationRepository {
  save(application: UniversityApplication): Promise<UniversityApplication>
  findById(id: string): Promise<UniversityApplication | null>
  findByEmail(email: string): Promise<UniversityApplication | null>
  findAll(params?: {
    status?: string
    feeStatus?: string
    search?: string
    limit?: number
    offset?: number
  }): Promise<{ applications: UniversityApplication[]; total: number }>
  getStats(): Promise<ApplicationStats>
}
