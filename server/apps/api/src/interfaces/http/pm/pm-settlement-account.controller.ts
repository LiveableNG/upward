import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../application/auth/guards/jwt-auth.guard';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
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

interface FastifyRequest {
  user?: {
    sub: string;
    email?: string;
    role?: string;
    ownerPmId?: number;
    employeeId?: number;
  };
}

@Controller('pm/settlement-accounts')
@UseGuards(JwtAuthGuard)
export class PmSettlementAccountController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly getSettlementAccountsUseCase: GetSettlementAccountsUseCase,
    private readonly createSettlementAccountUseCase: CreateSettlementAccountUseCase,
    private readonly updateSettlementAccountUseCase: UpdateSettlementAccountUseCase,
    private readonly setDefaultSettlementAccountUseCase: SetDefaultSettlementAccountUseCase,
    private readonly deleteSettlementAccountUseCase: DeleteSettlementAccountUseCase,
    private readonly linkPropertiesToSettlementAccountUseCase: LinkPropertiesToSettlementAccountUseCase,
  ) {}

  private async getActorContext(req: FastifyRequest): Promise<PmActorContext> {
    if (!req.user?.sub) throw new UnauthorizedException('Invalid user context');

    if (req.user.role === 'PM_EMPLOYEE') {
      let ownerPmId = req.user.ownerPmId;
      let employeeId = req.user.employeeId;
      let accessLevel = 'CUSTOM';

      const employee = await (this.prisma as any).upward_pm_employee.findUnique({
        where: { uuid: req.user.sub },
        select: { id: true, ownerPmId: true, accessLevel: true },
      });

      if (employee) {
        ownerPmId = ownerPmId || employee.ownerPmId;
        employeeId = employeeId || employee.id;
        accessLevel = employee.accessLevel;
      }

      if (!ownerPmId) throw new UnauthorizedException('Employee organization not found');

      return {
        ownerPmId,
        isEmployee: true,
        employeeId,
        employeeUuid: req.user.sub,
        accessLevel,
      };
    }

    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: req.user.sub },
      select: { id: true },
    });
    if (!pm) throw new UnauthorizedException('Property manager not found');

    return {
      ownerPmId: pm.id,
      isEmployee: false,
    };
  }

  @Get()
  async getSettlementAccounts(@Req() req: FastifyRequest) {
    const actor = await this.getActorContext(req);
    return this.getSettlementAccountsUseCase.execute(actor.ownerPmId, actor);
  }

  @Post()
  async createSettlementAccount(
    @Req() req: FastifyRequest,
    @Body() dto: CreateSettlementAccountDto,
  ) {
    const actor = await this.getActorContext(req);
    return this.createSettlementAccountUseCase.execute(actor.ownerPmId, dto, actor);
  }

  @Patch(':uuid')
  async updateSettlementAccount(
    @Param('uuid') uuid: string,
    @Req() req: FastifyRequest,
    @Body() dto: UpdateSettlementAccountDto,
  ) {
    const actor = await this.getActorContext(req);
    return this.updateSettlementAccountUseCase.execute(uuid, actor.ownerPmId, dto, actor);
  }

  @Patch(':uuid/default')
  async setDefaultSettlementAccount(
    @Param('uuid') uuid: string,
    @Req() req: FastifyRequest,
  ) {
    const actor = await this.getActorContext(req);
    return this.setDefaultSettlementAccountUseCase.execute(uuid, actor.ownerPmId, actor);
  }

  @Post(':uuid/link-properties')
  @HttpCode(HttpStatus.OK)
  async linkProperties(
    @Param('uuid') uuid: string,
    @Req() req: FastifyRequest,
    @Body() dto: LinkPropertiesDto,
  ) {
    const actor = await this.getActorContext(req);
    return this.linkPropertiesToSettlementAccountUseCase.execute(uuid, actor.ownerPmId, dto, actor);
  }

  @Delete(':uuid')
  async deleteSettlementAccount(
    @Param('uuid') uuid: string,
    @Req() req: FastifyRequest,
  ) {
    const actor = await this.getActorContext(req);
    return this.deleteSettlementAccountUseCase.execute(uuid, actor.ownerPmId, actor);
  }
}
