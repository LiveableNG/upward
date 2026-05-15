import { Controller, Get,Post, Patch, UseGuards, Req, Inject, UnauthorizedException, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { GetPendingCredibilityRequestsUseCase } from '../../../application/pm/use-cases/get-pending-credibility-requests.use-case';
import { MarkCredibilityRequestDoneUseCase } from '../../../application/pm/use-cases/mark-credibility-request-done.use-case';
import { RejectCredibilityRequestUseCase } from '../../../application/use-cases/external/reject-credibility-request.use-case';
import { PropertyManagerRepository, PROPERTY_MANAGER_REPOSITORY } from '../../../domains/pm/property-manager.repository';

@Controller('pm/credibility-requests')
@UseGuards(JwtAuthGuard)
export class PmCredibilityController {
  constructor(
    private readonly getPendingCredibilityRequestsUseCase: GetPendingCredibilityRequestsUseCase,
    private readonly markCredibilityRequestDoneUseCase: MarkCredibilityRequestDoneUseCase,
    private readonly rejectCredibilityRequestUseCase: RejectCredibilityRequestUseCase,
    @Inject(PROPERTY_MANAGER_REPOSITORY) private readonly pmRepository: PropertyManagerRepository,
  ) {}

  private async getPmId(req: any): Promise<number> {
    const uuid = req.user?.sub;
    if (!uuid) throw new UnauthorizedException('Invalid user context');
    const pm = await this.pmRepository.findByUuid(uuid);
    if (!pm || !pm.id) throw new UnauthorizedException('Property Manager not found');
    return pm.id;
  }

  @Get()
  async getRequests(@Req() req: any) {
    const pmId = await this.getPmId(req);
    return this.getPendingCredibilityRequestsUseCase.execute(pmId);
  }

  @Patch(':uuid/done')
  async markDone(@Param('uuid') uuid: string) {
    return this.markCredibilityRequestDoneUseCase.execute(uuid);
  }

  @Post(':uuid/reject')
  async rejectRequest(@Param('uuid') uuid: string) {
    return this.rejectCredibilityRequestUseCase.execute(uuid);
  }
}
