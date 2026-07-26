import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common'
import { EventEmitter2 } from '@nestjs/event-emitter'
import { IBulkImportJobRepository, BULK_IMPORT_JOB_REPOSITORY } from '../../../domains/pm/IBulkImportJobRepository'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { randomUUID } from 'crypto'
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service'

@Injectable()
export class CreateRelayImportJobUseCase {
  constructor(
    @Inject(BULK_IMPORT_JOB_REPOSITORY)
    private readonly bulkImportJobRepo: IBulkImportJobRepository,
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) {}

  async execute(dto: {
    pmId: number
    targetPropertyUuid?: string
    mode: string
    originalFileName: string
    fileUrl: string
    fileType: string
  }) {
    const job = await this.bulkImportJobRepo.create(dto)
    
    this.unifiedCommService.processCommunication({
      recipientEmail: 'admin@goodtenants.io',
      recipientName: 'System Admin',
      recipientRole: 'ADMIN',
      type: 'SYSTEM_ALERT',
      title: 'New Assisted Upload Request',
      context: {
        message: `A new assisted upload request was created for file: ${dto.originalFileName}. Please check the Admin Queue to claim and process this task.`
      }
    }).catch(e => console.error('Failed to notify admins of relay job', e))

    return job
  }
}

@Injectable()
export class GetRelayDocumentUploadUrlUseCase {
  constructor(private readonly s3Service: S3Service) {}

  async execute(dto: { fileName: string; fileType: string }) {
    const ext = dto.fileName.split('.').pop()?.toLowerCase() || 'bin'
    const key = `relays/${randomUUID()}.${ext}`
    const uploadUrl = await this.s3Service.getUploadUrl(key, dto.fileType)
    return { uploadUrl, fileKey: key }
  }
}

@Injectable()
export class UploadRelayDocumentUseCase {
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

  constructor(private readonly s3Service: S3Service) {}

  async execute(dto: { fileName: string; contentType: string; base64Data: string }) {
    const buffer = Buffer.from(dto.base64Data, 'base64')
    if (buffer.length > this.MAX_FILE_SIZE) {
      throw new BadRequestException('File is too large. Max 10MB.')
    }

    const ext = dto.fileName.split('.').pop()?.toLowerCase() || 'bin'
    const key = `relays/${randomUUID()}.${ext}`

    await this.s3Service.uploadBuffer(buffer, key, dto.contentType)

    return { fileKey: key }
  }
}

@Injectable()
export class UpdateStagedDataUseCase {
  constructor(
    @Inject(BULK_IMPORT_JOB_REPOSITORY)
    private readonly bulkImportJobRepo: IBulkImportJobRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: { pmId: number; jobUuid: string; stagedRowsJson: string }) {
    const job = await this.bulkImportJobRepo.findByUuid(dto.jobUuid)
    if (!job || job.pmId !== dto.pmId) {
      throw new NotFoundException('Job not found or unauthorized')
    }

    await this.bulkImportJobRepo.updateStagedData(job.id, dto.stagedRowsJson)
    
    await this.bulkImportJobRepo.addLog({
      jobId: job.id,
      action: 'PM_SAVED_DRAFT',
      details: 'Property Manager saved a draft of the staged data',
    })

    this.eventEmitter.emit('pm.bulk_import.updated', { pmId: dto.pmId, jobId: job.id })

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
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async execute(dto: { jobUuid: string; adminId: string; adminName: string; adminEmail: string }) {
    const job = await this.bulkImportJobRepo.findByUuid(dto.jobUuid)
    if (!job) throw new NotFoundException('Import job not found')

    const updated = await this.bulkImportJobRepo.assignAdmin(
      job.id,
      dto.adminId,
      dto.adminName,
      dto.adminEmail
    )

    await this.bulkImportJobRepo.addLog({
      jobId: job.id,
      adminId: dto.adminId,
      adminEmail: dto.adminEmail,
      action: 'CLAIMED_TASK',
      details: `Admin ${dto.adminName} (${dto.adminEmail}) claimed task`,
    })

    this.eventEmitter.emit('pm.bulk_import.updated', { pmId: job.pmId, jobId: job.id })

    return updated
  }
}

@Injectable()
export class AdminStageImportDataUseCase {
  constructor(
    @Inject(BULK_IMPORT_JOB_REPOSITORY)
    private readonly bulkImportJobRepo: IBulkImportJobRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly unifiedCommService: UnifiedCommunicationService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async execute(dto: { jobUuid: string; adminId: string; adminEmail: string; stagedRowsJson: string }) {
    const job = await this.bulkImportJobRepo.findByUuid(dto.jobUuid)
    if (!job) throw new NotFoundException('Import job not found')

    const updated = await this.bulkImportJobRepo.stageData(job.id, dto.stagedRowsJson)

    await this.bulkImportJobRepo.addLog({
      jobId: job.id,
      adminId: dto.adminId,
      adminEmail: dto.adminEmail,
      action: 'STAGED_DATA',
      details: `Staged preview data rows for property manager review`,
    })

    this.eventEmitter.emit('pm.bulk_import.updated', { pmId: job.pmId, jobId: job.id })

    if (job.pm?.email) {
      const pmEmail = job.pm.email.includes(':') ? this.encryptionService.decrypt(job.pm.email) : job.pm.email;
      const pmFirstName = job.pm.firstName ? this.encryptionService.decrypt(job.pm.firstName) : '';
      const pmLastName = job.pm.lastName ? this.encryptionService.decrypt(job.pm.lastName) : '';
      const pmName = `${pmFirstName} ${pmLastName}`.trim() || 'Property Manager';

      this.unifiedCommService.processCommunication({
        recipientEmail: pmEmail,
        recipientName: pmName,
        recipientRole: 'PM',
        pmUuid: job.pm.uuid,
        type: 'ASSISTED_UPLOAD_REVIEW',
        context: {
          pmName,
          fileName: job.originalFileName,
        }
      }).catch(e => console.error('Failed to notify PM of staged data', e))
    }

    return updated
  }
}

@Injectable()
export class AdminLogDocumentDownloadUseCase {
  constructor(
    @Inject(BULK_IMPORT_JOB_REPOSITORY)
    private readonly bulkImportJobRepo: IBulkImportJobRepository,
    private readonly s3Service: S3Service,
  ) {}

