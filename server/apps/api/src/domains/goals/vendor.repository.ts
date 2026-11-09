export interface CommerceVendor {
  id?: number
  uuid: string
  name: string
  slug: string
  logoUrl?: string | null
  email?: string | null
  phone?: string | null
  website?: string | null
  rating: number
  isActive: boolean
  createdAt?: Date
  updatedAt?: Date
  _count?: {
    offerings?: number
  }
}

export interface VendorRepository {
  findVendors(filter?: { isActive?: boolean; search?: string }): Promise<CommerceVendor[]>
  findVendorById(id: number): Promise<CommerceVendor | null>
  findVendorByUuid(uuid: string): Promise<CommerceVendor | null>
  findVendorBySlug(slug: string): Promise<CommerceVendor | null>
  createVendor(data: Partial<CommerceVendor>): Promise<CommerceVendor>
  updateVendor(id: number, data: Partial<CommerceVendor>): Promise<CommerceVendor>
  deleteVendor(id: number): Promise<void>
}

export const VENDOR_REPOSITORY = Symbol('VENDOR_REPOSITORY')

