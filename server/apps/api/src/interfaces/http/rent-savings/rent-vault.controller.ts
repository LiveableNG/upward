import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Optional,
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
import { PreviewBreakoutRentVaultUseCase } from '../../../application/use-cases/rent-savings/preview-breakout-rent-vault.use-case'
import {
  WithdrawMaturedRentVaultDto,
  WithdrawMaturedRentVaultUseCase,
} from '../../../application/use-cases/rent-savings/withdraw-matured-rent-vault.use-case'
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
import { GetSavingsInterestStatusUseCase } from '../../../application/use-cases/rent-savings/get-savings-interest-status.use-case'
import {
  IndicateSavingsInterestDto,
  IndicateSavingsInterestUseCase,
} from '../../../application/use-cases/rent-savings/indicate-savings-interest.use-case'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { GenerateReceiptPdfUseCase } from '../../../application/use-cases/payments/generate-receipt-pdf.use-case'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Controller('rent-vaults')
export class RentVaultController {
  constructor(
    private readonly createVaultUseCase: CreateRentVaultUseCase,
    private readonly getMyVaultUseCase: GetMyRentVaultUseCase,
    private readonly disburseAdvanceUseCase: DisburseEmergencyAdvanceUseCase,
    private readonly executeSettlementUseCase: ExecuteLandlordSettlementUseCase,
    private readonly breakoutVaultUseCase: BreakoutRentVaultUseCase,
    private readonly previewBreakoutVaultUseCase: PreviewBreakoutRentVaultUseCase,
    private readonly withdrawMaturedVaultUseCase: WithdrawMaturedRentVaultUseCase,
    private readonly onboardInvestorUseCase: OnboardSavingsInvestorUseCase,
    private readonly simulateVaultDepositUseCase: SimulateVaultDepositUseCase,
    private readonly verifyVaultFundingUseCase: VerifyRentVaultFundingUseCase,
    private readonly uploadKycDocUseCase: UploadSavingsKycDocumentUseCase,
    private readonly recordConsentUseCase: RecordSavingsConsentUseCase,
    private readonly getConsentDocUseCase: GetSavingsConsentDocumentUseCase,
    private readonly getKycDocUseCase: GetSavingsKycDocumentUseCase,
    private readonly getSavingsInterestStatusUseCase: GetSavingsInterestStatusUseCase,
    private readonly indicateSavingsInterestUseCase: IndicateSavingsInterestUseCase,
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
    @Optional() private readonly generateReceiptPdfUseCase?: GenerateReceiptPdfUseCase,
    @Optional() private readonly prisma?: PrismaService,
    @Optional() private readonly encryption?: EncryptionService,
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
  @Get('interest/status')
  @HttpCode(HttpStatus.OK)
  async getSavingsInterestStatus(@Req() req: any) {
    const userId = await this.getNumericUserId(req)
    return this.getSavingsInterestStatusUseCase.execute(userId)
  }

  @UseGuards(JwtAuthGuard)
  @Post('interest')
  @HttpCode(HttpStatus.OK)
  async indicateSavingsInterest(
    @Req() req: any,
    @Body() dto?: IndicateSavingsInterestDto,
  ) {
    const userId = await this.getNumericUserId(req)
    return this.indicateSavingsInterestUseCase.execute(userId, dto)
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
  @Get(':id/breakout/preview')
  @HttpCode(HttpStatus.OK)
  async previewBreakoutVault(@Req() req: any, @Param('id') vaultId: string) {
    const userId = await this.getNumericUserId(req)
    return this.previewBreakoutVaultUseCase.execute(userId, vaultId)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/breakout')
  @HttpCode(HttpStatus.OK)
  async breakoutVault(@Req() req: any, @Param('id') vaultId: string) {
    const userId = await this.getNumericUserId(req)
    return this.breakoutVaultUseCase.execute(userId, vaultId)
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/withdraw-matured')
  @HttpCode(HttpStatus.OK)
  async withdrawMaturedVault(
    @Req() req: any,
    @Param('id') vaultId: string,
    @Body() dto?: WithdrawMaturedRentVaultDto,
  ) {
    const userId = await this.getNumericUserId(req)
    return this.withdrawMaturedVaultUseCase.execute(userId, vaultId, dto)
  }

  @Get(':id/receipt.pdf')
  async downloadReceiptPdf(@Param('id') vaultId: string, @Res() res: Response) {
    if (this.prisma && this.generateReceiptPdfUseCase) {
      const vault = await this.prisma.upward_rent_vault.findUnique({
        where: { uuid: vaultId },
        include: {
          user: true,
          settlements: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })

      if (!vault) {
        throw new NotFoundException('Rent savings vault not found')
      }

      const settlement = vault.settlements[0] || null
      const tryDecrypt = (val?: string | null) => {
        if (!val) return ''
        try {
          return this.encryption ? this.encryption.decrypt(val) : val
        } catch {
          return val
        }
      }
      const tenantName =
        `${tryDecrypt(vault.user?.firstName)} ${tryDecrypt(vault.user?.lastName)}`.trim() ||
        'Tenant'
      const targetNaira = Number(vault.targetAmountKobo || 0n) / 100
      const paidNaira = settlement
        ? Number(settlement.amountPaidToLandlordKobo || 0n) / 100
        : Number((vault.currentPrincipalKobo || 0n) + (vault.accruedYieldKobo || 0n)) / 100
      const remainingNaira = Math.max(0, targetNaira - paidNaira)
      const isPartial = remainingNaira > 0
      const rentEnd = vault.contractualDueDate ? new Date(vault.contractualDueDate) : undefined
      const rentStart = rentEnd ? new Date(rentEnd.getTime() - 365 * 86_400_000) : undefined

      const pdfBuffer = await this.generateReceiptPdfUseCase.executeBuffer({
        title: isPartial ? 'Partial Rent Settlement Receipt' : 'Official Rent Payment Receipt',
        receiptNumber: settlement?.settlementReference || `UPW-${vault.uuid.slice(0, 8).toUpperCase()}`,
        paidAt: settlement?.createdAt || vault.updatedAt || new Date(),
        tenantName,
        landlordName: settlement?.landlordName || 'Landlord',
        propertyAddress: settlement?.propertyAddress || undefined,
        paymentType: isPartial ? 'Partial Rent (from Savings)' : 'Annual Rent (from Savings)',
        amount: paidNaira,
        currency: 'NGN',
        reference: settlement?.settlementReference || vault.uuid,
        channel: settlement?.nipSessionId
          ? `NIP Direct Settlement (${settlement.nipSessionId})`
          : 'Upward Rent Savings',
        type: 'RENT_PAYMENT',
        status: isPartial ? 'PARTIAL' : 'PAID',
        rentStartDate: rentStart,
        rentEndDate: rentEnd,
        isPartial,
        rentAmount: targetNaira,
        totalInvoiceAmount: targetNaira,
        totalPaidToDate: paidNaira,
        remainingBalance: remainingNaira,
        lineItems: [
          {
            label: isPartial ? 'Rent Paid from Savings' : 'Annual Rent Settled via Upward',
            amount: paidNaira,
            totalAmount: targetNaira,
            amountPaid: paidNaira,
            status: isPartial ? 'PARTIAL' : 'PAID',
          },
        ],
      })

      res.setHeader('Content-Type', 'application/pdf')
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="upward_rent_receipt_${vaultId}.pdf"`,
      )
      return res.send(pdfBuffer)
    }

    throw new NotFoundException('Receipt generator is unavailable')
  }
}
