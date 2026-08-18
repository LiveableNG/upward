export interface PropertyManager {
  id?: number
  uuid: string
  email: string
  emailHash: string
  passwordHash: string
  firstName: string
  firstNameHash?: string | null
  lastName: string
  lastNameHash?: string | null
  businessName?: string | null
  pmType?: string | null
  phone?: string | null
  phoneHash?: string | null
  profilePic?: string | null
  country?: string | null
  companyAddress?: string | null
  cacNumber?: string | null
  personalEmail?: string | null
  personalPhone?: string | null
  bankName?: string | null
  bankCode?: string | null
  accountNumber?: string | null
  accountName?: string | null
  letterheadHeaderUrl?: string | null
  letterheadFooterUrl?: string | null
  isVerified?: boolean
  isBlocked?: boolean
  isManuallyBlocked?: boolean
  resetPasswordOTP?: string | null
  resetPasswordExpires?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PropertyManagerRepository {
  findByEmail(email: string): Promise<PropertyManager | null>
  findByPhone(phone: string): Promise<PropertyManager | null>
  findById(id: number): Promise<PropertyManager | null>
  findByUuid(uuid: string): Promise<PropertyManager | null>
  save(pm: PropertyManager): Promise<PropertyManager>
  update(id: number, data: Partial<PropertyManager>): Promise<PropertyManager>
}

export const PROPERTY_MANAGER_REPOSITORY = Symbol('PROPERTY_MANAGER_REPOSITORY')
