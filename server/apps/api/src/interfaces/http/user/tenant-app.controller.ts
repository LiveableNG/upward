import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { AuthenticatedRequest } from '../../../application/auth/interfaces/authenticated-request.interface'
import { ProxyTenantAppReadUseCase } from '../../../application/use-cases/tenant-app/proxy-tenant-app-read.use-case'

/**
 * Tenant-facing My Home reads. Resolves propertyUuid → externalUnitId server-side
 * and proxies to GT's integration/tenant-app bridge. Bodies pass through unchanged.
 */
@Controller('tenant-app')
@UseGuards(JwtAuthGuard)
export class TenantAppController {
  constructor(private readonly proxyTenantAppRead: ProxyTenantAppReadUseCase) {}

  private proxy(
    req: AuthenticatedRequest,
    propertyUuid: string,
    path: string,
    query: Record<string, string | undefined> = {},
  ) {
    return this.proxyTenantAppRead.execute(req.user.id, propertyUuid, path, query)
  }

  @Get('complaints')
  listComplaints(
    @Req() req: AuthenticatedRequest,
    @Query('propertyUuid') propertyUuid: string,
    @Query('page') page?: string,
    @Query('status') status?: string,
  ) {
    return this.proxy(req, propertyUuid, 'complaints', { page, status })
  }

  @Get('complaints/:complaintId')
  showComplaint(
    @Req() req: AuthenticatedRequest,
    @Param('complaintId') complaintId: string,
    @Query('propertyUuid') propertyUuid: string,
  ) {
    return this.proxy(req, propertyUuid, `complaints/${complaintId}`)
  }

  @Post('complaints')
  createComplaint(
    @Req() req: AuthenticatedRequest,
    @Query('propertyUuid') propertyUuid: string,
    @Body() body: { category: string; details: string; file_ids?: string[] },
  ) {
    return this.proxyTenantAppRead.executeWrite(
      req.user.id,
      propertyUuid,
      'complaints',
      body,
    )
  }

  @Post('complaints/:complaintId/dispute')
  disputeComplaint(
    @Req() req: AuthenticatedRequest,
    @Param('complaintId') complaintId: string,
    @Query('propertyUuid') propertyUuid: string,
    @Body()
    body: {
      reason: string
      preferredResolution: string
      impact?: string
      file_ids?: string[]
    },
  ) {
    return this.proxyTenantAppRead.executeWrite(
      req.user.id,
      propertyUuid,
      `complaints/${complaintId}/dispute`,
      body,
    )
  }

  @Post('complaints/:complaintId/feedback')
  submitComplaintFeedback(
    @Req() req: AuthenticatedRequest,
    @Param('complaintId') complaintId: string,
    @Query('propertyUuid') propertyUuid: string,
    @Body() body: { feedback: Array<{ question: string; answer?: string }> },
  ) {
    return this.proxyTenantAppRead.executeWrite(
      req.user.id,
      propertyUuid,
      `complaints/${complaintId}/feedback`,
      body,
    )
  }

  @Post('files')
  async uploadFile(
    @Req() req: AuthenticatedRequest,
    @Query('propertyUuid') propertyUuid: string,
  ) {
    const multipartReq = req as AuthenticatedRequest & {
      isMultipart?: () => boolean
      file: () => Promise<{
        filename: string
        mimetype: string
        toBuffer: () => Promise<Buffer>
        fields?: Record<string, { value?: unknown }>
      } | undefined>
    }

    if (!multipartReq.isMultipart || !multipartReq.isMultipart()) {
      throw new BadRequestException('Request must be multipart/form-data')
    }

    const data = await multipartReq.file()
    if (!data) {
      throw new BadRequestException('No file uploaded')
    }

    const buffer = await data.toBuffer()
    const fields = data.fields
    const fileType = fields?.file_type?.value
      ? String(fields.file_type.value)
      : data.mimetype?.split('/')[0] || 'image'
    const caption = fields?.caption?.value
      ? String(fields.caption.value)
      : data.filename

    return this.proxyTenantAppRead.executeUpload(req.user.id, propertyUuid, {
      buffer,
      filename: data.filename,
      mimeType: data.mimetype,
      fileType: fileType.toLowerCase(),
      caption,
    })
  }

  @Get('transactions')
  listTransactions(
    @Req() req: AuthenticatedRequest,
    @Query('propertyUuid') propertyUuid: string,
    @Query('page') page?: string,
  ) {
    return this.proxy(req, propertyUuid, 'transactions', { page })
  }

