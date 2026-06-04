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
    pmType: string | undefined,
    companyName: string | undefined,
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
    if (!pm) {
      pm = await this.pmRepository.findByPhone(pmEmail);
    }
    
    let isNewShadowPm = false;

    if (!pm) {
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(pmEmail.trim());
      if (!isEmail) {
        throw new Error('A valid email address is required to invite a new property manager.');
      }

      if (!pmName) {
        pmName = pmEmail.split('@')[0]; // Fallback
      }

      const newPmData = {
        uuid: crypto.randomUUID(),
        email: pmEmail.trim(),
        firstName: pmName?.split(' ')[0] || 'Property',
        lastName: pmName?.split(' ').slice(1).join(' ') || 'Manager',
        passwordHash: 'PENDING_INVITE',
        pmType: pmType || 'Property Manager',
        businessName: companyName || null,
      };

      pm = await this.pmRepository.save(newPmData as any);
      isNewShadowPm = true;
    }

    // Check for existing pending request to avoid duplicates
    const existingLogs = await this.prisma.upward_pm_activity_log.findMany({
      where: {
        ownerPmId: pm.id!,
        action: 'TENANT_JOIN_REQUEST',
      }
    });

    const isDuplicate = existingLogs.some(log => {
      const meta = log.metadata as any;
      return meta.status === 'PENDING' && 
             meta.userUuid === fullUser.uuid && 
             meta.unitDetails?.address === unitDetails.address;
    });

    const decryptedFirstName = this.encryption.decrypt(fullUser.firstName);
    const decryptedLastName = this.encryption.decrypt(fullUser.lastName);

    if (!isDuplicate) {
      await this.activityLogService.log({
        pmId: pm.id!,
        ownerPmId: pm.id!,
        action: 'TENANT_JOIN_REQUEST',
        entityType: 'TENANT_REQUEST',
        description: `${decryptedFirstName} ${decryptedLastName} wants to connect and sync a unit with you.`,
        metadata: {
          status: 'PENDING',
          userUuid: fullUser.uuid,
          userFirstName: fullUser.firstName, // Keep encrypted in metadata as GetPendingJoinRequestsUseCase decrypts it
          userLastName: fullUser.lastName,
          userEmail: fullUser.email,
          userPhone: fullUser.phone || null,
          unitDetails: unitDetails,
        }
      });
    }

    const propertyBaseData: any = {
      user: { connect: { id: fullUser.id } },
      pm: { connect: { id: pm.id } },
      rentAmount: unitDetails.rentAmount,
      rentStartDate: new Date(unitDetails.rentStartDate),
      rentEndDate: new Date(unitDetails.rentEndDate),
    };

    // Check if PM has bank details and find/link subaccount
    let subaccountId: number | undefined;
    if (pm.accountNumber && pm.bankCode) {
      const subaccount = await this.prisma.upward_paystack_subaccount.findUnique({
        where: {
          accountNumber_bankCode: {
            accountNumber: pm.accountNumber,
            bankCode: pm.bankCode,
          }
        }
      });
      if (subaccount) {
        subaccountId = subaccount.id;
        propertyBaseData.subaccount = { connect: { id: subaccountId } };
      }
    }

    if (unitDetails.uuid) {
      const existing = await this.prisma.upward_user_property.findUnique({
        where: { uuid: unitDetails.uuid }
      });
      
      if (existing && existing.isVerified) {
        throw new Error('This property has been verified by your manager and cannot be edited. Please contact your property manager for any updates.');
      }

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

    // Prepare decrypted user for invite
    const decryptedUser = {
        ...fullUser,
        firstName: decryptedFirstName,
        lastName: decryptedLastName,
        email: this.encryption.decrypt(fullUser.email)
    };

    if (isNewShadowPm) {
      await this.invitePmUseCase.execute(decryptedUser, pm.email, pm.firstName, true, pm.uuid);
    } else if (pm.passwordHash === 'PENDING_INVITE') {
      await this.invitePmUseCase.execute(decryptedUser, pm.email, pm.firstName, false, pm.uuid);
    }

    return {
      success: true,
      message: 'Unit details saved and property manager notified.'
    };
  }
}
