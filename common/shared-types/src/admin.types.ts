export enum AdminRole {
  SUPERADMIN = 'SUPERADMIN',
  CUSTOMER_SUPPORT = 'CUSTOMER_SUPPORT',
  DEVELOPER = 'DEVELOPER',
}

export interface AdminUser {
  id: string
  email: string
  role: AdminRole
  mustChangePassword: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AdminAuthResponse {
  accessToken: string
  user: AdminUser
}

export interface AdminJwtPayload {
  sub: string
  email: string
  role: AdminRole
  mustChangePassword: boolean
  [key: string]: unknown
}
