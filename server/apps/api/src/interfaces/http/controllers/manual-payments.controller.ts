import { Controller, Post, Body, Patch, Param, UseGuards, Req, Logger, Get, Delete, Query, Res } from '@nestjs/common'
import { AddManualAccountUseCase, UploadProofOfPaymentUseCase, ReviewManualPaymentUseCase, GetPaymentProofUploadUrlUseCase, GetPaymentProofUseCase, DeletePaymentProofUseCase } from '../../../application/use-cases/payments/manual-payment.use-cases'
import { GetPendingManualPaymentsUseCase } from '../../../application/use-cases/payments/get-pending-manual-payments.use-case'
import { Response } from 'express'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'

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
    if (req.user.role !== 'PM' && req.user.role !== 'ADMIN') {
      throw new Error('Unauthorized')
    }
    return this.getPendingManualPaymentsUseCase.execute(req.user.id)
  }

  @Get('proof/upload-url')
  async getUploadUrl(@Req() req: any, @Query('fileName') fileName: string, @Query('fileType') fileType: string, @Query('fileSize') fileSize: string) {
    return this.getUploadUrlUseCase.execute({
      userId: req.user.uuid,
      fileName,
      fileType,
      fileSize: fileSize ? Number(fileSize) : undefined,
    })
  }

  @Post('proof')
  async uploadProofOfPayment(@Req() req: any, @Body() body: any) {
    return this.uploadProofUseCase.execute({
      paymentRequestId: body.paymentRequestId ? Number(body.paymentRequestId) : undefined,
      userPropertyId: body.userPropertyId ? Number(body.userPropertyId) : undefined,
      amount: body.amount ? Number(body.amount) : undefined,
      currency: body.currency,
      fileUrl: body.fileUrl,
      fileName: body.fileName,
      uploadedByUserId: req.user.id,
    })
  }

  @Get('proof/:id')
  async getProof(@Param('id') id: string, @Res() res: Response) {
    const { buffer, fileName, fileType } = await this.getProofUseCase.execute(Number(id))
    res.set({
      'Content-Type': fileType,
      'Content-Disposition': `inline; filename="${fileName}"`,
    })
    res.send(buffer)
  }

  @Delete('proof/:id')
  async deleteProof(@Req() req: any, @Param('id') id: string) {
    return this.deleteProofUseCase.execute(Number(id), req.user.id)
  }

  @Patch('proof/:id/review')
  async reviewProof(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    if (req.user.role !== 'PM' && req.user.role !== 'ADMIN') {
      throw new Error('Unauthorized')
    }
    
    return this.reviewProofUseCase.execute({
      proofId: Number(id),
      pmId: req.user.id,
      status: body.status, // 'APPROVED' or 'REJECTED'
      remarks: body.remarks,
    })
  }
}
