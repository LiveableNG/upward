import { Inject, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { ActivityLogService } from '../../../shared/application/activity-log.service';
import { InvitePmUseCase } from './invite-pm.use-case';
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service';
import { PropertyManagerRepository, PROPERTY_MANAGER_REPOSITORY } from '../../../domains/pm/property-manager.repository';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { IPaymentGateway, PAYMENT_GATEWAY } from '../../../domains/payments/payment.repository';
import { WebhookService } from '../../../shared/infrastructure/common/webhook/webhook.service';
import * as crypto from 'crypto';

import { RentalPeriodService } from '../../services/rental-period.service';

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
  tenancyStatus?: 'NEW_CYCLE' | 'PAYING_BALANCE' | 'ALREADY_PAID';
  initialAmountPaid?: number;
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
    private readonly unifiedCommService: UnifiedCommunicationService,
    private readonly rentalPeriodService: RentalPeriodService,
    private readonly webhookService: WebhookService,
  ) {}

  async execute(
    user: any,
    pmEmail: string | undefined,
    pmName: string | undefined,
    pmType: string | undefined,
    companyName: string | undefined,
    unitDetails: UnitDetails,
    paymentDetails?: PaymentDetails,
    companyUuid?: string,
    managerUuid?: string,
    onboardingProof?: {
      url: string;
      fileName: string;
      fileType?: string;
      fileSize?: number;
    },
  ) {

    const fullUser = await this.prisma.upward_user.findUnique({
      where: { uuid: user.id }
    });

    if (!fullUser) {
      throw new Error('Authenticated user profile not found in database');
    }

    const trimmedPmEmail = pmEmail?.trim();

    // Check if selecting an external platform company or manager
    let matchedCompany: any = null;
    let matchedManager: any = null;
    let matchedPlatformId: number | null = null;

    if (companyUuid) {
      matchedCompany = await this.prisma.upward_company.findUnique({
        where: { uuid: companyUuid },
      });
      if (matchedCompany?.platformId) {
        matchedPlatformId = matchedCompany.platformId;
      }
    }

    if (managerUuid) {
      matchedManager = await this.prisma.upward_manager.findUnique({
        where: { uuid: managerUuid },
        include: { company: true },
      });
      if (matchedManager?.company) {
        if (!matchedCompany) matchedCompany = matchedManager.company;
        if (matchedManager.company.platformId) {
          matchedPlatformId = matchedManager.company.platformId;
        }
      }
    }

    if (!matchedCompany && !matchedManager && trimmedPmEmail) {
      const emailHash = this.encryption.hash(trimmedPmEmail);
      const phoneHash = this.encryption.hash(trimmedPmEmail);

      matchedManager = await this.prisma.upward_manager.findFirst({
        where: {
          OR: [{ emailHash }, { phoneHash }],
          company: { platformId: { not: null } },
        },
        include: { company: true },
      });

      if (matchedManager?.company) {
        matchedCompany = matchedManager.company;
        matchedPlatformId = matchedManager.company.platformId;
      } else {
        matchedCompany = await this.prisma.upward_company.findFirst({
          where: {
            OR: [{ emailHash }, { phoneHash }],
            platformId: { not: null },
          },
        });
        if (matchedCompany?.platformId) {
          matchedPlatformId = matchedCompany.platformId;
        }
      }
    }

    let pm: Awaited<ReturnType<PropertyManagerRepository['findByEmail']>> = null;
    let isNewShadowPm = false;

    // Only handle Upward PM repository lookup/creation if not an external platform PM
    if (!matchedCompany && !matchedManager && trimmedPmEmail) {
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
          invitedByUserId: fullUser?.id || null,
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
            onboardingProof: onboardingProof || null,
          }
        });

        // 1. Create In-App Notification for PM
        await this.prisma.upward_pm_notification.create({
          data: {
            pmId: pm.id!,
            title: 'New Connection Request',
            message: `${decryptedFirstName} ${decryptedLastName} wants to connect and sync their unit (${unitDetails.address}) with you.`,
            type: 'TENANT_REQUEST',
            isPopup: false,
            url: '/dashboard',
          }
        });

        // 2. If the PM is already registered (not shadow/pending invite), send a notification email
        if (pm.passwordHash && !pm.passwordHash.includes('PENDING_INVITE') && pm.passwordHash !== 'PENDING_INVITE') {
          const pmDecryptedEmail = pm.email ? (this.encryption.decrypt(pm.email).includes('@') ? this.encryption.decrypt(pm.email) : pm.email) : undefined;
          const pmDecryptedName = pm.firstName ? `${this.encryption.decrypt(pm.firstName)} ${pm.lastName ? this.encryption.decrypt(pm.lastName) : ''}`.trim() : 'Property Manager';
          
          if (pmDecryptedEmail) {
            await this.unifiedCommService.processCommunication({
              recipientEmail: pmDecryptedEmail,
              recipientName: pmDecryptedName,
              recipientRole: 'PM',
              pmUuid: pm.uuid,
              type: 'PM_CONNECTION_REQUEST',
              context: {
                pmName: pmDecryptedName,
                tenantName: `${decryptedFirstName} ${decryptedLastName}`.trim(),
                unitAddress: unitDetails.address,
                rentAmount: unitDetails.rentAmount,
                portalUrl: process.env.PM_APP_URL || 'https://upward-pm.vercel.app/dashboard',
              }
            }).catch((err: any) => this.logger.error(`Failed to send PM connection request email: ${err.message}`));
          }
        }
      }
    }

    const rentalState = this.rentalPeriodService.initializeRentalState({
      rentStartDate: new Date(unitDetails.rentStartDate),
      rentEndDate: new Date(unitDetails.rentEndDate),
      rentAmount: unitDetails.rentAmount,
      rentType: unitDetails.rentType || 'Annually',
      initialAmountPaid: unitDetails.initialAmountPaid,
      tenancyStatus: unitDetails.tenancyStatus,
    });

    // Resolve or create location record
    let locationId: number | undefined;

    let existingProperty: any = null;
    if (unitDetails.uuid) {
      existingProperty = await this.prisma.upward_user_property.findFirst({
        where: { uuid: unitDetails.uuid, userId: fullUser.id }
      });
    }

    if (existingProperty?.locationId) {
      await this.prisma.upward_location.update({
        where: { id: existingProperty.locationId },
        data: {
          address: unitDetails.address,
          area: unitDetails.area,
          subarea: unitDetails.subarea || '',
          state: unitDetails.state,
          country: unitDetails.country,
        }
      });
      locationId = existingProperty.locationId;
    } else {
      const loc = await this.prisma.upward_location.create({
        data: {
          address: unitDetails.address,
          area: unitDetails.area,
          subarea: unitDetails.subarea || '',
          state: unitDetails.state,
          country: unitDetails.country,
        }
      });
      locationId = loc.id;
    }

    const propertyBaseData: any = {
      location: { connect: { id: locationId } },
      rentAmount: unitDetails.rentAmount,
      rentStartDate: rentalState.rentStartDate,
      rentEndDate: rentalState.rentEndDate,
      rentType: unitDetails.rentType || 'Annually',
      amountPaid: rentalState.amountPaid,
      amountRemaining: rentalState.amountRemaining,
      initialAmountPaid: rentalState.initialAmountPaid,
      isFirstRent: rentalState.isFirstRent,
    };

    if (pm) {
      propertyBaseData.pm = { connect: { id: pm.id } };
      const effectiveManualAccountId =
        (await this.prisma.upward_manual_account.findFirst({
          where: { pmId: pm.id, isPrimary: true },
          select: { id: true },
        }))?.id ||
        (await this.prisma.upward_manual_account.findFirst({
          where: { pmId: pm.id },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        }))?.id;

      if (effectiveManualAccountId) {
        propertyBaseData.manualAccount = { connect: { id: effectiveManualAccountId } };
      }
    }
    if (matchedCompany) {
      propertyBaseData.company = { connect: { id: matchedCompany.id } };
    }
    if (matchedManager) {
      propertyBaseData.manager = { connect: { id: matchedManager.id } };
    }
    if (matchedPlatformId) {
      propertyBaseData.platformId = matchedPlatformId;
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

    let savedProperty: any = null;

    if (existingProperty) {
      if (existingProperty.isVerified || existingProperty.pmUnitId) {
        // STRICT LOCK: If property is verified/managed, lock lease details
        propertyBaseData.rentAmount = existingProperty.rentAmount;
        propertyBaseData.rentStartDate = existingProperty.rentStartDate;
        propertyBaseData.rentEndDate = existingProperty.rentEndDate;
        propertyBaseData.rentType = existingProperty.rentType;
        propertyBaseData.amountPaid = existingProperty.amountPaid;
        propertyBaseData.amountRemaining = existingProperty.amountRemaining;
        propertyBaseData.initialAmountPaid = existingProperty.initialAmountPaid;
        delete propertyBaseData.pm;
        delete propertyBaseData.subaccount;
      }

      savedProperty = await this.prisma.upward_user_property.update({
        where: { id: existingProperty.id },
        data: propertyBaseData,
      });
    } else {
      savedProperty = await this.prisma.upward_user_property.create({
        data: {
          ...propertyBaseData,
          user: { connect: { id: fullUser.id } },
        },
      });
    }

    // Upsert manual payment account for self-managed property if paymentDetails provided
    if (savedProperty?.id && paymentDetails?.accountNumber && paymentDetails?.bankCode) {
      try {
        const existingProperty = await this.prisma.upward_user_property.findUnique({
          where: { id: savedProperty.id },
          select: { id: true, manualAccountId: true }
        })
        if (existingProperty?.manualAccountId) {
          await this.prisma.upward_manual_account.update({
            where: { id: existingProperty.manualAccountId },
            data: {
              accountNumber: paymentDetails.accountNumber,
              accountName: paymentDetails.accountName || 'Landlord',
              bankName: paymentDetails.bankName || '',
              bankCode: paymentDetails.bankCode,
            }
          })
        } else {
          const account = await this.prisma.upward_manual_account.create({
            data: {
              accountNumber: paymentDetails.accountNumber,
              accountName: paymentDetails.accountName || 'Landlord',
              bankName: paymentDetails.bankName || '',
              bankCode: paymentDetails.bankCode,
            }
          })
          await this.prisma.upward_user_property.update({
            where: { id: savedProperty.id },
            data: { manualAccountId: account.id }
          })
        }
      } catch (e: any) {
        this.logger.warn(`Failed to save manual account: ${e.message}`)
      }
    }

    // ── Create upward_tenant_join_request with onboarding proof evidence (no payment records created) ──
    let joinRequest: any = null;
    if (pm?.id) {
      try {
        if ((this.prisma as any).upward_tenant_join_request) {
          joinRequest = await (this.prisma as any).upward_tenant_join_request.create({
            data: {
              ownerPmId: pm.id,
              userId: fullUser.id,
              userPropertyId: savedProperty.id,
              status: 'PENDING',
              address: unitDetails.address,
              area: unitDetails.area,
              subarea: unitDetails.subarea || null,
              state: unitDetails.state,
              country: unitDetails.country || 'Nigeria',
              rentAmount: unitDetails.rentAmount,
              rentType: unitDetails.rentType || 'Annually',
              rentStartDate: new Date(unitDetails.rentStartDate),
              rentEndDate: new Date(unitDetails.rentEndDate),
              tenancyStatus: unitDetails.tenancyStatus || 'NEW_CYCLE',
              initialAmountPaid: unitDetails.initialAmountPaid || 0,
              onboardingProofUrl: onboardingProof?.url || null,
              onboardingProofFileName: onboardingProof?.fileName || null,
              onboardingProofFileType: onboardingProof?.fileType || null,
              onboardingProofFileSize: onboardingProof?.fileSize || null,
            },
          });
        }
      } catch (err: any) {
        this.logger.warn(`Failed to create upward_tenant_join_request: ${err.message}`);
      }
    }

    // If linked to an external platform company, dispatch property_verification.requested webhook
    if (matchedPlatformId && matchedCompany && savedProperty?.uuid) {
      const decryptedUserEmail = fullUser.email ? (this.encryption.decrypt(fullUser.email).includes('@') ? this.encryption.decrypt(fullUser.email) : fullUser.email) : '';
      const decryptedUserPhone = fullUser.phone ? this.encryption.decrypt(fullUser.phone) : null;
      const decryptedCompName = matchedCompany.name ? this.encryption.decrypt(matchedCompany.name) : '';
      const decryptedCompEmail = matchedCompany.email ? this.encryption.decrypt(matchedCompany.email) : null;
      const decryptedMgrFirst = matchedManager?.firstName ? this.encryption.decrypt(matchedManager.firstName) : '';
      const decryptedMgrLast = matchedManager?.lastName ? this.encryption.decrypt(matchedManager.lastName) : '';
      const decryptedMgrEmail = matchedManager?.email ? this.encryption.decrypt(matchedManager.email) : null;
      const decryptedMgrPhone = matchedManager?.phone ? this.encryption.decrypt(matchedManager.phone) : null;

      const webhookPayload = {
        propertyUuid: savedProperty.uuid,
        targetContext: {
          company: {
            uuid: matchedCompany.uuid,
            name: decryptedCompName,
            email: decryptedCompEmail,
          },
          manager: matchedManager ? {
            uuid: matchedManager.uuid,
            name: `${decryptedMgrFirst} ${decryptedMgrLast}`.trim() || 'Property Manager',
            email: decryptedMgrEmail,
            phone: decryptedMgrPhone,
          } : null,
        },
        tenant: {
          userUuid: fullUser.uuid,
          firstName: decryptedFirstName,
          lastName: decryptedLastName,
          email: decryptedUserEmail,
          phone: decryptedUserPhone,
        },
        claimedDetails: {
          address: unitDetails.address,
          area: unitDetails.area,
          subarea: unitDetails.subarea || '',
          state: unitDetails.state,
          country: unitDetails.country,
          rentAmount: unitDetails.rentAmount,
          rentType: unitDetails.rentType || 'Annually',
          rentStartDate: unitDetails.rentStartDate,
          rentEndDate: unitDetails.rentEndDate,
          initialAmountPaid: unitDetails.initialAmountPaid || 0,
          tenancyStatus: unitDetails.tenancyStatus || 'NEW_CYCLE',
        },
        createdAt: new Date().toISOString(),
      };

      await this.webhookService.sendWebhook(
        matchedPlatformId,
        'property_verification.requested',
        webhookPayload,
      ).catch((err: any) => this.logger.error(`Failed to send property_verification.requested webhook: ${err.message}`));
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
      userProperty: {
        id: savedProperty.id,
        uuid: savedProperty.uuid,
      },
      message: (pm || matchedCompany)
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
