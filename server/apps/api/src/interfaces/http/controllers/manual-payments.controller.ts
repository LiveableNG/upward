import { Controller, Post, Body, Patch, Param, UseGuards, Req, Logger, Get, Delete, Query, Res, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common'
import {
  AddManualAccountUseCase,
  GetManualAccountsUseCase,
  DeleteManualAccountUseCase,
  LinkPropertiesToAccountUseCase,
  UploadProofOfPaymentUseCase,
  ReviewManualPaymentUseCase,
  GetPaymentProofUploadUrlUseCase,
  GetPaymentProofUseCase,
  DeletePaymentProofUseCase,
} from '../../../application/use-cases/payments/manual-payment.use-cases'
import { GetPendingManualPaymentsUseCase } from '../../../application/use-cases/payments/get-pending-manual-payments.use-case'
import { Response } from 'express'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Controller('payments/manual')
@UseGuards(JwtAuthGuard)
export class ManualPaymentsController {
  private readonly logger = new Logger(ManualPaymentsController.name)

  constructor(
    private readonly addAccountUseCase: AddManualAccountUseCase,
    private readonly getAccountsUseCase: GetManualAccountsUseCase,
    private readonly deleteAccountUseCase: DeleteManualAccountUseCase,
    private readonly linkPropertiesUseCase: LinkPropertiesToAccountUseCase,
    private readonly uploadProofUseCase: UploadProofOfPaymentUseCase,
    private readonly reviewProofUseCase: ReviewManualPaymentUseCase,
    private readonly getUploadUrlUseCase: GetPaymentProofUploadUrlUseCase,
    private readonly getProofUseCase: GetPaymentProofUseCase,
    private readonly deleteProofUseCase: DeletePaymentProofUseCase,
    private readonly getPendingManualPaymentsUseCase: GetPendingManualPaymentsUseCase,
    private readonly prisma: PrismaService,
  ) {}

  @Get('accounts')
  async getManualAccounts(@Req() req: any) {
    return this.getAccountsUseCase.execute(req.user.id)
  }

  @Post('accounts')
  async addManualSettlementAccount(@Req() req: any, @Body() body: any) {
    return this.addAccountUseCase.execute({
      accountNumber: body.accountNumber,
      accountName: body.accountName,
      bankName: body.bankName,
      bankCode: body.bankCode,
      pmUuid: req.user.id,
      isPrimary: body.isPrimary,
    })
  }

  @Delete('accounts/:id')
  async deleteManualSettlementAccount(@Req() req: any, @Param('id') id: string) {
    return this.deleteAccountUseCase.execute(Number(id), req.user.id)
  }

  @Post('accounts/:id/link')
  async linkProperties(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    return this.linkPropertiesUseCase.execute({
      accountId: Number(id),
      propertyUuids: body.propertyUuids || [],
      pmUuid: req.user.id,
    })
  }

  @Post('account')
  async addManualAccount(@Req() req: any, @Body() body: any) {
    // Legacy endpoint support (used by ManualAccountModal in property detail pages)
    const pmUuid = req.user.id
    
    const account = await this.addAccountUseCase.execute({
      accountNumber: body.accountNumber,
      accountName: body.accountName,
      bankName: body.bankName,
      bankCode: body.bankCode,
      pmUuid,
    })

    const propertyId = req.user.role === 'PM' ? body.propertyId : undefined
    if (propertyId) {
      const prop = await this.prisma.upward_pm_property.findUnique({
        where: { id: Number(propertyId) }
      })
      if (prop) {
        await this.linkPropertiesUseCase.execute({
          accountId: account.id,
          propertyUuids: [prop.uuid],
          pmUuid,
        })
      }
    }

    return account
  }

  @Get('proof')
  async getPendingProofs(@Req() req: any) {
    if (req.user.role !== 'PM' && !['SUPERADMIN', 'CUSTOMER_SUPPORT', 'DEVELOPER'].includes(req.user.role)) {
      throw new Error('Unauthorized')
    }
    return this.getPendingManualPaymentsUseCase.execute({ pmUuid: req.user.id })
  }

  @Get('proof/upload-url')
  async getUploadUrl(@Req() req: any, @Query('fileName') fileName: string, @Query('fileType') fileType: string, @Query('fileSize') fileSize: string) {
    return this.getUploadUrlUseCase.execute({
      userId: req.user.id,
      fileName,
      fileType,
      fileSize: fileSize ? Number(fileSize) : undefined,
    })
  }

  @Post('proof')
  @HttpCode(HttpStatus.CREATED)
  async uploadProofOfPayment(@Req() req: any) {
    if (!req.isMultipart || !req.isMultipart()) {
      throw new BadRequestException('Request must be multipart/form-data')
    }

    const data = await req.file()
    if (!data) {
      throw new BadRequestException('No file uploaded')
    }

    const buffer = await data.toBuffer()
    const fields = data.fields as any
    console.log('--- UPLOAD FIELDS ---', fields)

    const paymentRequestUuid = fields?.paymentRequestId?.value ? String(fields.paymentRequestId.value) : undefined
    const userPropertyUuid = fields?.userPropertyId?.value ? String(fields.userPropertyId.value) : undefined
    const amount = fields?.amount?.value ? Number(fields.amount.value) : undefined
    const currency = fields?.currency?.value ? String(fields.currency.value) : undefined
    const fileName = fields?.fileName?.value ? String(fields.fileName.value) : data.filename
    let lineItems = undefined
    if (fields?.lineItems?.value) {
      try {
        lineItems = JSON.parse(fields.lineItems.value)
      } catch (e) {}
    }

    return this.uploadProofUseCase.execute({
      paymentRequestUuid,
      userPropertyUuid,
      amount,
      currency,
      lineItems,
      fileBuffer: buffer,
      fileType: data.mimetype,
      fileSize: buffer.length,
      fileName,
      userUuid: String(req.user.id),
    })
  }

  @Post('proof/manual')
  @HttpCode(HttpStatus.CREATED)
  async uploadManualProof(@Req() req: any, @Body() body: any) {
    const { paymentRequestUuid, userPropertyUuid, amount, currency, lineItems, senderName, paymentDate, referenceNumber } = body

    return this.uploadProofUseCase.execute({
      paymentRequestUuid,
      userPropertyUuid,
      amount,
      currency,
      lineItems,
      senderName,
      paymentDate: paymentDate ? new Date(paymentDate) : undefined,
      referenceNumber,
      userUuid: String(req.user.id),
    })
  }

  @Get('proof/:id')
  async getProof(@Param('id') id: string, @Res({ passthrough: true }) res: any) {
    const { buffer, fileName, fileType } = await this.getProofUseCase.execute(Number(id))
    return S3Service.streamBuffer(buffer, fileName || 'proof.pdf', res, {
      contentType: fileType,
    })
  }

  @Delete('proof/:id')
  async deleteProof(@Req() req: any, @Param('id') id: string) {
    return this.deleteProofUseCase.execute(Number(id), req.user.id)
  }

  @Patch('proof/:id/review')
  async reviewProof(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    if (req.user.role !== 'PM' && !['SUPERADMIN', 'CUSTOMER_SUPPORT', 'DEVELOPER'].includes(req.user.role)) {
      throw new Error('Unauthorized')
    }
    
    return this.reviewProofUseCase.execute({
      proofId: Number(id),
      pmUuid: req.user.id,
      status: body.status, // 'APPROVED' | 'REJECTED'
      remarks: body.remarks,
    })
  }
}
