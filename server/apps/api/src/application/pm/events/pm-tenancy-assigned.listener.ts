import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ResolveDedicatedAccountUseCase } from '../../use-cases/payments/payment.use-cases';

export interface PmTenancyAssignedEvent {
  joinRequestUuid?: string;
  unitUuid: string;
  tenantUuid: string;
  userPropertyUuid?: string;
  pmId: number;
}

@Injectable()
export class PmTenancyAssignedListener {
  private readonly logger = new Logger(PmTenancyAssignedListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolveDedicatedAccount: ResolveDedicatedAccountUseCase,
  ) {}

  @OnEvent('pm.tenancy_assigned', { async: true })
  async handleTenancyAssigned(event: PmTenancyAssignedEvent) {
    this.logger.log(`Processing durable post-commit event for tenancy assignment: ${JSON.stringify(event)}`);

    try {
      if (event.userPropertyUuid) {
        const userProperty = await this.prisma.upward_user_property.findUnique({
          where: { uuid: event.userPropertyUuid },
          include: {
            user: true,
            dedicatedAccounts: true,
            subaccount: true,
          },
        });

        if (userProperty && userProperty.user) {
          // Verify or generate Dedicated Virtual Account if not existing
          if (!userProperty.dedicatedAccounts || userProperty.dedicatedAccounts.length === 0) {
            try {
              await this.resolveDedicatedAccount.execute({
                userPropertyId: userProperty.id,
                tenantEmail: userProperty.user.email!,
                tenantName: `${userProperty.user.firstName} ${userProperty.user.lastName}`,
                tenantPhone: userProperty.user.phone ?? undefined,
                subaccountCode: userProperty.subaccount?.subaccountCode,
              });
              this.logger.log(`Successfully ensured DVA for userProperty ${event.userPropertyUuid}`);
            } catch (dvaErr: any) {
              this.logger.warn(`Background DVA generation notice: ${dvaErr.message}`);
            }
          }
        }
      }
    } catch (err: any) {
      this.logger.error(`Error in PmTenancyAssignedListener: ${err.message}`, err.stack);
    }
  }
}
