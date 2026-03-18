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

export interface AuthResponse {
  accessToken: string
  user: AdminUser
}

export interface JwtPayload {
  sub: string
  email: string
  role: AdminRole
  mustChangePassword: boolean
}
