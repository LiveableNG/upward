export interface Tenant {
  id: string
  email: string
  fullName: string
  phone?: string
  passwordHash: string
  invitedByCompanyId?: string
  invitedByCompanyName?: string
  invitedByCompanyLogo?: string
  rentAnniversary?: Date
  address?: string
  occupation?: string
  gender?: string
  dateOfBirth?: string
  isConvertedFromWaitlist: boolean
  createdAt: Date
  updatedAt: Date
}

export interface TenantRepository {
  findByEmail(email: string): Promise<Tenant | null>
  findById(id: string): Promise<Tenant | null>
  save(tenant: Tenant): Promise<void>
  update(id: string, data: Partial<Tenant>): Promise<void>
}

export const TENANT_REPOSITORY = Symbol('TENANT_REPOSITORY')
