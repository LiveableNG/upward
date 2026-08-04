import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Request, UnauthorizedException, BadRequestException } from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import {
  CreateRelayImportJobUseCase,
  GetPmImportJobsUseCase,
  AdminListImportJobsUseCase,
  AdminAssignImportJobUseCase,
  AdminStageImportDataUseCase,
  AdminLogDocumentDownloadUseCase,
  GetRelayDocumentUploadUrlUseCase,
  UploadRelayDocumentUseCase,
  UpdateStagedDataUseCase,
  CompleteImportJobUseCase,
} from '../../../application/use-cases/pm/bulk-import.use-cases'

import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Controller('pm/bulk-imports')
@UseGuards(JwtAuthGuard)
export class PmBulkImportController {
  constructor(
    private readonly createRelayImportJobUseCase: CreateRelayImportJobUseCase,
    private readonly getPmImportJobsUseCase: GetPmImportJobsUseCase,
    private readonly getRelayDocumentUploadUrlUseCase: GetRelayDocumentUploadUrlUseCase,
    private readonly uploadRelayDocumentUseCase: UploadRelayDocumentUseCase,
    private readonly updateStagedDataUseCase: UpdateStagedDataUseCase,
    private readonly completeImportJobUseCase: CompleteImportJobUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Post('relay-upload-url')
  async getRelayUploadUrl(@Body() body: { fileName: string; fileType: string }) {
    return this.getRelayDocumentUploadUrlUseCase.execute(body)
  }

  @Post('relay-upload')
  async uploadRelayDocument(@Body() body: { fileName: string; contentType: string; base64Data: string }) {
    if (!body.base64Data || !body.contentType) {
      throw new BadRequestException('base64Data and contentType are required')
    }
    return this.uploadRelayDocumentUseCase.execute(body)
  }

  @Post('relay')
  async createRelayJob(@Request() req: any, @Body() body: any) {
    const pm = await this.prisma.upward_property_manager.findUnique({ where: { uuid: req.user.id || req.user.sub } })
    if (!pm) throw new UnauthorizedException('PM not found')
    
    return this.createRelayImportJobUseCase.execute({
      pmId: pm.id,
      targetPropertyUuid: body.targetPropertyUuid,
      mode: body.mode || 'full',
      originalFileName: body.originalFileName,
      fileUrl: body.fileUrl,
      fileType: body.fileType,
    })
  }

  @Get()
  async getPmJobs(@Request() req: any) {
    const pm = await this.prisma.upward_property_manager.findUnique({ where: { uuid: req.user.id || req.user.sub } })
    if (!pm) throw new UnauthorizedException('PM not found')
    
    return this.getPmImportJobsUseCase.execute(pm.id)
  }

  @Patch(':uuid/staged-data')
  async updateStagedData(
    @Param('uuid') uuid: string,
    @Request() req: any,
    @Body() body: { stagedRowsJson: string }
  ) {
    const pm = await this.prisma.upward_property_manager.findUnique({ where: { uuid: req.user.id || req.user.sub } })
    if (!pm) throw new UnauthorizedException('PM not found')
    
    return this.updateStagedDataUseCase.execute({
      pmId: pm.id,
      jobUuid: uuid,
      stagedRowsJson: body.stagedRowsJson,
    })
  }

  @Patch(':uuid/complete')
  async completeJob(
    @Param('uuid') uuid: string,
    @Request() req: any,
    @Body() body: { unitsCreated?: number; propertiesCreated?: number }
  ) {
    const pm = await this.prisma.upward_property_manager.findUnique({ where: { uuid: req.user.id || req.user.sub } })
    if (!pm) throw new UnauthorizedException('PM not found')
    
    return this.completeImportJobUseCase.execute({
      pmId: pm.id,
      jobUuid: uuid,
      unitsCreated: body.unitsCreated,
      propertiesCreated: body.propertiesCreated,
    })
  }

  @Delete(':uuid')
  async deleteJob(@Param('uuid') uuid: string, @Request() req: any) {
    const pm = await this.prisma.upward_property_manager.findUnique({ where: { uuid: req.user.id || req.user.sub } })
    if (!pm) throw new UnauthorizedException('PM not found')
    
    // Quick validation to ensure the job belongs to the PM before deleting
    const job = await (this.prisma as any).upward_pm_bulk_import_job.findUnique({
      where: { uuid }
    })
    
    if (!job || job.pmId !== pm.id) {
      throw new UnauthorizedException('Job not found or unauthorized')
    }

    await (this.prisma as any).upward_pm_bulk_import_job.update({
      where: { id: job.id },
      data: { status: 'CANCELLED' }
    })
    
    // Log the cancellation — non-critical, don't let a log failure block the response
    try {
      await (this.prisma as any).upward_pm_bulk_import_log.create({
        data: {
          jobId: job.id,
          action: 'PM_CANCELLED',
          details: 'Property Manager cancelled the request'
        }
      })
    } catch (_) {}
    
    return { success: true }
  }
}

@Controller('admin/bulk-imports')
@UseGuards(JwtAuthGuard)
export class AdminBulkImportController {
  constructor(
    private readonly adminListImportJobsUseCase: AdminListImportJobsUseCase,
    private readonly adminAssignImportJobUseCase: AdminAssignImportJobUseCase,
    private readonly adminStageImportDataUseCase: AdminStageImportDataUseCase,
    private readonly adminLogDocumentDownloadUseCase: AdminLogDocumentDownloadUseCase,
  ) {}

  @Get()
  async listJobs() {
    return this.adminListImportJobsUseCase.execute()
  }

  @Post(':uuid/claim')
  async claimJob(@Param('uuid') uuid: string, @Request() req: any) {
    const adminId = req.user.id || req.user.uuid
    const adminName = `${req.user.firstName || 'Support'} ${req.user.lastName || 'Admin'}`.trim()
    const adminEmail = req.user.email

    return this.adminAssignImportJobUseCase.execute({
      jobUuid: uuid,
      adminId,
      adminName,
      adminEmail,
    })
  }

  @Post(':uuid/log-download')
  async logDownload(@Param('uuid') uuid: string, @Request() req: any) {
    const adminId = req.user.id || req.user.uuid
    const adminEmail = req.user.email

    return this.adminLogDocumentDownloadUseCase.execute({
      jobUuid: uuid,
      adminId,
      adminEmail,
    })
  }

  @Post(':uuid/stage')
  async stageData(@Param('uuid') uuid: string, @Request() req: any, @Body() body: { stagedRowsJson: string }) {
    const adminId = req.user.id || req.user.uuid
    const adminEmail = req.user.email

    return this.adminStageImportDataUseCase.execute({
      jobUuid: uuid,
      adminId,
      adminEmail,
      stagedRowsJson: body.stagedRowsJson,
    })
  }
}
