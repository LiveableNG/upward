export enum AdminRole {
  ADMIN = 'ADMIN',
  SUPERADMIN = 'SUPERADMIN',
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
