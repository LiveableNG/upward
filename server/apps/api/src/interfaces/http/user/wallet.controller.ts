import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { Roles } from '../../../application/auth/decorators/roles.decorator'
import { AdminRole } from '@upward/shared-types'
import {
  ApplyDailySavingsInterestUseCase,
  CreateSavingsGoalUseCase,
  EnableSavingsWalletForUserUseCase,
  FundWalletUseCase,
  GetSavingsGoalsUseCase,
  GetWalletUseCase,
  SetDailySavingsInterestUseCase,
  UpdateSavingsGoalUseCase,
} from '../../../application/use-cases/payments/wallet.use-cases'

@Controller()
export class WalletController {
  constructor(
    private readonly getWalletUseCase: GetWalletUseCase,
    private readonly fundWalletUseCase: FundWalletUseCase,
    private readonly getSavingsGoalsUseCase: GetSavingsGoalsUseCase,
    private readonly createSavingsGoalUseCase: CreateSavingsGoalUseCase,
    private readonly updateSavingsGoalUseCase: UpdateSavingsGoalUseCase,
    private readonly enableSavingsWalletUseCase: EnableSavingsWalletForUserUseCase,
    private readonly setDailySavingsInterestUseCase: SetDailySavingsInterestUseCase,
    private readonly applyDailySavingsInterestUseCase: ApplyDailySavingsInterestUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('wallet')
  async getWallet(@Req() req: any) {
    const data = await this.getWalletUseCase.execute(req.user.id)
    return { data, message: 'Wallet retrieved', meta: {} }
  }

  @UseGuards(JwtAuthGuard)
  @Post('wallet/fund')
  async fundWallet(@Req() req: any, @Body() body: { amount: number }) {
    const data = await this.fundWalletUseCase.execute({ userUuid: req.user.id, amount: Number(body.amount) })
    return { data, message: 'Wallet funding initialized', meta: {} }
  }

  @UseGuards(JwtAuthGuard)
  @Get('savings/goals')
  async getSavingsGoals(@Req() req: any) {
    const data = await this.getSavingsGoalsUseCase.execute(req.user.id)
    return { data, message: 'Savings goals retrieved', meta: {} }
  }

  @UseGuards(JwtAuthGuard)
  @Post('savings/goals')
  async createSavingsGoal(@Req() req: any, @Body() body: any) {
    const data = await this.createSavingsGoalUseCase.execute(req.user.id, body)
    return { data, message: 'Savings goal created', meta: {} }
  }

  @UseGuards(JwtAuthGuard)
  @Patch('savings/goals/:id')
  async updateSavingsGoal(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const data = await this.updateSavingsGoalUseCase.execute(req.user.id, id, body)
    return { data, message: 'Savings goal updated', meta: {} }
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER, AdminRole.CUSTOMER_SUPPORT)
  @Patch('admin/savings-wallet/users/:uuid')
  async enableSavingsWallet(@Param('uuid') uuid: string, @Body() body: { enabled: boolean }) {
    const data = await this.enableSavingsWalletUseCase.execute(uuid, !!body.enabled)
    return { data, message: 'Savings wallet status updated', meta: {} }
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  @Patch('admin/savings-wallet/interest')
  async setInterest(@Req() req: any, @Body() body: { dailyInterestRate: number }) {
    const data = await this.setDailySavingsInterestUseCase.execute(
      Number(body.dailyInterestRate),
      req.user?.id,
    )
    return { data, message: 'Daily savings interest updated', meta: {} }
  }

  @UseGuards(AdminJwtAuthGuard, RolesGuard)
  @Roles(AdminRole.SUPERADMIN, AdminRole.DEVELOPER)
  @Post('admin/savings-wallet/apply-interest')
  async applyInterest() {
    const data = await this.applyDailySavingsInterestUseCase.execute()
    return { data, message: 'Daily savings interest applied', meta: {} }
  }
}
