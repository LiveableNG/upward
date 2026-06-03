export interface Contract {
  id?: number
  uuid: string
  userId: number
  userPropertyId?: number | null
  fileName: string
  fileUrl: string
  fileType: string
  fileSize: number
  createdAt?: Date
  updatedAt?: Date
  userProperty?: {
    uuid: string
    location?: {
      address?: string | null
      area?: string
      state?: string
      country?: string
    } | null
  } | null
}

export const CONTRACT_REPOSITORY = Symbol('CONTRACT_REPOSITORY')

export interface ContractRepository {
  save(contract: Contract): Promise<Contract>
  findById(id: number): Promise<Contract | null>
  findByUuid(uuid: string): Promise<Contract | null>
  findByUserId(userId: number): Promise<Contract[]>
  delete(uuid: string): Promise<void>
  countByUserId(userId: number): Promise<number>
}
