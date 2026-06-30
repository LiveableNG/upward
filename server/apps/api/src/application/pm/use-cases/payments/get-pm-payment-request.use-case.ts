import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PM_PAYMENT_REQUEST_REPOSITORY, IPmPaymentRequestRepository } from '../../../../domains/pm/IPropertyRepository';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class GetPmPaymentRequestUseCase {
  constructor(
    @Inject(PM_PAYMENT_REQUEST_REPOSITORY)
    private readonly pmPaymentRepo: IPmPaymentRequestRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmId: number, uuid: string): Promise<any> {
    const request = await this.pmPaymentRepo.findByUuid(uuid);
    
    if (!request) {
      throw new NotFoundException('Payment request not found');
    }

    let hasAccess = request.pmId === pmId;
    if (!hasAccess) {
      // Check if team collaborator with ALL access
      const teamCollab = await this.prisma.upward_pm_team_collaboration.findFirst({
        where: {
          collaboratorPmId: pmId,
          ownerPmId: request.pmId,
          status: 'ACCEPTED',
          accessLevel: 'ALL'
        }
      });
      if (teamCollab) {
        hasAccess = true;
      }
      
      // Check if custom property collaborator with access to unit's property
      if (!hasAccess && request.unitId) {
        const unit = await this.prisma.upward_pm_unit.findUnique({
          where: { id: request.unitId },
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
      throw new NotFoundException('Payment request not found');
    }

    return request;
  }
}
