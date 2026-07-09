export interface User {
  id?: number
  uuid: string
  email: string
  emailHash: string
  firstName: string
  firstNameHash: string
  lastName: string
  lastNameHash: string
  phone?: string | null
  phoneHash?: string | null
  passwordHash: string
  authProvider?: string
  providerId?: string | null
  gender?: string | null
  dateOfBirth?: string | null
  isIdentityVerified?: boolean
  isFromWaitlist: boolean
  isFromInvite: boolean
  profilePic?: string | null
  profileSlug?: string | null
  bio?: string | null
  
  properties?: any[] // Joined properties
  companyUsers?: any[] // Joined company associations

  resetPasswordOTP?: string | null
  resetPasswordExpires?: Date | null

  createdAt: Date
  updatedAt: Date
}

export interface UserRepository {
  findByEmail(email: string, tx?: any): Promise<User | null>
  findByProviderId(providerId: string, tx?: any): Promise<User | null>
  findById(id: number, tx?: any): Promise<User | null>
  findByUuid(uuid: string, tx?: any): Promise<User | null>
  findBySlug(slug: string, tx?: any): Promise<User | null>
  findByPhone(phone: string, tx?: any): Promise<User | null>
  findAll(tx?: any): Promise<User[]>
  save(user: User, tx?: any): Promise<User>
  update(id: number, data: Partial<User>, tx?: any): Promise<User>
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY')

export const PASS_PLACEHOLDERS = {
  INVITED: 'INVITED',
  SHADOW: 'SHADOW_USER_PENDING_ONBOARDING',
  SOCIAL: 'SOCIAL_AUTH_NO_PASSWORD',
}

