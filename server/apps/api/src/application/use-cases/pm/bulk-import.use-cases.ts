import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { IBulkImportJobRepository, BULK_IMPORT_JOB_REPOSITORY } from '../../../domains/pm/IBulkImportJobRepository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { randomUUID } from 'crypto'

@Injectable()
export class CreateRelayImportJobUseCase {
  constructor(
    @Inject(BULK_IMPORT_JOB_REPOSITORY)
    private readonly bulkImportJobRepo: IBulkImportJobRepository,
  ) {}

  async execute(dto: {
    pmId: number
    targetPropertyUuid?: string
    mode: string
    originalFileName: string
    fileUrl: string
    fileType: string
  }) {
    return this.bulkImportJobRepo.create(dto)
  }
}

@Injectable()
export class GetRelayDocumentUploadUrlUseCase {
  constructor(private readonly s3Service: S3Service) {}

  async execute(dto: { fileName: string; fileType: string }) {
    const ext = dto.fileName.split('.').pop()?.toLowerCase() || 'bin'
    const key = `relays/${randomUUID()}.${ext}`
    const uploadUrl = await this.s3Service.getUploadUrl(key, dto.fileType)
    // We return fileKey to be stored in the DB so it can be safely proxied for public download
    return { uploadUrl, fileKey: key }
  }
}

@Injectable()
export class UpdateStagedDataUseCase {
  constructor(
    @Inject(BULK_IMPORT_JOB_REPOSITORY)
    private readonly bulkImportJobRepo: IBulkImportJobRepository,
  ) {}

  async execute(dto: { pmId: number; jobId: number; stagedRowsJson: string }) {
    const job = await this.bulkImportJobRepo.findById(dto.jobId)
    if (!job || job.pmId !== dto.pmId) {
      throw new NotFoundException('Job not found or unauthorized')
    }

    await this.bulkImportJobRepo.updateStagedData(dto.jobId, dto.stagedRowsJson)
    
    await this.bulkImportJobRepo.addLog({
      jobId: dto.jobId,
      action: 'PM_SAVED_DRAFT',
      details: 'Property Manager saved a draft of the staged data',
    })

    return { success: true }
  }
}

@Injectable()
export class GetPmImportJobsUseCase {
  constructor(
    @Inject(BULK_IMPORT_JOB_REPOSITORY)
    private readonly bulkImportJobRepo: IBulkImportJobRepository,
  ) {}

  async execute(pmId: number) {
    return this.bulkImportJobRepo.findByPmId(pmId)
  }
}

@Injectable()
export class AdminListImportJobsUseCase {
  constructor(
    @Inject(BULK_IMPORT_JOB_REPOSITORY)
    private readonly bulkImportJobRepo: IBulkImportJobRepository,
    private readonly encryptionService: EncryptionService,
  ) {}

  async execute() {
    const jobs = await this.bulkImportJobRepo.findAll()
    
    // Decrypt PM details for admin display
    return jobs.map(job => {
      if (job.pm) {
        return {
          ...job,
          pm: {
            ...job.pm,
            firstName: this.encryptionService.decrypt(job.pm.firstName),
            lastName: this.encryptionService.decrypt(job.pm.lastName),
            email: this.encryptionService.decrypt(job.pm.email),
            phone: job.pm.phone ? this.encryptionService.decrypt(job.pm.phone) : job.pm.phone,
            businessName: job.pm.businessName ? this.encryptionService.decrypt(job.pm.businessName) : job.pm.businessName,
          }
        }
      }
      return job
    })
  }
}

@Injectable()
export class AdminAssignImportJobUseCase {
  constructor(
    @Inject(BULK_IMPORT_JOB_REPOSITORY)
    private readonly bulkImportJobRepo: IBulkImportJobRepository,
  ) {}

  async execute(dto: { jobId: number; adminId: string; adminName: string; adminEmail: string }) {
    const job = await this.bulkImportJobRepo.findById(dto.jobId)
    if (!job) throw new NotFoundException('Import job not found')

    const updated = await this.bulkImportJobRepo.assignAdmin(
      dto.jobId,
      dto.adminId,
      dto.adminName,
      dto.adminEmail
    )

    await this.bulkImportJobRepo.addLog({
      jobId: dto.jobId,
      adminId: dto.adminId,
      adminEmail: dto.adminEmail,
      action: 'CLAIMED_TASK',
      details: `Admin ${dto.adminName} (${dto.adminEmail}) claimed task`,
    })

    return updated
  }
}

@Injectable()
export class AdminStageImportDataUseCase {
  constructor(
    @Inject(BULK_IMPORT_JOB_REPOSITORY)
    private readonly bulkImportJobRepo: IBulkImportJobRepository,
  ) {}

  async execute(dto: { jobId: number; adminId: string; adminEmail: string; stagedRowsJson: string }) {
    const job = await this.bulkImportJobRepo.findById(dto.jobId)
    if (!job) throw new NotFoundException('Import job not found')

    const updated = await this.bulkImportJobRepo.stageData(dto.jobId, dto.stagedRowsJson)

    await this.bulkImportJobRepo.addLog({
      jobId: dto.jobId,
      adminId: dto.adminId,
      adminEmail: dto.adminEmail,
      action: 'STAGED_DATA',
      details: `Staged preview data rows for property manager review`,
    })

    return updated
  }
}

@Injectable()
export class AdminLogDocumentDownloadUseCase {
  constructor(
    @Inject(BULK_IMPORT_JOB_REPOSITORY)
    private readonly bulkImportJobRepo: IBulkImportJobRepository,
  ) {}

  async execute(dto: { jobId: number; adminId: string; adminEmail: string }) {
    return this.bulkImportJobRepo.addLog({
      jobId: dto.jobId,
      adminId: dto.adminId,
      adminEmail: dto.adminEmail,
      action: 'DOWNLOADED_DOCUMENT',
      details: `Downloaded original file for processing`,
    })
  }
}
