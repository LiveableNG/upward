import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ActivityLogService } from '../../../shared/application/activity-log.service';
import { InvitePmUseCase } from './invite-pm.use-case';
import { PropertyManagerRepository, PROPERTY_MANAGER_REPOSITORY } from '../../../domains/pm/property-manager.repository';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { IPaymentGateway, PAYMENT_GATEWAY } from '../../../domains/payments/payment.repository';
import * as crypto from 'crypto';

type UnitDetails = {
  uuid?: string;
  address: string;
  area: string;
  subarea: string;
  state: string;
  country: string;
  rentAmount: number;
  rentStartDate: string;
  rentEndDate: string;
  rentType?: string;
};

type PaymentDetails = {
  accountNumber: string;
  bankCode: string;
  accountName?: string;
  bankName?: string;
};

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
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
  ) {}

  async execute(
    user: any,
    pmEmail: string | undefined,
    pmName: string | undefined,
    pmType: string | undefined,
    companyName: string | undefined,
    unitDetails: UnitDetails,
    paymentDetails?: PaymentDetails,
  ) {

    const fullUser = await this.prisma.upward_user.findUnique({
      where: { uuid: user.id }
    });

    if (!fullUser) {
      throw new Error('Authenticated user profile not found in database');
    }

    let pm: Awaited<ReturnType<PropertyManagerRepository['findByEmail']>> = null;
    let isNewShadowPm = false;
    const trimmedPmEmail = pmEmail?.trim();

    if (trimmedPmEmail) {
      pm = await this.pmRepository.findByEmail(trimmedPmEmail);
      if (!pm) {
        pm = await this.pmRepository.findByPhone(trimmedPmEmail);
      }

      if (!pm) {
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedPmEmail);
        if (!isEmail) {
          throw new Error('A valid email address is required to invite a new property manager.');
        }

        if (!pmName) {
          pmName = trimmedPmEmail.split('@')[0];
        }

        const newPmData = {
          uuid: crypto.randomUUID(),
          email: trimmedPmEmail,
          firstName: pmName?.split(' ')[0] || 'Property',
          lastName: pmName?.split(' ').slice(1).join(' ') || 'Manager',
          passwordHash: 'PENDING_INVITE',
          pmType: pmType || 'Property Manager',
          businessName: companyName || null,
        };

        pm = await this.pmRepository.save(newPmData as any);
        isNewShadowPm = true;
      }
    }

    const decryptedFirstName = this.encryption.decrypt(fullUser.firstName);
    const decryptedLastName = this.encryption.decrypt(fullUser.lastName);

    if (pm) {
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
            userFirstName: fullUser.firstName,
            userLastName: fullUser.lastName,
            userEmail: fullUser.email,
            userPhone: fullUser.phone || null,
            unitDetails: unitDetails,
          }
        });
      }
    }

    const propertyBaseData: any = {
      user: { connect: { id: fullUser.id } },
      rentAmount: unitDetails.rentAmount,
      rentStartDate: new Date(unitDetails.rentStartDate),
      rentEndDate: new Date(unitDetails.rentEndDate),
      rentType: unitDetails.rentType || 'Annually',
    };

    if (pm) {
      propertyBaseData.pm = { connect: { id: pm.id } };
    }

    const paymentSubaccountId = await this.resolvePaymentSubaccountId(paymentDetails);
    if (paymentSubaccountId) {
      propertyBaseData.subaccount = { connect: { id: paymentSubaccountId } };
    } else if (pm?.accountNumber && pm?.bankCode) {
      const subaccount = await this.prisma.upward_paystack_subaccount.findUnique({
        where: {
          accountNumber_bankCode: {
            accountNumber: pm.accountNumber,
            bankCode: pm.bankCode,
          }
        }
      });
      if (subaccount) {
        propertyBaseData.subaccount = { connect: { id: subaccount.id } };
      }
    }

    if (unitDetails.uuid) {
      const existing = await this.prisma.upward_user_property.findUnique({
        where: { uuid: unitDetails.uuid }
      });

      if (existing && existing.isVerified) {
        // If property is verified, keep existing lease details and relationships
        propertyBaseData.rentAmount = existing.rentAmount;
        propertyBaseData.rentStartDate = existing.rentStartDate;
        propertyBaseData.rentEndDate = existing.rentEndDate;
        propertyBaseData.rentType = existing.rentType;
        delete propertyBaseData.pm;
        delete propertyBaseData.subaccount;
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

    if (pm) {
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
    }

    return {
      success: true,
      message: pm
        ? 'Unit details saved and property manager notified.'
        : 'Property details saved successfully.',
    };
  }

  private async resolvePaymentSubaccountId(paymentDetails?: PaymentDetails): Promise<number | undefined> {
    if (!paymentDetails?.accountNumber || !paymentDetails?.bankCode) {
      return undefined;
    }

    try {
      const existing = await this.prisma.upward_paystack_subaccount.findUnique({
        where: {
          accountNumber_bankCode: {
            accountNumber: paymentDetails.accountNumber,
            bankCode: paymentDetails.bankCode,
          },
        },
      });
      if (existing) return existing.id;

      const subaccount = await this.paymentGateway.findOrCreateSubaccount({
        accountNumber: paymentDetails.accountNumber,
        bankCode: paymentDetails.bankCode,
        businessName: paymentDetails.accountName || 'Property Payment',
      });

      return subaccount?.id;
    } catch (error) {
      this.logger.error('Failed to link payment subaccount for property', error);
      return undefined;
    }
  }
}
