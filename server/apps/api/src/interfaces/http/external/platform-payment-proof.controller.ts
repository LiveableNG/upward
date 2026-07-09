import { Controller, Get, Patch, Body, Param, UseGuards, Req } from '@nestjs/common'
import { ApiKeyGuard } from './api-key.guard'
import { GetPendingManualPaymentsUseCase } from '../../../application/use-cases/payments/get-pending-manual-payments.use-case'
import { ReviewManualPaymentUseCase } from '../../../application/use-cases/payments/manual-payment.use-cases'

@Controller('platform/payments/proof')
@UseGuards(ApiKeyGuard)
export class PlatformPaymentProofController {
  constructor(
    private readonly getPendingProofsUseCase: GetPendingManualPaymentsUseCase,
    private readonly reviewProofUseCase: ReviewManualPaymentUseCase,
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
