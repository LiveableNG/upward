import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../shared/infrastructure/prisma/prisma.service'
import { IBulkImportJobRepository } from '../../domains/pm/IBulkImportJobRepository'

@Injectable()
export class PrismaBulkImportJobRepository implements IBulkImportJobRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    pmId: number
    targetPropertyUuid?: string
    mode: string
    originalFileName: string
    fileUrl: string
    fileType: string
  }) {
    return (this.prisma as any).upward_pm_bulk_import_job.create({
      data: {
        pmId: data.pmId,
        targetPropertyUuid: data.targetPropertyUuid,
        mode: data.mode || 'full',
        originalFileName: data.originalFileName,
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        status: 'PENDING_ASSIGNMENT',
      },
    })
  }

  async findById(id: number) {
    return (this.prisma as any).upward_pm_bulk_import_job.findUnique({
      where: { id },
      include: { logs: true, pm: true, assignedAdmin: true },
    })
  }

  async findByUuid(uuid: string) {
    return (this.prisma as any).upward_pm_bulk_import_job.findUnique({
      where: { uuid },
      include: { logs: true, pm: true, assignedAdmin: true },
    })
  }

  async findByPmId(pmId: number) {
    return (this.prisma as any).upward_pm_bulk_import_job.findMany({
      where: { 
        pmId,
        status: { notIn: ['COMPLETED', 'CANCELLED'] }
      },
      orderBy: { createdAt: 'desc' },
      include: { logs: true },
    })
  }

  async findAll() {
    return (this.prisma as any).upward_pm_bulk_import_job.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        pm: {
          select: { id: true, firstName: true, lastName: true, email: true, businessName: true, phone: true }
        },
        logs: { orderBy: { createdAt: 'desc' } }
      },
    })
  }

  async assignAdmin(jobId: number, adminId: string, adminName: string, adminEmail: string) {
    return (this.prisma as any).upward_pm_bulk_import_job.update({
      where: { id: jobId },
      data: {
        assignedAdminId: adminId,
        assignedAdminName: adminName,
        assignedAdminEmail: adminEmail,
        status: 'IN_PROGRESS',
      },
    })
  }


  async stageData(jobId: number, stagedRowsJson: string) {
    return (this.prisma as any).upward_pm_bulk_import_job.update({
      where: { id: jobId },
      data: {
        stagedRowsJson,
        status: 'STAGED_FOR_REVIEW',
      },
    })
  }

  async updateStagedData(jobId: number, stagedRowsJson: string) {
    return (this.prisma as any).upward_pm_bulk_import_job.update({
      where: { id: jobId },
      data: { stagedRowsJson },
    })
  }

  async updateStatus(jobId: number, status: string, counts?: { unitsCreated?: number, propertiesCreated?: number }) {
    return (this.prisma as any).upward_pm_bulk_import_job.update({
      where: { id: jobId },
      data: {
        status,
        ...(counts?.unitsCreated !== undefined && { unitsCreated: counts.unitsCreated }),
        ...(counts?.propertiesCreated !== undefined && { propertiesCreated: counts.propertiesCreated }),
      },
    })
  }

  async addLog(data: { jobId: number; adminId?: string; adminEmail?: string; action: string; details?: string }) {
    return (this.prisma as any).upward_pm_bulk_import_log.create({
      data: {
        jobId: data.jobId,
        adminId: data.adminId,
        adminEmail: data.adminEmail,
        action: data.action,
        details: data.details,
      },
    })
  }
}

