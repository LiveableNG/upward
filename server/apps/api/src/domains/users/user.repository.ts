export interface User {
  id: number
  uuid: string
  email: string
  emailHash: string
  firstName: string
  lastName: string
  phone?: string | null
  phoneHash?: string | null
  passwordHash: string
  occupation?: string | null
  address?: string | null
  rentAnniversary?: Date | null
  gender?: string | null
  dateOfBirth?: string | null
  isFromWaitlist: boolean
  isFromInvite: boolean
  profilePic?: string | null
  profileSlug?: string | null
  bio?: string | null
  useBiometrics: boolean
  
  resetPasswordOTP?: string | null
  resetPasswordExpires?: Date | null

  createdAt: Date
  updatedAt: Date
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>
  findById(id: number): Promise<User | null>
  findByUuid(uuid: string): Promise<User | null>
  save(user: User): Promise<void>
  update(id: number, data: Partial<User>): Promise<void>
}

export const USER_REPOSITORY = Symbol('USER_REPOSITORY')
