export interface Company {
  id: number
  uuid: string
  name: string
  address?: string
  webhookUrl?: string
  apiKey?: string
  createdAt: Date
  updatedAt: Date
}

export interface CompanyUser {
  id: number
  companyId: number
  userId: number
  invitedAt: Date
  acceptedAt?: Date
}

export interface Manager {
  id: number
  uuid: string
  companyId: number
  firstName: string
  lastName: string
  phone?: string
  email: string
  emailHash: string
  createdAt: Date
  updatedAt: Date
}

export interface CompanyRepository {
  findById(id: number): Promise<Company | null>
  findByUuid(uuid: string): Promise<Company | null>
  findByApiKey(apiKey: string): Promise<Company | null>
  save(company: Company): Promise<void>
}

export interface CompanyUserRepository {
  findByCompanyAndUser(companyId: number, userId: number): Promise<CompanyUser | null>
  save(companyUser: CompanyUser): Promise<void>
  update(id: number, data: Partial<CompanyUser>): Promise<void>
}

export interface ManagerRepository {
  findById(id: number): Promise<Manager | null>
  findByUuid(uuid: string): Promise<Manager | null>
  findByEmail(email: string): Promise<Manager | null>
  save(manager: Manager): Promise<void>
}

export const COMPANY_REPOSITORY = Symbol('COMPANY_REPOSITORY')
export const COMPANY_USER_REPOSITORY = Symbol('COMPANY_USER_REPOSITORY')
export const MANAGER_REPOSITORY = Symbol('MANAGER_REPOSITORY')
