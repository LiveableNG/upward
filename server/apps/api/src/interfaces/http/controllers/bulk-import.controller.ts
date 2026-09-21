import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, BadRequestException, Request } from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { CurrentPmId } from '../../../application/auth/decorators/current-pm-actor.decorator'
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
  CancelBulkImportJobUseCase,
} from '../../../application/use-cases/pm/bulk-import.use-cases'

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
    private readonly cancelBulkImportJobUseCase: CancelBulkImportJobUseCase,
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
  async createRelayJob(@CurrentPmId() pmId: number, @Body() body: any) {
    return this.createRelayImportJobUseCase.execute({
      pmId,
      targetPropertyUuid: body.targetPropertyUuid,
      mode: body.mode || 'full',
      originalFileName: body.originalFileName,
      fileUrl: body.fileUrl,
      fileType: body.fileType,
    })
  }

  @Get()
  async getPmJobs(@CurrentPmId() pmId: number) {
    return this.getPmImportJobsUseCase.execute(pmId)
  }

  @Patch(':uuid/staged-data')
  async updateStagedData(
    @Param('uuid') uuid: string,
    @CurrentPmId() pmId: number,
    @Body() body: { stagedRowsJson: string },
  ) {
    return this.updateStagedDataUseCase.execute({
      pmId,
      jobUuid: uuid,
      stagedRowsJson: body.stagedRowsJson,
    })
  }

  @Patch(':uuid/complete')
  async completeJob(
    @Param('uuid') uuid: string,
    @CurrentPmId() pmId: number,
    @Body() body: { unitsCreated?: number; propertiesCreated?: number },
  ) {
    return this.completeImportJobUseCase.execute({
      pmId,
      jobUuid: uuid,
      unitsCreated: body.unitsCreated,
      propertiesCreated: body.propertiesCreated,
    })
  }

  @Delete(':uuid')
  async deleteJob(@Param('uuid') uuid: string, @CurrentPmId() pmId: number) {
    return this.cancelBulkImportJobUseCase.execute(pmId, uuid)
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
