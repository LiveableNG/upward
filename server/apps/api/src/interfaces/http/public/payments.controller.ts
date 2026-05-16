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
  InitializePaymentUseCase,
  ProcessPaymentWebhookUseCase,
  GetBankDetailsUseCase,
  SaveBankDetailsUseCase,
} from '../../../application/use-cases/payments/payment.use-cases'
import { VerifyGatewayTransactionUseCase } from '../../../application/use-cases/payments/verify-transaction.use-case'

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
    private readonly initializePaymentUc: InitializePaymentUseCase,
    private readonly processWebhookUc: ProcessPaymentWebhookUseCase,
    private readonly verifyGatewayTransactionUc: VerifyGatewayTransactionUseCase,
    private readonly getBankDetailsUc: GetBankDetailsUseCase,
    private readonly saveBankDetailsUc: SaveBankDetailsUseCase,
  ) {}

  @Get('verify/:reference')
  async verifyPayment(@Param('reference') reference: string, @Req() req: any) {
    const userId = req.user?.uuid || 'GUEST'
    const result = await this.verifyGatewayTransactionUc.execute({
      userId,
      reference,
    })

    return {
      status: true,
      message: 'Verification complete',
      data: {
        isVerified: result.isVerified,
        status: result.isVerified ? 'SUCCESS' : 'PENDING',
        settlementStatus: (result as any).existing?.settlementStatus,
        amount: result.verifiedAmount,
        reference,
      },
    }
  }

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
    const result = await this.recordTransactionUc.execute({
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

    return {
      status: true,
      data: result,
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('initialize')
  async initializePayment(@Req() req: any, @Body() body: any) {
    const userId = req.user.id
    const result = await this.initializePaymentUc.execute({
      userId,
      amount: body.amount,
      paymentRequestUuid: body.paymentRequestUuid,
      metadata: body.metadata,
    })

    return {
      status: true,
      data: result,
    }
  }

  @Post('webhook')
  async handleWebhook(@Body() payload: any, @Req() req: any) {
    console.log(`[PaymentsController] Webhook POST received: ${payload?.event}`)
    const signature = req.headers['x-paystack-signature']
    return this.processWebhookUc.execute(payload, signature)
  }

  @UseGuards(JwtAuthGuard)
  @Get('bank-details')
  async getBankDetails(@Req() req: any) {
    return this.getBankDetailsUc.execute(req.user.id)
  }

  @UseGuards(JwtAuthGuard)
  @Post('bank-details')
  async saveBankDetails(@Req() req: any, @Body() body: any) {
    return this.saveBankDetailsUc.execute(req.user.id, body)
  }

  @UseGuards(JwtAuthGuard)
  @Post('manual-request')
  async createManualRequest(@Req() req: any, @Body() body: any) {
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
