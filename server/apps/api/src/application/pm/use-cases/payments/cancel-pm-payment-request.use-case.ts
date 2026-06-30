import { Inject, Injectable, NotFoundException, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { PM_PAYMENT_REQUEST_REPOSITORY, IPmPaymentRequestRepository } from '../../../../domains/pm/IPropertyRepository';
import { PAYMENT_REQUEST_REPOSITORY, IPaymentRequestRepository } from '../../../../domains/payments/payment.repository';
import { ActivityLogService, ActivityAction } from '../../../../shared/application/activity-log.service';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class CancelPmPaymentRequestUseCase {
  constructor(
    @Inject(PM_PAYMENT_REQUEST_REPOSITORY)
    private readonly pmPaymentRepo: IPmPaymentRequestRepository,
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly corePaymentRepo: IPaymentRequestRepository,
    private readonly activityLog: ActivityLogService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmId: number, uuid: string): Promise<{ success: boolean; message: string }> {
    const pmPR = await this.pmPaymentRepo.findByUuid(uuid);
    if (!pmPR) throw new NotFoundException('Payment request not found');
    
    // Check collaborator access
    let hasAccess = pmPR.pmId === pmId;
    if (!hasAccess) {
      // Check if team collaborator with ALL access
      const teamCollab = await this.prisma.upward_pm_team_collaboration.findFirst({
        where: {
          collaboratorPmId: pmId,
          ownerPmId: pmPR.pmId,
          status: 'ACCEPTED',
          accessLevel: 'ALL'
        }
      });
      if (teamCollab) {
        hasAccess = true;
      }
      
      // Check if custom property collaborator with access to unit's property
      if (!hasAccess && pmPR.unitId) {
        const unit = await this.prisma.upward_pm_unit.findUnique({
          where: { id: pmPR.unitId },
          select: { propertyId: true }
        });
        if (unit) {
          const propCollab = await this.prisma.upward_pm_property_collaboration.findFirst({
            where: {
              collaboratorPmId: pmId,
              propertyId: unit.propertyId
            }
          });
          if (propCollab) {
            hasAccess = true;
          }
        }
      }
    }

    if (!hasAccess) {
      throw new UnauthorizedException('Unauthorized to cancel this request');
    }

    if (pmPR.status === 'PAID') {
      throw new BadRequestException('Cannot cancel a fully paid payment request');
    }

    if (pmPR.amountPaid > 0) {
      throw new BadRequestException('Cannot cancel a request that has partial payments. Please refund the tenant first.');
    }

    await this.pmPaymentRepo.update(uuid, {
      status: 'CANCELLED'
    });

    if (pmPR.paymentRequestId) {
      await this.corePaymentRepo.update(pmPR.paymentRequestId, {
        status: 'CANCELLED'
      });
    }

    await this.activityLog.log({
      pmId,
      ownerPmId: pmPR.pmId,
      action: ActivityAction.CANCEL_PAYMENT,
      entityType: 'PAYMENT',
      entityId: uuid,
      description: `Cancelled payment request #${uuid.slice(-8).toUpperCase()} for ${pmPR.amount} ${pmPR.currency}`,
      metadata: {
        amount: pmPR.amount,
        status: 'CANCELLED'
      }
    });

    return {
      success: true,
      message: 'Payment request cancelled successfully'
    };
  }
}
