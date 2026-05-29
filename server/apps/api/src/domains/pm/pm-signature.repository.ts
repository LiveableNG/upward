export interface PmSignature {
  id?: number
  uuid: string
  pmId: number
  name: string
  type: string                  // 'upload' | 'pad' | 'digital'
  fileKey?: string | null
  content?: string | null
  isDefault: boolean
  createdAt?: Date
  updatedAt?: Date
}

export interface IPmSignatureRepository {
  findById(id: number): Promise<PmSignature | null>
  findByUuid(uuid: string): Promise<PmSignature | null>
  findByPmId(pmId: number): Promise<PmSignature[]>
  findDefaultByPmId(pmId: number): Promise<PmSignature | null>
  save(signature: PmSignature): Promise<PmSignature>
  update(id: number, data: Partial<PmSignature>): Promise<PmSignature>
  delete(id: number): Promise<void>
}

export const PM_SIGNATURE_REPOSITORY = Symbol('PM_SIGNATURE_REPOSITORY')