  async execute(dto: { jobUuid: string; adminId: string; adminEmail: string }) {
    const job = await this.bulkImportJobRepo.findByUuid(dto.jobUuid)
    if (!job) throw new NotFoundException('Import job not found')

    await this.bulkImportJobRepo.addLog({
      jobId: job.id,
      adminId: dto.adminId,
      adminEmail: dto.adminEmail,
      action: 'DOWNLOADED_DOCUMENT',
      details: `Downloaded original file for processing`,
    })

    const downloadUrl = await this.s3Service.getDownloadUrl(job.fileUrl)
    return { success: true, downloadUrl }
  }
}

@Injectable()
export class CompleteImportJobUseCase {
  constructor(
    @Inject(BULK_IMPORT_JOB_REPOSITORY)
    private readonly bulkImportJobRepo: IBulkImportJobRepository,
    private readonly eventEmitter: EventEmitter2,
    private readonly unifiedCommService: UnifiedCommunicationService,
    private readonly encryptionService: EncryptionService,
  ) {}

  async execute(dto: { pmId: number; jobUuid: string; unitsCreated?: number; propertiesCreated?: number }) {
    const job = await this.bulkImportJobRepo.findByUuid(dto.jobUuid)
    if (!job || job.pmId !== dto.pmId) {
      throw new NotFoundException('Import job not found or unauthorized')
    }

    const updated = await this.bulkImportJobRepo.updateStatus(job.id, 'COMPLETED', {
      unitsCreated: dto.unitsCreated,
      propertiesCreated: dto.propertiesCreated
    })

    await this.bulkImportJobRepo.addLog({
      jobId: job.id,
      action: 'PM_APPROVED',
      details: `Property Manager approved and finalized the imported data (${dto.unitsCreated || 0} units)`,
    })

    this.eventEmitter.emit('pm.bulk_import.updated', { pmId: dto.pmId, jobId: job.id })

    if (job.assignedAdminEmail) {
      const adminEmail = job.assignedAdminEmail.includes(':') ? this.encryptionService.decrypt(job.assignedAdminEmail) : job.assignedAdminEmail;
      
      this.unifiedCommService.processCommunication({
        recipientEmail: adminEmail,
        recipientName: job.assignedAdminName || 'Admin',
        recipientRole: 'ADMIN',
        type: 'SYSTEM_ALERT',
        title: 'Assisted Upload Approved',
        context: {
          message: `The PM has approved and completed the import for file ${job.originalFileName}. The job is now marked as Completed.`
        }
      }).catch(e => console.error('Failed to notify admin of completed job', e))
    }

    return updated
  }
}
