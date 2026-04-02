export interface Tenant {
  id: string
  email: string
  fullName: string
  phone?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface TenantAuthResponse {
  accessToken: string
  tenant: Tenant
}

export interface SignupDto {
  email: string
  passwordHash: string
  fullName: string
  phone?: string
}
