/* eslint-disable @typescript-eslint/no-explicit-any */
import { Controller, Get, Post, Body, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common'
import { JwtAuthGuard } from '@application/auth/guards/jwt-auth.guard'
import {
  InitializeWalletUseCase,
  FundWalletUseCase,
  GetWalletDetailsUseCase,
} from '@application/use-cases/wallet/wallet.use-cases'

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(
    private readonly initializeWalletUc: InitializeWalletUseCase,
    private readonly fundWalletUc: FundWalletUseCase,
    private readonly getWalletDetailsUc: GetWalletDetailsUseCase,
  ) {}

  @Get()
  async getWallet(@Req() req: any) {
    // Automatically initialize if not exists for convenience
    await this.initializeWalletUc.execute(req.user.id)
    const details = await this.getWalletDetailsUc.execute(req.user.id)

    // Flatten the response so the frontend finds wallet properties at the root
    return {
      ...(details.wallet || {}),
      transactions: details.transactions,
    }
  }

  @Post('fund')
  @HttpCode(HttpStatus.OK)
  async fundWallet(@Req() req: any, @Body() body: { amount: number }) {
    return this.fundWalletUc.execute(req.user.id, body.amount)
  }

  @Post('init')
  async initWallet(@Req() req: any) {
    return this.initializeWalletUc.execute(req.user.id)
  }
}
