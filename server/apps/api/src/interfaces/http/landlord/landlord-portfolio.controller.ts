import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { GetLandlordPortfolioUseCase } from '../../../application/pm/use-cases/landlord/get-landlord-portfolio.use-case';
import { LandlordChangePasswordUseCase } from '../../../application/pm/use-cases/landlord/landlord-change-password.use-case';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';

@Controller('landlords/portfolio')
export class LandlordPortfolioController {
  constructor(
    private readonly getPortfolioUseCase: GetLandlordPortfolioUseCase,
    private readonly changePasswordUseCase: LandlordChangePasswordUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('summary')
  async getSummary(@Req() req: any) {
    // req.user is populated by JwtAuthGuard
    // Ensure role is LANDLORD
    return this.getPortfolioUseCase.execute(req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Req() req: any, @Body() dto: { password: string }) {
    return this.changePasswordUseCase.execute(req.user.sub, dto.password);
  }
}
