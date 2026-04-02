export interface Identity {
  id: string
  email: string
  passwordHash: string
  role: string
  lastSignInAt?: Date
  isEmailVerified?: boolean
}

export interface IdentityRepository {
  findById(id: string): Promise<Identity | null>
  findByEmail(email: string): Promise<Identity | null>
  save(identity: Identity): Promise<void>
  delete(id: string): Promise<void>
}

export const IDENTITY_REPOSITORY = Symbol('IDENTITY_REPOSITORY')
