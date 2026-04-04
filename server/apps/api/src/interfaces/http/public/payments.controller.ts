/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, Get, Post, Body, Param, UseGuards, Req } from '@nestjs/common'
import { JwtAuthGuard } from '@application/auth/guards/jwt-auth.guard'
import {
  SaveLandlordUseCase,
  GetSavedLandlordsUseCase,
  RecordTransactionUseCase,
  ProcessGuestPaymentTokenUseCase,
  GetBanksUseCase,
  VerifyAccountUseCase,
} from '@application/use-cases/payments/payment.use-cases'

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly saveLandlordUc: SaveLandlordUseCase,
    private readonly getSavedLandlordsUc: GetSavedLandlordsUseCase,
    private readonly recordTransactionUc: RecordTransactionUseCase,
    private readonly processGuestTokenUc: ProcessGuestPaymentTokenUseCase,
    private readonly getBanksUc: GetBanksUseCase,
    private readonly verifyAccountUc: VerifyAccountUseCase,
  ) {}

  @Get('request/:token')
  async getPaymentRequestFromToken(@Param('token') token: string) {
    return this.processGuestTokenUc.execute(token)
  }

  @UseGuards(JwtAuthGuard)
  @Get('landlords')
  async getSavedLandlords(@Req() req: any) {
    const tenantId = req.user.id
    return this.getSavedLandlordsUc.execute(tenantId)
  }

  @UseGuards(JwtAuthGuard)
  @Post('landlords')
  async saveLandlord(@Req() req: any, @Body() body: any) {
    const tenantId = req.user.id
    return this.saveLandlordUc.execute({
      tenantId,
      name: body.name,
      accountName: body.accountName,
      accountNumber: body.accountNumber,
      bankName: body.bankName,
      bankCode: body.bankCode,
      lastAmount: body.lastAmount,
      lastPaid: body.lastPaid ? new Date(body.lastPaid) : undefined,
    })
  }

  @UseGuards(JwtAuthGuard)
  @Post('transactions')
  async recordTransaction(@Req() req: any, @Body() body: any) {
    const tenantId = req.user.id
    return this.recordTransactionUc.execute({
      tenantId,
      type: body.type || 'RENT',
      status: body.status || 'SUCCESS',
      amount: body.amount,
      reference: body.reference,
      narration: body.narration,
      receiptNumber: body.receiptNumber,
      receiptUrl: body.receiptUrl,
      landlordId: body.landlordId,
    })
  }

  @Get('banks')
  async getBanks() {
    return this.getBanksUc.execute()
  }

  @Get('verify-account')
  async verifyAccount(@Req() req: any) {
    const { accountNumber, bankCode } = req.query
    return this.verifyAccountUc.execute(accountNumber, bankCode)
  }
}
