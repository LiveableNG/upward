import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../../application/auth/interfaces/authenticated-request.interface';
import { VerifyPmEmailUseCase } from '../../../application/use-cases/tenant-pm-connection/verify-pm.use-case';
import { ConfirmPmConnectionUseCase } from '../../../application/use-cases/tenant-pm-connection/confirm-pm-connection.use-case';
import { InvitePmUseCase } from '../../../application/use-cases/tenant-pm-connection/invite-pm.use-case';
import { SubmitUnitRequestUseCase } from '../../../application/use-cases/tenant-pm-connection/submit-unit-request.use-case';

@Controller('user/pm-connection')
@UseGuards(JwtAuthGuard)
export class TenantPmConnectionController {
  constructor(
    private readonly verifyPmEmailUseCase: VerifyPmEmailUseCase,
    private readonly confirmPmConnectionUseCase: ConfirmPmConnectionUseCase,
    private readonly invitePmUseCase: InvitePmUseCase,
    private readonly submitUnitRequestUseCase: SubmitUnitRequestUseCase,
  ) {}

  @Post('verify')
  async verifyPm(@Body('identifier') identifier: string) {
    const result = await this.verifyPmEmailUseCase.execute(identifier);
    return { success: true, data: result };
  }

  @Post('confirm')
  async confirmConnection(
    @Req() req: AuthenticatedRequest,
    @Body('pmId') pmId: number,
  ) {
    const user = req.user;
    const result = await this.confirmPmConnectionUseCase.execute(pmId, user);
    return { success: true, data: result };
  }

  @Post('invite')
  async invitePm(
    @Req() req: AuthenticatedRequest,
    @Body('pmEmail') pmEmail: string,
    @Body('pmName') pmName: string,
    @Body('pmType') pmType: string | undefined,
    @Body('companyName') companyName: string | undefined,
  ) {
    const user = req.user;
    const result = await this.invitePmUseCase.execute(user, pmEmail, pmName, true, undefined, pmType, companyName);
    return { success: true, data: result };
  }

  @Post('add-unit-request')
  async addUnitRequest(
    @Req() req: AuthenticatedRequest,
    @Body('pmEmail') pmEmail: string,
    @Body('pmName') pmName: string | undefined,
    @Body('pmType') pmType: string | undefined,
    @Body('companyName') companyName: string | undefined,
    @Body('unitDetails') unitDetails: any,
  ) {
    const user = req.user;
    const result = await this.submitUnitRequestUseCase.execute(user, pmEmail, pmName, pmType, companyName, unitDetails);
    return { success: true, data: result };
  }
}
