export interface Company {
  id?: number
  uuid: string
  name: string
  nameHash?: string | null
  address?: string | null
  email?: string | null
  emailHash?: string | null
  phone?: string | null
  phoneHash?: string | null
  platformId?: number | null
  createdAt: Date
  updatedAt: Date
}

export interface Platform {
  id?: number
  uuid: string
  apiKey: string
  webhookUrl: string
  name: string
  nameHash?: string | null
  address?: string | null
  email?: string | null
  emailHash?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface CompanyUser {
  id?: number
  companyId: number
  userId: number
  invitedAt: Date
  acceptedAt?: Date
}

export interface Manager {
  id?: number
  uuid: string
  companyId: number
  firstName?: string | null
  firstNameHash?: string | null
  lastName?: string | null
  lastNameHash?: string | null
  phone?: string | null
  phoneHash?: string | null
  email: string
  emailHash: string
  createdAt: Date
  updatedAt: Date
}

export interface CompanyRepository {
  findById(id: number): Promise<Company | null>
  findByUuid(uuid: string): Promise<Company | null>
  findByName(name: string): Promise<Company | null>
  save(company: Company): Promise<Company>
  update(id: number, data: Partial<Company>): Promise<Company>
}

export interface PlatformRepository {
  findById(id: number): Promise<Platform | null>
  findByApiKey(apiKey: string): Promise<Platform | null>
  findByEmail(email: string): Promise<Platform | null>
  save(platform: Platform): Promise<Platform>
  update(id: number, data: Partial<Platform>): Promise<Platform>
}

export interface CompanyUserRepository {
  findByCompanyAndUser(companyId: number, userId: number): Promise<CompanyUser | null>
  save(companyUser: CompanyUser): Promise<CompanyUser>
  update(id: number, data: Partial<CompanyUser>): Promise<CompanyUser>
}

export interface ManagerRepository {
  findById(id: number): Promise<Manager | null>
  findByUuid(uuid: string): Promise<Manager | null>
  findByEmail(email: string): Promise<Manager | null>
  save(manager: Manager): Promise<Manager>
  update(id: number, data: Partial<Manager>): Promise<Manager>
}

export const COMPANY_REPOSITORY = Symbol('COMPANY_REPOSITORY')
export const PLATFORM_REPOSITORY = Symbol('PLATFORM_REPOSITORY')
export const COMPANY_USER_REPOSITORY = Symbol('COMPANY_USER_REPOSITORY')
export const MANAGER_REPOSITORY = Symbol('MANAGER_REPOSITORY')
