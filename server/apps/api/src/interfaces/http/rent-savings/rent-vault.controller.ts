import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common'
import { Response } from 'express'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import {
  CreateRentVaultDto,
  CreateRentVaultUseCase,
} from '../../../application/use-cases/rent-savings/create-rent-vault.use-case'
import { GetMyRentVaultUseCase } from '../../../application/use-cases/rent-savings/get-my-rent-vault.use-case'
import {
  DisburseEmergencyAdvanceDto,
  DisburseEmergencyAdvanceUseCase,
} from '../../../application/use-cases/rent-savings/disburse-emergency-advance.use-case'
import {
  ExecuteLandlordSettlementDto,
  ExecuteLandlordSettlementUseCase,
} from '../../../application/use-cases/rent-savings/execute-landlord-settlement.use-case'
import { BreakoutRentVaultUseCase } from '../../../application/use-cases/rent-savings/breakout-rent-vault.use-case'
import {
  OnboardSavingsInvestorUseCase,
  OnboardSavingsInvestorDto,
} from '../../../application/use-cases/rent-savings/onboard-savings-investor.use-case'
import {
  SimulateVaultDepositDto,
  SimulateVaultDepositUseCase,
} from '../../../application/use-cases/rent-savings/simulate-vault-deposit.use-case'
import { VerifyRentVaultFundingUseCase } from '../../../application/use-cases/rent-savings/verify-rent-vault-funding.use-case'
import {
  SavingsKycDocumentKind,
  UploadSavingsKycDocumentUseCase,
} from '../../../application/use-cases/rent-savings/upload-savings-kyc-document.use-case'
import {
  RecordSavingsConsentDto,
  RecordSavingsConsentUseCase,
} from '../../../application/use-cases/rent-savings/record-savings-consent.use-case'
import {
  GetSavingsConsentDocumentUseCase,
  GetSavingsKycDocumentUseCase,
} from '../../../application/use-cases/rent-savings/get-savings-consent-document.use-case'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'

@Controller('rent-vaults')
export class RentVaultController {
  constructor(
    private readonly createVaultUseCase: CreateRentVaultUseCase,
    private readonly getMyVaultUseCase: GetMyRentVaultUseCase,
    private readonly disburseAdvanceUseCase: DisburseEmergencyAdvanceUseCase,
    private readonly executeSettlementUseCase: ExecuteLandlordSettlementUseCase,
    private readonly breakoutVaultUseCase: BreakoutRentVaultUseCase,
    private readonly onboardInvestorUseCase: OnboardSavingsInvestorUseCase,
    private readonly simulateVaultDepositUseCase: SimulateVaultDepositUseCase,
    private readonly verifyVaultFundingUseCase: VerifyRentVaultFundingUseCase,
    private readonly uploadKycDocUseCase: UploadSavingsKycDocumentUseCase,
    private readonly recordConsentUseCase: RecordSavingsConsentUseCase,
    private readonly getConsentDocUseCase: GetSavingsConsentDocumentUseCase,
    private readonly getKycDocUseCase: GetSavingsKycDocumentUseCase,
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
  ) {}

  private extractRequestMeta(req: any): { ipAddress: string | null; userAgent: string | null } {
    const forwarded = req?.headers?.['x-forwarded-for']
    const ipAddress =
      (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : null) ||
      req?.ip ||
      req?.socket?.remoteAddress ||
      null
    const userAgent =
      typeof req?.headers?.['user-agent'] === 'string' ? req.headers['user-agent'] : null
    return { ipAddress, userAgent }
  }

