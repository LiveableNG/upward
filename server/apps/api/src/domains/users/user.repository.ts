export interface User {
  id: number
  uuid: string
  email: string
  emailHash: string
  firstName: string
  lastName: string
  phone?: string
  phoneHash?: string
  passwordHash: string
  occupation?: string
  address?: string
  rentAnniversary?: string
  gender?: string
  dateOfBirth?: string
  isConvertedFromWaitlist: boolean
  hasDismissedAppBanner: boolean
  profilePic?: string
  useBiometrics: boolean
  
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
