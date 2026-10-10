import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { CurrentPmActor } from '../../../application/auth/decorators/current-pm-actor.decorator';
import { PmActorContext } from '../../../domains/pm/types/pm-actor-context';
import { GetSplitProfilesUseCase } from '../../../application/pm/use-cases/split-profiles/get-split-profiles.use-case';
import { CreateSplitProfileUseCase } from '../../../application/pm/use-cases/split-profiles/create-split-profile.use-case';
import { UpdateSplitProfileUseCase } from '../../../application/pm/use-cases/split-profiles/update-split-profile.use-case';
import { DeleteSplitProfileUseCase } from '../../../application/pm/use-cases/split-profiles/delete-split-profile.use-case';
import { AttachSplitProfileUseCase } from '../../../application/pm/use-cases/split-profiles/attach-split-profile.use-case';
import {
  CreateSplitProfileDto,
  UpdateSplitProfileDto,
  AttachSplitProfileDto,
} from '../../../application/pm/use-cases/split-profiles/dtos/split-profile.dto';

@Controller('pm/split-profiles')
@UseGuards(JwtAuthGuard)
export class PmSplitProfileController {
  constructor(
    private readonly getSplitProfilesUseCase: GetSplitProfilesUseCase,
    private readonly createSplitProfileUseCase: CreateSplitProfileUseCase,
    private readonly updateSplitProfileUseCase: UpdateSplitProfileUseCase,
    private readonly deleteSplitProfileUseCase: DeleteSplitProfileUseCase,
    private readonly attachSplitProfileUseCase: AttachSplitProfileUseCase,
  ) {}

  @Get()
  async getSplitProfiles(@CurrentPmActor() actor: PmActorContext) {
    return this.getSplitProfilesUseCase.execute(actor.ownerPmId, actor);
  }

  @Post()
  async createSplitProfile(
    @CurrentPmActor() actor: PmActorContext,
    @Body() dto: CreateSplitProfileDto,
  ) {
    return this.createSplitProfileUseCase.execute(actor.ownerPmId, dto, actor);
  }

  @Patch(':uuid')
  async updateSplitProfile(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
    @Body() dto: UpdateSplitProfileDto,
  ) {
    return this.updateSplitProfileUseCase.execute(uuid, actor.ownerPmId, dto, actor);
  }

  @Delete(':uuid')
  async deleteSplitProfile(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.deleteSplitProfileUseCase.execute(uuid, actor.ownerPmId, actor);
  }

  @Post([':uuid/attach', ':uuid/attach-properties'])
  @HttpCode(HttpStatus.OK)
  async attachToProperties(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
    @Body() dto: AttachSplitProfileDto,
  ) {
    return this.attachSplitProfileUseCase.execute(uuid, actor.ownerPmId, dto, actor);
  }

  @Delete('properties/:propertyUuid/detach')
  async detachProperty(
    @Param('propertyUuid') propertyUuid: string,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.attachSplitProfileUseCase.detachProperty(propertyUuid, actor.ownerPmId, actor);
  }
}
