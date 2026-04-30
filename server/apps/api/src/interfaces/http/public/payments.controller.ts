/* eslint-disable @typescript-eslint/no-explicit-any */
import { randomUUID } from 'node:crypto'
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
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import {
  SaveLandlordUseCase,
  GetSavedLandlordsUseCase,
  RecordTransactionUseCase,
  GetBanksUseCase,
  VerifyAccountUseCase,
  GetTransactionUseCase,
  GetUserTransactionsUseCase,
  GenerateReceiptPdfUseCase,
  GetPendingPaymentsUseCase,
  ResolveSubaccountUseCase,
  GetPropertyBalanceUseCase,
  CreateManualPaymentRequestUseCase,
} from '../../../application/use-cases/payments/payment.use-cases'

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly saveLandlordUc: SaveLandlordUseCase,
    private readonly getSavedLandlordsUc: GetSavedLandlordsUseCase,
    private readonly recordTransactionUc: RecordTransactionUseCase,
    private readonly getBanksUc: GetBanksUseCase,
    private readonly verifyAccountUc: VerifyAccountUseCase,
    private readonly getTxUc: GetTransactionUseCase,
    private readonly getUserTxsUc: GetUserTransactionsUseCase,
    private readonly generateReceiptPdfUc: GenerateReceiptPdfUseCase,
    private readonly getPendingPaymentsUc: GetPendingPaymentsUseCase,
    private readonly resolveSubaccountUc: ResolveSubaccountUseCase,
    private readonly getPropertyBalanceUc: GetPropertyBalanceUseCase,
    private readonly createManualRequestUc: CreateManualPaymentRequestUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('transactions/pending')
  async getPendingPayments(@Req() req: any) {
    const userId = req.user.id
    return this.getPendingPaymentsUc.execute(userId)
  }

  @UseGuards(JwtAuthGuard)
  @Get('transactions')
  async getUserTransactions(@Req() req: any) {
    const userId = req.user.id
    return this.getUserTxsUc.execute(userId)
  }

  @UseGuards(JwtAuthGuard)
  @Get('property-balance/:propertyUuid')
  async getPropertyBalance(@Param('propertyUuid') propertyUuid: string) {
    return this.getPropertyBalanceUc.execute(propertyUuid)
  }


  @UseGuards(JwtAuthGuard)
  @Get('landlords')
  async getSavedLandlords(@Req() req: any) {
    const userId = req.user.id
    return this.getSavedLandlordsUc.execute(userId)
  }

  @UseGuards(JwtAuthGuard)
  @Post('landlords')
  async saveLandlord(@Req() req: any, @Body() body: any) {
    const userId = req.user.id
    return this.saveLandlordUc.execute({
      userId,
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
    const userId = req.user.id
    return this.recordTransactionUc.execute({
      userId,
      type: body.type || 'RENT',
      status: body.status || 'SUCCESS',
      amount: body.amount,
      reference: body.reference,
      narration: body.narration,
      landlordId: body.landlordId,
      lineItems: body.lineItems,
      paymentType: body.paymentType,
      propertyAddress: body.propertyAddress,
      userPropertyUuid: body.userPropertyUuid,
      currency: body.currency || 'NGN',
    })
  }

  @UseGuards(JwtAuthGuard)
  @Post('initialize-manual')
  async initializeManual(@Req() req: any, @Body() body: any) {
    const userId = req.user.id
    return this.createManualRequestUc.execute({
      userId,
      amount: body.amount,
      landlordUuid: body.landlordUuid,
      landlordDetails: body.landlordDetails,
      propertyUuid: body.propertyUuid,
      metadata: body.metadata,
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

  @UseGuards(JwtAuthGuard)
  @Get('resolve-subaccount')
  async resolveSubaccount(@Req() req: any) {
    const { accountNumber, bankCode, businessName } = req.query
    if (!accountNumber || !bankCode) {
      throw new BadRequestException('Account number and bank code are required')
    }
    return this.resolveSubaccountUc.execute(accountNumber, bankCode, businessName)
  }
}
