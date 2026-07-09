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

    let success = true;
    const pmName = pm.businessName || `${pm.firstName} ${pm.lastName}`;
    const displayName = tenant.commercialName ||
        `${tenant.firstName || ''} ${tenant.lastName || ''}`.trim() ||
        'Tenant';

    // Decide channel based on preference and fallback
    let actualChannel = deliveryChannel;
    if (!actualChannel) {
      if (tenant.email && !tenant.email.endsWith('@upward.com')) actualChannel = 'EMAIL';
      else if (tenant.phone) actualChannel = 'SMS';
    }

    if (!isActuallyOnUpward) {
      if (actualChannel === 'EMAIL' && tenant.email && !tenant.email.endsWith('@upward.com')) {
        success = await this.emailService.sendTenantInvite({
          email: tenant.email,
          tenantName: displayName,
          pmName: pmName,
          pmType: pm.pmType,
          inviteLink: inviteResult.inviteLink,
          pmUuid: pm.uuid,
        });
      } else if (actualChannel === 'WHATSAPP' && tenant.phone) {
        const companyName = pm.businessName || 'Upward';
        const managerName = `${pm.firstName} ${pm.lastName}`.trim();
        const message = `Hi *${displayName}*,
 
${managerName} at ${companyName} has invited you to join Upward, your new platform for rent payments and tenancy management.
 
Your rent payments can now do more than pay for your home—they can work for you.
 
With Upward you can:
 
✅ Build a verified rental credibility profile from your payment history.
✅ Keep your rental history even when you move.
✅ Access your rent records and receipts anytime.
 
*Good news:* We'll import your previous rent payment history, so you won't be starting from scratch.
 
Getting started takes just a few minutes.
 
👉 *Accept your invitation and activate your Upward account today:* ${inviteResult.inviteLink}
 
Welcome to a more rewarding rental experience.


*The ${companyName} Team*`;
        success = await this.whatsappService.sendMessage({
          to: tenant.phone,
          message: message,
        });
      } else if ((actualChannel === 'SMS' || actualChannel === 'WHATSAPP') && tenant.phone && tenant.phone.startsWith('+234')) {
        // Fallback to SMS if WHATSAPP requested but fails/invalid, or explicitly SMS
        const message = `Hi ${displayName}, ${pmName} has invited you to join Upward. Build your credit score, earn rewards for on-time payments, and verify your tenancy history effortlessly with Upward. Claim your account here: ${inviteResult.inviteLink}`;
        success = await this.smsService.sendSms({
          to: tenant.phone,
          message: message,
        });
      } else {
        // Assume success if no valid contact info for actual sending but internal DB operations worked
        success = true;
      }
    } else {
      // User is already on Upward, send a notification instead of an invite
      const loginUrl = 'https://upward.goodtenants.io/login';
      
      if (actualChannel === 'WHATSAPP' && tenant.phone) {
        const companyName = pm.businessName || 'Upward';
        const managerName = `${pm.firstName} ${pm.lastName}`.trim();
        const message = `Hi *${displayName}*,
 
${managerName} at ${companyName} has just added a new property unit for you on Upward. 
 
You can now manage your tenancy and track your rent payments for this unit directly from your Upward dashboard.
 
👉 *Log in to your Upward account to view your new property details:* ${loginUrl}
 
*The ${companyName} Team*`;
        success = await this.whatsappService.sendMessage({
          to: tenant.phone,
          message: message,
        });
      } else if ((actualChannel === 'SMS' || actualChannel === 'WHATSAPP') && tenant.phone && tenant.phone.startsWith('+234')) {
        const message = `Hi ${displayName}, ${pmName} has added a new property unit for you on Upward. Log in to your Upward account at ${loginUrl} to view your property details and manage your rent payments.`;
        success = await this.smsService.sendSms({
          to: tenant.phone,
          message: message,
        });
      } else if (actualChannel === 'EMAIL' && tenant.email && !tenant.email.endsWith('@upward.com')) {
        const subject = `New Property Unit Added by ${pmName}`;
        const content = `<p>Hi ${displayName},</p><p>${pmName} has just added a new property unit for you on Upward.</p><p>You can now manage your tenancy and track your rent payments for this unit directly from your Upward dashboard.</p><p><a href="${loginUrl}">Log in to your Upward account</a> to view your new property details.</p>`;
        await this.emailService.sendGenericEmail(tenant.email, subject, content);
        success = true;
      } else {
        success = true;
      }
    }

    if (success) {
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
          }
        }
      }
    } else {
      throw new Error('Failed to send invitation email');
    }
  }
}
