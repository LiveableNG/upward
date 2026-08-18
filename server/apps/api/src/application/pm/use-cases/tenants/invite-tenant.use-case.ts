import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  PM_TENANT_REPOSITORY,
  ITenantRepository,
  PM_UNIT_REPOSITORY,
  IUnitRepository
} from '../../../../domains/pm/IPropertyRepository';
import { USER_REPOSITORY, UserRepository, PASS_PLACEHOLDERS } from '../../../../domains/users/user.repository';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../../domains/pm/property-manager.repository';
import { EmailService } from '../../../../shared/infrastructure/email/email.service';
import { SingleInviteUseCase, InviteRequest } from '../../../use-cases/external/single-invite.use-case';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

import { SmsService } from '../../../../shared/infrastructure/sms/sms.service';
import { WhatsappService } from '../../../../shared/infrastructure/whatsapp/whatsapp.service';
import { UnifiedCommunicationService } from '../../../../shared/infrastructure/communication/unified-communication.service';

@Injectable()
export class InviteTenantUseCase {
  constructor(
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepo: IUnitRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepo: PropertyManagerRepository,
    private readonly emailService: EmailService,
    private readonly singleInviteUseCase: SingleInviteUseCase,
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    private readonly whatsappService: WhatsappService,
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) { }

  async execute(pmId: number, tenantUuid: string, deliveryChannel?: 'EMAIL' | 'SMS' | 'WHATSAPP'): Promise<void> {
    const tenant = await this.tenantRepo.findByUuid(tenantUuid);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    // Check collaborator access
    let hasAccess = tenant.pmId === pmId;
    if (!hasAccess) {
      // Check if team collaborator with ALL access
      const teamCollab = await this.prisma.upward_pm_team_collaboration.findFirst({
        where: {
          collaboratorPmId: pmId,
          ownerPmId: tenant.pmId,
          status: 'ACCEPTED',
          accessLevel: 'ALL'
        }
      });
      if (teamCollab) {
        hasAccess = true;
      }

      // Check if custom property collaborator
      if (!hasAccess) {
        const tenantPropertyIds = tenant.units?.map(u => u.propertyId) || [];
        if (tenantPropertyIds.length > 0) {
          const propCollab = await this.prisma.upward_pm_property_collaboration.findFirst({
            where: {
              collaboratorPmId: pmId,
              propertyId: { in: tenantPropertyIds }
            }
          });
          if (propCollab) {
            hasAccess = true;
          }
        }
      }
    }

    if (!hasAccess) {
      throw new NotFoundException('Tenant not found');
    }

    if (!tenant.email && !tenant.phone) {
      throw new Error('Tenant has no email or phone address');
    }

    if ((tenant.inviteStatus === 'ON_UPWARD' || tenant.inviteStatus === 'ACCEPTED') && (!tenant.units || tenant.units.length === 0)) {
      return;
    }

    const pm = await this.pmRepo.findById(tenant.pmId);
    if (!pm) throw new NotFoundException('Property Manager not found');

    const existingUser = tenant.email ? await this.userRepo.findByEmail(tenant.email) : await this.userRepo.findByPhone(tenant.phone!);
    
    const isActuallyOnUpward = existingUser && 
      existingUser.passwordHash !== PASS_PLACEHOLDERS.INVITED && 
      existingUser.passwordHash !== PASS_PLACEHOLDERS.SHADOW;

    const initialStatus = isActuallyOnUpward ? 'ON_UPWARD' : 'SENT';

    if (isActuallyOnUpward) {
      // User already exists, update status immediately
      await this.tenantRepo.update(tenantUuid, {
        inviteStatus: 'ON_UPWARD',
      });
    }

    const derivedFirstName = tenant.firstName ||
      (tenant.commercialName ? tenant.commercialName : '');
    const derivedLastName = tenant.lastName ||
      (tenant.commercialName ? '(Commercial)' : '');

    const invitePayload: InviteRequest = {
      company: {
        name: pm.businessName || 'UPWARD',
      },
      invite: {
        user: {
          email: tenant.email || '',
          firstName: derivedFirstName,
          lastName: derivedLastName,
          phone: tenant.phone || '',
        },
        properties: await Promise.all((tenant.units || []).map(async unit => {
          const payments = await this.unitRepo.getRentPayments(unit.uuid);
          return {
            location: {
              country: unit.property?.country || 'Nigeria',
              state: unit.property?.state || '',
              area: unit.property?.area || unit.property?.name || 'Property',
              address: unit.property?.address || '',
            },
            rent: {
              rentAmount: unit.rentAmount,
              rentStartDate: unit.rentStartDate ? new Date(unit.rentStartDate).toISOString() : undefined,
              rentEndDate: unit.rentDueDate ? new Date(unit.rentDueDate).toISOString() : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            },
            rentHistory: payments.map(p => ({
              amount: p.amount,
              paymentDate: p.paymentDate.toISOString(),
              periodStart: p.periodStart?.toISOString(),
              periodEnd: p.periodEnd?.toISOString(),
              notes: p.notes || undefined
            })),
            manager: {
              firstName: pm.firstName,
              lastName: pm.lastName,
              email: pm.email,
              phone: pm.phone || undefined,
            }
          };
        }))
      }
    };

    const inviteResult = await this.singleInviteUseCase.execute(invitePayload);

    const pmName = pm.businessName || `${pm.firstName} ${pm.lastName}`;
    const displayName = tenant.commercialName ||
        `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() ||
        'Tenant';

    const communicationType = isActuallyOnUpward ? 'RECORD_ADDED' : 'TENANT_INVITE';

    if (deliveryChannel) {
      await this.tenantRepo.update(tenantUuid, { channel: deliveryChannel });
    }

    await this.tenantRepo.update(tenantUuid, {
      inviteStatus: initialStatus,
      inviteSentAt: !isActuallyOnUpward ? new Date() : tenant.inviteSentAt,
    });

    if (tenant.units && inviteResult.properties) {
      for (let i = 0; i < tenant.units.length; i++) {
        const unit = tenant.units[i];
        const syncedProp = inviteResult.properties[i];
        if (unit && syncedProp) {
          await this.unitRepo.update(unit.uuid, {
            isSynced: true,
            userPropertyUuid: syncedProp.uuid
          });
          await this.prisma.upward_user_property.update({
            where: { uuid: syncedProp.uuid },
            data: { 
              pmUnitId: unit.id,
              pmId: pmId,
            }
          });
        }
      }
    }

    this.unifiedCommService.dispatch({
      recipientEmail: tenant.email || undefined,
      recipientPhone: tenant.phone || undefined,
      recipientName: displayName,
      recipientRole: 'TENANT',
      pmUuid: pm.uuid,
      type: communicationType,
      forceChannel: (deliveryChannel || tenant.channel || undefined) as 'EMAIL' | 'SMS' | 'WHATSAPP' | undefined,
      context: {
        displayName,
        pmName,
        managerName: `${pm.firstName} ${pm.lastName}`.trim(),
        companyName: pm.businessName || 'Upward',
        pmRole: pm.pmType,
        inviteLink: inviteResult.inviteLink,
        invitePath: new URL(inviteResult.inviteLink).pathname.slice(1),
        propertyAddress: tenant.units?.[0]?.property?.address || 'Property',
        frontendUrl: 'https://upward.goodtenants.io',
      },
    });
  }
}
