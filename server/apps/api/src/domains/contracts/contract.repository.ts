export const CONTRACT_REPOSITORY = Symbol('CONTRACT_REPOSITORY')

export interface Contract {
  id: string
  tenantId: string
  name: string
  url: string
  type: string
  size: number
  propertyName?: string
  leaseEnd?: Date
  status: string
  createdAt: Date
  updatedAt: Date
}

export interface IContractRepository {
  findByTenantId(tenantId: string): Promise<Contract[]>
  save(contract: Omit<Contract, 'id' | 'createdAt' | 'updatedAt'>): Promise<Contract>
  delete(id: string): Promise<void>
  findById(id: string): Promise<Contract | null>
}
