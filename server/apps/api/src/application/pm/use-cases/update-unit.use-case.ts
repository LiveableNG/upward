import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IUnitRepository, PM_UNIT_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { IApprovalRequestRepository, PM_APPROVAL_REQUEST_REPOSITORY } from '../../../domains/pm/IApprovalRequestRepository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';

@Injectable()
export class UpdateUnitUseCase {
  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepository: IUnitRepository,
    @Inject(PM_APPROVAL_REQUEST_REPOSITORY)
    private readonly approvalRepository: IApprovalRequestRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmId: number, uuid: string, data: any) {
    const unitRecord = await this.prisma.upward_pm_unit.findUnique({
      where: { uuid },
      include: { property: true }
    });
    
    if (!unitRecord) {
      throw new NotFoundException('Unit not found');
    }

    const property = unitRecord.property;
    if (property.pmId !== pmId) {
      const teamCollab = await (this.prisma as any).upward_pm_team_collaboration.findFirst({
        where: { collaboratorPmId: pmId, ownerPmId: property.pmId, status: 'ACCEPTED' }
      });

      if (!teamCollab) {
        throw new ForbiddenException('You do not have access to update this unit');
      }

      // Manager collaborator: Queue edit request in upward_pm_approval_request
      const approval = await this.approvalRepository.create({
        requesterPmId: pmId,
        ownerPmId: property.pmId,
        type: 'EDIT_UNIT',
        propertyUuid: property.uuid,
        propertyName: property.name,
        unitUuid: uuid,
        unitName: unitRecord.unitName,
        payload: {
          currentData: {
            unitName: unitRecord.unitName,
            rentAmount: unitRecord.rentAmount,
            rentType: unitRecord.rentType,
          },
          proposedData: data
        }
      });

      return {
        requiresApproval: true,
        approvalUuid: approval.uuid,
        message: 'Your unit edit request has been submitted to the Admin for approval.'
      };
    }

    const updatedUnit = await this.unitRepository.update(uuid, data);

    // If unit is synced, update the upward_user_property record too
    if (updatedUnit.isSynced && updatedUnit.userPropertyUuid) {
      try {
        const userProps = await this.prisma.upward_user_property.findMany({
          where: { uuid: updatedUnit.userPropertyUuid },
        });

        for (const userProp of userProps) {
          const amountPaid = userProp.amountPaid || 0;
          const previousAmountRemaining = userProp.amountRemaining || 0;

          // A rent review must not change what's owed on an already-open cycle —
          // once at least one payment has landed against it, its due amount is
          // locked until it's fully settled. Only an untouched cycle (nothing
          // paid yet) picks up the new rent immediately.
          const lockedAmountOwed = amountPaid > 0
            ? amountPaid + previousAmountRemaining
            : updatedUnit.rentAmount;
          const newAmountRemaining = Math.max(0, lockedAmountOwed - amountPaid);

          await this.prisma.upward_user_property.update({
            where: { id: userProp.id },
            data: {
              rentAmount: updatedUnit.rentAmount,
              amountRemaining: newAmountRemaining,
              rentType: updatedUnit.rentType,
              currency: updatedUnit.currency,
              rentStartDate: updatedUnit.rentStartDate || undefined,
              rentEndDate: updatedUnit.rentDueDate || undefined,
              rentReminderEnabled: updatedUnit.rentReminderEnabled,
              rentReminderDaysBefore: updatedUnit.rentReminderDaysBefore,
            },
          });
        }

      } catch (error) {
        console.error(`Failed to sync unit update for ${uuid}:`, error);
      }
    }

    return updatedUnit;
  }
}
