import { Controller, Post, Body, Patch, Param, UseGuards, Req, Logger, Get, Delete, Query, Res, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common'
import { AddManualAccountUseCase, UploadProofOfPaymentUseCase, ReviewManualPaymentUseCase, GetPaymentProofUploadUrlUseCase, GetPaymentProofUseCase, DeletePaymentProofUseCase } from '../../../application/use-cases/payments/manual-payment.use-cases'
import { GetPendingManualPaymentsUseCase } from '../../../application/use-cases/payments/get-pending-manual-payments.use-case'
import { Response } from 'express'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'

@Controller('payments/manual')
@UseGuards(JwtAuthGuard)
export class ManualPaymentsController {
  private readonly logger = new Logger(ManualPaymentsController.name)

  constructor(
    private readonly addAccountUseCase: AddManualAccountUseCase,
    private readonly uploadProofUseCase: UploadProofOfPaymentUseCase,
    private readonly reviewProofUseCase: ReviewManualPaymentUseCase,
    private readonly getUploadUrlUseCase: GetPaymentProofUploadUrlUseCase,
    private readonly getProofUseCase: GetPaymentProofUseCase,
    private readonly deleteProofUseCase: DeletePaymentProofUseCase,
    private readonly getPendingManualPaymentsUseCase: GetPendingManualPaymentsUseCase,
  ) {}

  @Post('account')
  async addManualAccount(@Req() req: any, @Body() body: any) {
    const isPm = req.user.role === 'PM'
    
    return this.addAccountUseCase.execute({
      accountNumber: body.accountNumber,
      accountName: body.accountName,
      bankName: body.bankName,
      bankCode: body.bankCode,
      userPropertyId: isPm ? undefined : body.propertyId,
      pmPropertyId: isPm ? body.propertyId : undefined,
    })
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
