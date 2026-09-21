import { Controller, Get, Post, Patch, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { CurrentPmId } from '../../../application/auth/decorators/current-pm-actor.decorator';
import { GetPendingCredibilityRequestsUseCase } from '../../../application/pm/use-cases/get-pending-credibility-requests.use-case';
import { MarkCredibilityRequestDoneUseCase } from '../../../application/pm/use-cases/mark-credibility-request-done.use-case';
import { RejectCredibilityRequestUseCase } from '../../../application/use-cases/external/reject-credibility-request.use-case';

@Controller('pm/credibility-requests')
@UseGuards(JwtAuthGuard)
export class PmCredibilityController {
  constructor(
    private readonly getPendingCredibilityRequestsUseCase: GetPendingCredibilityRequestsUseCase,
    private readonly markCredibilityRequestDoneUseCase: MarkCredibilityRequestDoneUseCase,
    private readonly rejectCredibilityRequestUseCase: RejectCredibilityRequestUseCase,
  ) {}

  @Get()
  async getRequests(@CurrentPmId() pmId: number) {
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
