import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { InviteTenantUseCase } from '../../pm/use-cases/tenants/invite-tenant.use-case'

@Injectable()
export class SyncTenantUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inviteTenantUseCase: InviteTenantUseCase,
  ) {}

  async execute(uuid: string): Promise<void> {
    const tenant = await this.prisma.upward_pm_tenant.findUnique({
      where: { uuid },
    })

    if (!tenant) {
      throw new NotFoundException('Tenant not found')
    }

    await this.inviteTenantUseCase.execute(tenant.pmId, uuid)
  }
}