  @Get('transactions/pending')
  listPendingTransactions(
    @Req() req: AuthenticatedRequest,
    @Query('propertyUuid') propertyUuid: string,
  ) {
    return this.proxy(req, propertyUuid, 'transactions/pending')
  }

  @Get('transactions/pending/:id')
  showPendingTransaction(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Query('propertyUuid') propertyUuid: string,
  ) {
    return this.proxy(req, propertyUuid, `transactions/pending/${id}`)
  }

  @Get('transactions/check-status')
  checkTransactionStatus(
    @Req() req: AuthenticatedRequest,
    @Query('propertyUuid') propertyUuid: string,
    @Query('deposit_id') depositId?: string,
    @Query('topup_request_id') topupRequestId?: string,
  ) {
    return this.proxy(req, propertyUuid, 'transactions/check-status', {
      deposit_id: depositId,
      topup_request_id: topupRequestId,
    })
  }

  @Get('visitors/active')
  listActiveVisitors(
    @Req() req: AuthenticatedRequest,
    @Query('propertyUuid') propertyUuid: string,
  ) {
    return this.proxy(req, propertyUuid, 'visitors/active')
  }

  @Get('visitors/history')
  listVisitorHistory(
    @Req() req: AuthenticatedRequest,
    @Query('propertyUuid') propertyUuid: string,
    @Query('page') page?: string,
  ) {
    return this.proxy(req, propertyUuid, 'visitors/history', { page })
  }

  @Get('visitors/search-list')
  searchVisitors(
    @Req() req: AuthenticatedRequest,
    @Query('propertyUuid') propertyUuid: string,
    @Query('search') search?: string,
  ) {
    return this.proxy(req, propertyUuid, 'visitors/search-list', { search })
  }

  @Post('visitors/generate')
  generateVisitor(
    @Req() req: AuthenticatedRequest,
    @Query('propertyUuid') propertyUuid: string,
    @Body()
    body: {
      name: string
      phone: string
      visitorType: string
      duration: number
      numberOfVisitors: number
      notes?: string
    },
  ) {
    return this.proxyTenantAppRead.executeWrite(
      req.user.id,
      propertyUuid,
      'visitors/generate',
      body,
    )
  }

  @Post('visitors/:accessId/extend')
  extendVisitor(
    @Req() req: AuthenticatedRequest,
    @Param('accessId') accessId: string,
    @Query('propertyUuid') propertyUuid: string,
    @Body() body: { duration: number },
  ) {
    return this.proxyTenantAppRead.executeWrite(
      req.user.id,
      propertyUuid,
      `visitors/${accessId}/extend`,
      body,
    )
  }

  @Delete('visitors/:accessId')
  revokeVisitor(
    @Req() req: AuthenticatedRequest,
    @Param('accessId') accessId: string,
    @Query('propertyUuid') propertyUuid: string,
  ) {
    return this.proxyTenantAppRead.executeDelete(
      req.user.id,
      propertyUuid,
      `visitors/${accessId}`,
    )
  }

  @Get('documents')
  listDocuments(
    @Req() req: AuthenticatedRequest,
    @Query('propertyUuid') propertyUuid: string,
    @Query('page') page?: string,
  ) {
    return this.proxy(req, propertyUuid, 'documents', { page })
  }

  @Patch('documents/:documentId/view')
  viewDocument(
    @Req() req: AuthenticatedRequest,
    @Param('documentId') documentId: string,
    @Query('propertyUuid') propertyUuid: string,
  ) {
    return this.proxyTenantAppRead.executePatch(
      req.user.id,
      propertyUuid,
      `documents/${documentId}/view`,
    )
  }

  @Patch('documents/:documentId/download')
  downloadDocument(
    @Req() req: AuthenticatedRequest,
    @Param('documentId') documentId: string,
    @Query('propertyUuid') propertyUuid: string,
  ) {
    return this.proxyTenantAppRead.executePatch(
      req.user.id,
      propertyUuid,
      `documents/${documentId}/download`,
    )
  }

  @Get('co-tenants')
  listCoTenants(
    @Req() req: AuthenticatedRequest,
    @Query('propertyUuid') propertyUuid: string,
  ) {
    return this.proxy(req, propertyUuid, 'co-tenants')
  }

  @Get('inspection/last-result')
  lastInspectionResult(
    @Req() req: AuthenticatedRequest,
    @Query('propertyUuid') propertyUuid: string,
  ) {
    return this.proxy(req, propertyUuid, 'inspection/last-result')
  }
}
