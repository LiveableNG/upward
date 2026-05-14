import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ActivityLogService } from '../../../shared/application/activity-log.service';
import { InvitePmUseCase } from './invite-pm.use-case';
import { PropertyManagerRepository, PROPERTY_MANAGER_REPOSITORY } from '../../../domains/pm/property-manager.repository';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import * as crypto from 'crypto';

@Injectable()
export class SubmitUnitRequestUseCase {
  private readonly logger = new Logger(SubmitUnitRequestUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activityLogService: ActivityLogService,
    private readonly invitePmUseCase: InvitePmUseCase,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepository: PropertyManagerRepository,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(
    user: any,
    pmEmail: string,
    pmName: string | undefined,
    unitDetails: {
      uuid?: string;
      address: string;
      area: string;
      state: string;
      country: string;
      rentAmount: number;
      rentStartDate: string;
      rentEndDate: string;
    }
  ) {

    const fullUser = await this.prisma.upward_user.findUnique({
      where: { uuid: user.id }
    });

    if (!fullUser) {
      throw new Error('Authenticated user profile not found in database');
    }

    let pm = await this.pmRepository.findByEmail(pmEmail);
    let isNewShadowPm = false;

    if (!pm) {
      if (!pmName) {
        pmName = pmEmail.split('@')[0]; // Fallback
      }

      const newPmData = {
        uuid: crypto.randomUUID(),
        email: pmEmail,
        firstName: pmName?.split(' ')[0] || 'Property',
        lastName: pmName?.split(' ').slice(1).join(' ') || 'Manager',
        passwordHash: 'PENDING_INVITE',
      };

      pm = await this.pmRepository.save(newPmData as any);
      isNewShadowPm = true;
    }

    await this.activityLogService.log({
      pmId: pm.id!,
      ownerPmId: pm.id!,
      action: 'TENANT_JOIN_REQUEST',
      entityType: 'TENANT_REQUEST',
      description: `${fullUser.firstName} ${fullUser.lastName} wants to connect and sync a unit with you.`,
      metadata: {
        status: 'PENDING',
        userUuid: fullUser.uuid,
        userFirstName: fullUser.firstName,
        userLastName: fullUser.lastName,
        userEmail: fullUser.email,
        unitDetails: unitDetails,
      }
    });

    const propertyData = {
      userId: fullUser.id,
      location: {
        address: unitDetails.address,
        area: unitDetails.area,
        state: unitDetails.state,
        country: unitDetails.country,
      },
      rentAmount: unitDetails.rentAmount,
      rentStartDate: new Date(unitDetails.rentStartDate),
      rentEndDate: new Date(unitDetails.rentEndDate),
      isManaged: false,
      managerName: pmName || `${pm.firstName} ${pm.lastName}`,
      managerEmail: pmEmail,
    };

    if (unitDetails.uuid) {
      await (this.prisma as any).upward_user_property.update({
        where: { uuid: unitDetails.uuid, userId: fullUser.id },
        data: propertyData
      });
    } else {
      await (this.prisma as any).upward_user_property.create({
        data: propertyData
      });
    }

    // 4. Send Invite Email (InvitePmUseCase handles checking if we need to send "first invite" or "another invite")
    if (isNewShadowPm) {
      await this.invitePmUseCase.execute(fullUser, pmEmail, pm.firstName, true, pm.uuid);
    } else if (pm.passwordHash === 'PENDING_INVITE') {
      // It's a shadow PM that already exists, so we send the "another tenant" email
      await this.invitePmUseCase.execute(fullUser, pmEmail, pm.firstName, false, pm.uuid);
    } else {
      // Normal existing PM, we could optionally send a notification email, but for now we'll just log activity
      // Activity Log already captures it, push notification could be sent here.
    }

    return {
      success: true,
      message: 'Unit details saved and property manager notified.'
    };
  }
}
