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
  phone?: string | null
  phoneHash?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface PropertyManagerRepository {
  findByEmail(email: string): Promise<PropertyManager | null>
  findById(id: number): Promise<PropertyManager | null>
  findByUuid(uuid: string): Promise<PropertyManager | null>
  save(pm: PropertyManager): Promise<PropertyManager>
  update(id: number, data: Partial<PropertyManager>): Promise<PropertyManager>
}

export const PROPERTY_MANAGER_REPOSITORY = Symbol('PROPERTY_MANAGER_REPOSITORY')
