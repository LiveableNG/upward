export enum UserRole {
  TENANT = 'TENANT',
  OWNER = 'OWNER',
}

export interface BaseUser {
  id: string
  email: string
  role: UserRole
  createdAt: string
  updatedAt: string
}
