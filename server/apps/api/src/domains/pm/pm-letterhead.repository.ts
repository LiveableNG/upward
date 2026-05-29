export interface PmLetterhead {
  id?: number
  uuid: string
  pmId: number
  isDefault: boolean
  pageCount: number
  templateFileKey: string | null
  previewFirstPageKey: string | null
  previewContinuationPageKey: string | null
  templateConfig: any | null
  createdAt: Date
  updatedAt: Date
}

export interface IPmLetterheadRepository {
  findById(id: number): Promise<PmLetterhead | null>
  findByUuid(uuid: string): Promise<PmLetterhead | null>
  findByPmId(pmId: number): Promise<PmLetterhead[]>
  findDefaultByPmId(pmId: number): Promise<PmLetterhead | null>
  save(letterhead: PmLetterhead): Promise<PmLetterhead>
  update(id: number, data: Partial<PmLetterhead>): Promise<PmLetterhead>
  delete(id: number): Promise<void>
}

export const PM_LETTERHEAD_REPOSITORY = Symbol('PM_LETTERHEAD_REPOSITORY')
