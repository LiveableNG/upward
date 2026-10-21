import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
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
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'

@Controller('rent-vaults')
export class RentVaultController {
  constructor(
    private readonly createVaultUseCase: CreateRentVaultUseCase,
    private readonly getMyVaultUseCase: GetMyRentVaultUseCase,
    private readonly disburseAdvanceUseCase: DisburseEmergencyAdvanceUseCase,
    private readonly executeSettlementUseCase: ExecuteLandlordSettlementUseCase,
    private readonly breakoutVaultUseCase: BreakoutRentVaultUseCase,
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
  ) {}

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
    return this.createVaultUseCase.execute(userId, dto)
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @HttpCode(HttpStatus.OK)
  async getMyVault(@Req() req: any) {
    const userId = await this.getNumericUserId(req)
    return this.getMyVaultUseCase.execute(userId)
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