  private async getNumericUserId(req: any): Promise<number> {
    const rawId = req.user?.id || req.user?.sub
    if (!rawId) {
      throw new UnauthorizedException('No user identity provided')
    }

    if (typeof rawId === 'number') {
      return rawId
    }

    if (typeof rawId === 'string' && /^\d+$/.test(rawId)) {
      return parseInt(rawId, 10)
    }

    const user = await this.userRepo.findByUuid(rawId)
    if (!user || !user.id) {
      throw new UnauthorizedException('User not found')
    }
    return user.id
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createVault(@Req() req: any, @Body() dto: CreateRentVaultDto) {
    const userId = await this.getNumericUserId(req)
    return this.createVaultUseCase.execute(userId, dto, this.extractRequestMeta(req))
  }

  @UseGuards(JwtAuthGuard)
  @Get('prefill')
  @HttpCode(HttpStatus.OK)
  async getOnboardingPrefill(@Req() req: any) {
    const userId = await this.getNumericUserId(req)
    return this.onboardInvestorUseCase.getOnboardingPrefill(userId)
  }

  @UseGuards(JwtAuthGuard)
  @Post('kyc/upload-document')
  @HttpCode(HttpStatus.CREATED)
  async uploadKycDocument(@Req() req: any) {
    if (!req.isMultipart || !req.isMultipart()) {
      throw new BadRequestException('Request must be multipart/form-data')
    }
    const userId = await this.getNumericUserId(req)
    const data = await req.file()
    if (!data) {
      throw new BadRequestException('No document file uploaded.')
    }
    const fileBuffer = await data.toBuffer()
    const fields = (data.fields || {}) as Record<string, any>
    const kind = String(fields?.kind?.value || '') as SavingsKycDocumentKind
    const fileName = fields?.fileName?.value ? String(fields.fileName.value) : data.filename
    return this.uploadKycDocUseCase.execute({
      userId,
      kind,
      fileBuffer,
      fileName,
      mimeType: data.mimetype,
    })
  }

  @UseGuards(JwtAuthGuard)
  @Get('kyc/document/:kind')
  async getKycDocument(
    @Req() req: any,
    @Param('kind') kind: string,
    @Res({ passthrough: true }) res: any,
  ) {
    const userId = await this.getNumericUserId(req)
    return this.getKycDocUseCase.execute(userId, kind, res)
  }

  @UseGuards(JwtAuthGuard)
  @Post('onboard-investor')
  @HttpCode(HttpStatus.OK)
  async onboardInvestor(@Req() req: any, @Body() dto: OnboardSavingsInvestorDto) {
    const userId = await this.getNumericUserId(req)
    return this.onboardInvestorUseCase.execute(userId, dto, this.extractRequestMeta(req))
  }

  @UseGuards(JwtAuthGuard)
  @Post('consent')
  @HttpCode(HttpStatus.OK)
  async consentToSavings(@Req() req: any, @Body() dto: RecordSavingsConsentDto) {
    const userId = await this.getNumericUserId(req)
    return this.recordConsentUseCase.execute(userId, dto, this.extractRequestMeta(req))
  }

  @UseGuards(JwtAuthGuard)
  @Get('consent-document')
  async getConsentDocument(@Req() req: any, @Res({ passthrough: true }) res: any) {
    const userId = await this.getNumericUserId(req)
    return this.getConsentDocUseCase.execute(userId, res)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMyVault(@Req() req: any) {
    const userId = await this.getNumericUserId(req)
    return this.getMyVaultUseCase.execute(userId)
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/schedule')
  @HttpCode(HttpStatus.OK)
  async updateMyVaultSchedule(
    @Req() req: any,
    @Body() body: { payday_day_of_month?: number },
  ) {
    const userId = await this.getNumericUserId(req)
    return this.getMyVaultUseCase.updatePaydayDay(userId, Number(body?.payday_day_of_month ?? 28))
  }

  @UseGuards(JwtAuthGuard)
  @Post('simulate-deposit')
  @HttpCode(HttpStatus.OK)
  async simulateDeposit(@Req() req: any, @Body() dto: SimulateVaultDepositDto) {
    const userId = await this.getNumericUserId(req)
    return this.simulateVaultDepositUseCase.execute(userId, dto)
  }

  @UseGuards(JwtAuthGuard)
  @Post('me/verify-funding')
  @HttpCode(HttpStatus.OK)
  async verifyVaultFunding(@Req() req: any) {
    const userId = await this.getNumericUserId(req)
    return this.verifyVaultFundingUseCase.execute(userId)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/advance/disburse')
  @HttpCode(HttpStatus.CREATED)
  async disburseAdvance(
    @Req() req: any,
    @Param('id') vaultId: string,
    @Body() dto: DisburseEmergencyAdvanceDto,
  ) {
    const userId = await this.getNumericUserId(req)
    return this.disburseAdvanceUseCase.execute(userId, vaultId, dto)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/settlement/execute')
  @HttpCode(HttpStatus.OK)
  async executeSettlement(
    @Req() req: any,
    @Param('id') vaultId: string,
    @Body() dto: ExecuteLandlordSettlementDto,
  ) {
    const userId = await this.getNumericUserId(req)
    return this.executeSettlementUseCase.execute(userId, vaultId, dto)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/breakout')
  @HttpCode(HttpStatus.OK)
  async breakoutVault(@Req() req: any, @Param('id') vaultId: string) {
    const userId = await this.getNumericUserId(req)
    return this.breakoutVaultUseCase.execute(userId, vaultId)
  }

  @Get(':id/receipt.pdf')
  async downloadReceiptPdf(@Param('id') vaultId: string, @Res() res: Response) {
    const receiptContent = `
      UPWARD DIGITAL RENT RECEIPT
      Statutory Standard: Lagos State Tenancy Law 2011
      Vault Reference: ${vaultId}
      Date: ${new Date().toISOString()}
      Status: DISBURSED & SETTLED
      Disbursement Rail: Paystack NIP Direct Settlement
    `
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="upward_rent_receipt_${vaultId}.txt"`,
    )
    return res.send(receiptContent)
  }
}
