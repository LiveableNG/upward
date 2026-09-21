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
import { GetSettlementAccountsUseCase } from '../../../application/pm/use-cases/settlement-accounts/get-settlement-accounts.use-case';
import { CreateSettlementAccountUseCase } from '../../../application/pm/use-cases/settlement-accounts/create-settlement-account.use-case';
import { UpdateSettlementAccountUseCase } from '../../../application/pm/use-cases/settlement-accounts/update-settlement-account.use-case';
import { SetDefaultSettlementAccountUseCase } from '../../../application/pm/use-cases/settlement-accounts/set-default-settlement-account.use-case';
import { DeleteSettlementAccountUseCase } from '../../../application/pm/use-cases/settlement-accounts/delete-settlement-account.use-case';
import { LinkPropertiesToSettlementAccountUseCase } from '../../../application/pm/use-cases/settlement-accounts/link-properties-to-settlement-account.use-case';
import {
  CreateSettlementAccountDto,
  UpdateSettlementAccountDto,
  LinkPropertiesDto,
} from '../../../application/pm/use-cases/settlement-accounts/dtos/settlement-account.dto';

@Controller('pm/settlement-accounts')
@UseGuards(JwtAuthGuard)
export class PmSettlementAccountController {
  constructor(
    private readonly getSettlementAccountsUseCase: GetSettlementAccountsUseCase,
    private readonly createSettlementAccountUseCase: CreateSettlementAccountUseCase,
    private readonly updateSettlementAccountUseCase: UpdateSettlementAccountUseCase,
    private readonly setDefaultSettlementAccountUseCase: SetDefaultSettlementAccountUseCase,
    private readonly deleteSettlementAccountUseCase: DeleteSettlementAccountUseCase,
    private readonly linkPropertiesToSettlementAccountUseCase: LinkPropertiesToSettlementAccountUseCase,
  ) {}

  @Get()
  async getSettlementAccounts(@CurrentPmActor() actor: PmActorContext) {
    return this.getSettlementAccountsUseCase.execute(actor.ownerPmId, actor);
  }

  @Post()
  async createSettlementAccount(
    @CurrentPmActor() actor: PmActorContext,
    @Body() dto: CreateSettlementAccountDto,
  ) {
    return this.createSettlementAccountUseCase.execute(actor.ownerPmId, dto, actor);
  }

  @Patch(':uuid')
  async updateSettlementAccount(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
    @Body() dto: UpdateSettlementAccountDto,
  ) {
    return this.updateSettlementAccountUseCase.execute(uuid, actor.ownerPmId, dto, actor);
  }

  @Patch(':uuid/default')
  async setDefaultSettlementAccount(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.setDefaultSettlementAccountUseCase.execute(uuid, actor.ownerPmId, actor);
  }

  @Post(':uuid/link-properties')
  @HttpCode(HttpStatus.OK)
  async linkProperties(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
    @Body() dto: LinkPropertiesDto,
  ) {
    return this.linkPropertiesToSettlementAccountUseCase.execute(uuid, actor.ownerPmId, dto, actor);
  }

  @Delete(':uuid')
  async deleteSettlementAccount(
    @Param('uuid') uuid: string,
    @CurrentPmActor() actor: PmActorContext,
  ) {
    return this.deleteSettlementAccountUseCase.execute(uuid, actor.ownerPmId, actor);
  }
}
