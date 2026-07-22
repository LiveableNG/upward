import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Request, UnauthorizedException } from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import {
  CreateRelayImportJobUseCase,
  GetPmImportJobsUseCase,
  AdminListImportJobsUseCase,
  AdminAssignImportJobUseCase,
  AdminStageImportDataUseCase,
  AdminLogDocumentDownloadUseCase,
  GetRelayDocumentUploadUrlUseCase,
  UpdateStagedDataUseCase,
} from '../../../application/use-cases/pm/bulk-import.use-cases'

import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Controller('pm/bulk-imports')
@UseGuards(JwtAuthGuard)
export class PmBulkImportController {
  constructor(
    private readonly createRelayImportJobUseCase: CreateRelayImportJobUseCase,
    private readonly getPmImportJobsUseCase: GetPmImportJobsUseCase,
    private readonly getRelayDocumentUploadUrlUseCase: GetRelayDocumentUploadUrlUseCase,
    private readonly updateStagedDataUseCase: UpdateStagedDataUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Post('relay-upload-url')
  async getRelayUploadUrl(@Body() body: { fileName: string; fileType: string }) {
    return this.getRelayDocumentUploadUrlUseCase.execute(body)
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

  @Patch(':id/staged-data')
  async updateStagedData(
    @Param('id') id: string,
    @Request() req: any,
    @Body() body: { stagedRowsJson: string }
  ) {
    const pm = await this.prisma.upward_property_manager.findUnique({ where: { uuid: req.user.id || req.user.sub } })
    if (!pm) throw new UnauthorizedException('PM not found')
    
    return this.updateStagedDataUseCase.execute({
      pmId: pm.id,
      jobId: parseInt(id, 10),
      stagedRowsJson: body.stagedRowsJson,
    })
  }

  @Delete(':id')
  async deleteJob(@Param('id') id: string, @Request() req: any) {
    const pm = await this.prisma.upward_property_manager.findUnique({ where: { uuid: req.user.id || req.user.sub } })
    if (!pm) throw new UnauthorizedException('PM not found')
    
    // Quick validation to ensure the job belongs to the PM before deleting
    const job = await (this.prisma as any).upward_pm_bulk_import_job.findUnique({
      where: { id: parseInt(id, 10) }
    })
    
    if (!job || job.pmId !== pm.id) {
      throw new UnauthorizedException('Job not found or unauthorized')
    }

    await (this.prisma as any).upward_pm_bulk_import_job.delete({
      where: { id: parseInt(id, 10) }
    })
    
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

  @Post(':id/claim')
  async claimJob(@Param('id') id: string, @Request() req: any) {
    const adminId = req.user.id || req.user.uuid
    const adminName = `${req.user.firstName || 'Support'} ${req.user.lastName || 'Admin'}`.trim()
    const adminEmail = req.user.email

    return this.adminAssignImportJobUseCase.execute({
      jobId: parseInt(id, 10),
      adminId,
      adminName,
      adminEmail,
    })
  }

  @Post(':id/log-download')
  async logDownload(@Param('id') id: string, @Request() req: any) {
    const adminId = req.user.id || req.user.uuid
    const adminEmail = req.user.email

    return this.adminLogDocumentDownloadUseCase.execute({
      jobId: parseInt(id, 10),
      adminId,
      adminEmail,
    })
  }

  @Post(':id/stage')
  async stageData(@Param('id') id: string, @Request() req: any, @Body() body: { stagedRowsJson: string }) {
    const adminId = req.user.id || req.user.uuid
    const adminEmail = req.user.email

    return this.adminStageImportDataUseCase.execute({
      jobId: parseInt(id, 10),
      adminId,
      adminEmail,
      stagedRowsJson: body.stagedRowsJson,
    })
  }
}
