import { Controller, Get, Patch, Body, Param, UseGuards, Req, NotFoundException } from '@nestjs/common'
import { ApiKeyGuard } from './api-key.guard'
import { GetPendingManualPaymentsUseCase } from '../../../application/use-cases/payments/get-pending-manual-payments.use-case'
import { ReviewManualPaymentUseCase } from '../../../application/use-cases/payments/manual-payment.use-cases'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service'

@Controller('platform/payments/proof')
@UseGuards(ApiKeyGuard)
export class PlatformPaymentProofController {
  constructor(
    private readonly getPendingProofsUseCase: GetPendingManualPaymentsUseCase,
    private readonly reviewProofUseCase: ReviewManualPaymentUseCase,
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  @Get()
  async getPendingProofs(@Req() req: any) {
    const platformId = req.platformId
    const proofs = await this.getPendingProofsUseCase.execute({ platformId })
    return {
      success: true,
      data: proofs
    }
  }

  @Get(':id')
  async getProofFile(@Req() req: any, @Param('id') id: string) {
    const proofId = Number(id)
    const proof = await this.prisma.upward_payment_proof.findUnique({
      where: { id: proofId },
      include: {
        paymentRequest: { include: { userProperty: { include: { company: true } } } },
        userProperty: { include: { company: true } },
      },
    })

    if (!proof) {
      throw new NotFoundException('Proof of payment not found')
    }

    const platformIdOnProof =
      proof.paymentRequest?.userProperty?.company?.platformId ??
      proof.userProperty?.company?.platformId

    if (platformIdOnProof !== req.platformId) {
      throw new NotFoundException('Proof of payment not found')
    }

    if (!proof.fileUrl) {
      throw new NotFoundException('This payment proof does not have an attached file')
    }

    const url = await this.s3Service.getDownloadUrl(proof.fileUrl)

    return {
      success: true,
      data: {
        url,
        fileName: proof.fileName,
        proofId: proof.id,
      },
    }
  }

  @Patch(':id/review')
  async reviewProof(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const result = await this.reviewProofUseCase.execute({
      proofId: Number(id),
      pmUuid: req.platformId ? `PLATFORM-${req.platformId}` : 'PLATFORM',
      status: body.status, // 'APPROVED' | 'REJECTED'
      remarks: body.remarks,
    })

    return {
      success: true,
      data: result
    }
  }
}
