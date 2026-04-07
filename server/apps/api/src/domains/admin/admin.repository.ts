export interface Admin {
  id: string
  email: string
  passwordHash: string
  role: string
  lastSignInAt?: Date
  isEmailVerified?: boolean
}

export interface AdminRepository {
  findById(id: string): Promise<Admin | null>
  findByEmail(email: string): Promise<Admin | null>
  save(admin: Admin): Promise<void>
  delete(id: string): Promise<void>
}

export const ADMIN_REPOSITORY = Symbol('ADMIN_REPOSITORY')
