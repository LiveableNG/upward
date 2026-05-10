import { Controller, Get, Post, Body, UseGuards, Req, Param } from '@nestjs/common';
import { GetLandlordPortfolioUseCase } from '../../../application/pm/use-cases/landlord/get-landlord-portfolio.use-case';
import { GetLandlordPropertyDetailsUseCase } from '../../../application/pm/use-cases/landlord/get-landlord-property-details.use-case';
import { LandlordChangePasswordUseCase } from '../../../application/pm/use-cases/landlord/landlord-change-password.use-case';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';

@Controller('landlords/portfolio')
export class LandlordPortfolioController {
  constructor(
    private readonly getPortfolioUseCase: GetLandlordPortfolioUseCase,
    private readonly getPropertyDetailsUseCase: GetLandlordPropertyDetailsUseCase,
    private readonly changePasswordUseCase: LandlordChangePasswordUseCase,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('summary')
  async getSummary(@Req() req: any) {
    return this.getPortfolioUseCase.execute(req.user.email);
  }

  @UseGuards(JwtAuthGuard)
  @Get('properties/:uuid')
  async getPropertyDetails(@Req() req: any, @Param('uuid') uuid: string) {
    return this.getPropertyDetailsUseCase.execute(req.user.email, uuid);
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(@Req() req: any, @Body() dto: { password: string }) {
    return this.changePasswordUseCase.execute(req.user.sub, dto.password);
  }
}
