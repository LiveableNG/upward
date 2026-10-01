import {
  Controller,
  Get,
  Patch,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { CurrentPmActor } from '../../../application/auth/decorators/current-pm-actor.decorator';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { UpdatePmAllianceProfileDto } from '../../../application/alliance/dtos/alliance.dto';
import { GetPmAllianceProfileUseCase } from '../../../application/alliance/use-cases/get-pm-alliance-profile.use-case';
import { UpdatePmAllianceProfileUseCase } from '../../../application/alliance/use-cases/update-pm-alliance-profile.use-case';

@Controller('pm/alliance/profile')
@UseGuards(JwtAuthGuard)
export class PmAllianceProfileController {
  constructor(
    private readonly getProfileUseCase: GetPmAllianceProfileUseCase,
    private readonly updateProfileUseCase: UpdatePmAllianceProfileUseCase,
  ) {}

  @Get()
  async getProfile(@CurrentPmActor() actor: PmActorContext) {
    const data = await this.getProfileUseCase.execute(actor.ownerPmId);
    return { data };
  }

  @Patch()
  @HttpCode(HttpStatus.OK)
  async updateProfile(
    @CurrentPmActor() actor: PmActorContext,
    @Body() body: UpdatePmAllianceProfileDto,
  ) {
    const data = await this.updateProfileUseCase.execute(actor.ownerPmId, body);
    return { data };
  }
}
