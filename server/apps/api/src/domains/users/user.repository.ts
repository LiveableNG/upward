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
  gender?: string | null
  dateOfBirth?: string | null
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
  findByEmail(email: string): Promise<User | null>
  findById(id: number): Promise<User | null>
  findByUuid(uuid: string): Promise<User | null>
  findBySlug(slug: string): Promise<User | null>
  findAll(): Promise<User[]>
  save(user: User): Promise<User>
  update(id: number, data: Partial<User>): Promise<User>
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY')
