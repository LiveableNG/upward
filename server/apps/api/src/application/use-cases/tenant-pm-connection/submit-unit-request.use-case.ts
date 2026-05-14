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
      subarea: string;
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

    const propertyBaseData = {
      user: { connect: { id: fullUser.id } },
      pm: { connect: { id: pm.id } },
      rentAmount: unitDetails.rentAmount,
      rentStartDate: new Date(unitDetails.rentStartDate),
      rentEndDate: new Date(unitDetails.rentEndDate),
    };

    if (unitDetails.uuid) {
      await (this.prisma as any).upward_user_property.update({
        where: { uuid: unitDetails.uuid, userId: fullUser.id },
        data: {
          ...propertyBaseData,
          location: {
            update: {
              address: unitDetails.address,
              area: unitDetails.area,
              subarea: unitDetails.subarea,
              state: unitDetails.state,
              country: unitDetails.country,
            }
          }
        }
      });
    } else {
      await (this.prisma as any).upward_user_property.create({
        data: {
          ...propertyBaseData,
          location: {
            create: {
              address: unitDetails.address,
              area: unitDetails.area,
              subarea: unitDetails.subarea,
              state: unitDetails.state,
              country: unitDetails.country,
            }
          }
        }
      });
    }

    if (isNewShadowPm) {
      await this.invitePmUseCase.execute(fullUser, pmEmail, pm.firstName, true, pm.uuid);
    } else if (pm.passwordHash === 'PENDING_INVITE') {
      await this.invitePmUseCase.execute(fullUser, pmEmail, pm.firstName, false, pm.uuid);
    }

    return {
      success: true,
      message: 'Unit details saved and property manager notified.'
    };
  }
}
