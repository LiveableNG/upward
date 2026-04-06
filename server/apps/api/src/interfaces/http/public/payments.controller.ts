/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common'
import { JwtAuthGuard } from '@application/auth/guards/jwt-auth.guard'
import {
  SaveLandlordUseCase,
  GetSavedLandlordsUseCase,
  RecordTransactionUseCase,
  ProcessGuestPaymentTokenUseCase,
  GetBanksUseCase,
  VerifyAccountUseCase,
  GetTransactionUseCase,
  GetTenantTransactionsUseCase,
  GenerateReceiptPdfUseCase,
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
    private readonly getTxUc: GetTransactionUseCase,
    private readonly getTenantTxsUc: GetTenantTransactionsUseCase,
    private readonly generateReceiptPdfUc: GenerateReceiptPdfUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  async getTenantTransactions(@Req() req: any) {
    const tenantId = req.user.id
    return this.getTenantTxsUc.execute(tenantId)
  }

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
      landlordId: body.landlordId,
      lineItems: body.lineItems,
    })
  }

  @UseGuards(JwtAuthGuard)
  @Post('transactions/receipt')
  async getReceiptPdf(@Body() body: any) {
    const url = await this.generateReceiptPdfUc.execute(body)
    return { url }
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions/:id')
  async getTransaction(@Param('id') id: string) {
    return this.getTxUc.execute(id)
  }

  @Get('banks')
  async getBanks() {
    return this.getBanksUc.execute()
  }

  @Get('verify-account')
  async verifyAccount(@Req() req: any) {
    const { accountNumber, bankCode } = req.query
    if (!accountNumber || !bankCode) {
      throw new BadRequestException('Account number and bank code are required')
    }

    try {
      return await this.verifyAccountUc.execute(accountNumber, bankCode)
    } catch (e: any) {
      const msg = e.message || ''
      if (msg.includes('rate limit')) {
        throw new HttpException(msg, HttpStatus.TOO_MANY_REQUESTS)
      }
      if (msg.includes('not be resolved')) {
        throw new BadRequestException(msg)
      }
      throw new HttpException(msg || 'Failed to verify account', HttpStatus.INTERNAL_SERVER_ERROR)
    }
  }
}
