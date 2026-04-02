export interface UserProfile {
  id: string
  identityId: string // maps to upward_tenant.id or upward_admin.id
  firstName?: string
  lastName?: string
  fullName: string
  phone?: string
  avatarUrl?: string
  createdAt: Date
  updatedAt: Date
}

export interface UserRepository {
  findById(id: string): Promise<UserProfile | null>
  findByIdentityId(identityId: string): Promise<UserProfile | null>
  save(user: UserProfile): Promise<void>
  delete(id: string): Promise<void>
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY')
