export const BULK_IMPORT_JOB_REPOSITORY = Symbol('BULK_IMPORT_JOB_REPOSITORY')

export interface IBulkImportJobRepository {
  create(data: {
    pmId: number
    targetPropertyUuid?: string
    mode: string
    originalFileName: string
    fileUrl: string
    fileType: string
  }): Promise<any>

  findById(id: number): Promise<any>
  findByUuid(uuid: string): Promise<any>
  findByPmId(pmId: number): Promise<any[]>
  findAll(): Promise<any[]>

  assignAdmin(jobId: number, adminId: string, adminName: string, adminEmail: string): Promise<any>
  stageData(jobId: number, stagedRowsJson: string): Promise<any>
  updateStagedData(jobId: number, stagedRowsJson: string): Promise<any>
  updateStatus(jobId: number, status: string, counts?: { unitsCreated?: number, propertiesCreated?: number }): Promise<any>

  addLog(data: {
    jobId: number
    adminId?: string
    adminEmail?: string
    action: string
    details?: string
  }): Promise<any>
}

