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
  ) { }

  async execute(pmId: number, tenantUuid: string): Promise<void> {
    const tenant = await this.tenantRepo.findByUuid(tenantUuid);
    if (!tenant || tenant.pmId !== pmId) {
      throw new NotFoundException('Tenant not found');
    }

    if (!tenant.email) {
      throw new Error('Tenant has no email address');
    }

    if ((tenant.inviteStatus === 'ON_UPWARD' || tenant.inviteStatus === 'ACCEPTED') && (!tenant.units || tenant.units.length === 0)) {
      return;
    }

    const pm = await this.pmRepo.findById(pmId);
    if (!pm) throw new NotFoundException('Property Manager not found');

    const existingUser = await this.userRepo.findByEmail(tenant.email);
    
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

    // Generate platform invite link using SingleInviteUseCase
    const invitePayload: InviteRequest = {
      company: {
        name: pm.businessName || 'UPWARD',
      },
      invite: {
        user: {
          email: tenant.email,
          firstName: tenant.firstName || '',
          lastName: tenant.lastName || '',
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
    if (!isActuallyOnUpward) {
      if (tenant.email.endsWith('@upward.com')) {
        success = true;
      } else {
        success = await this.emailService.sendTenantInvite({
          email: tenant.email,
          tenantName: `${tenant.firstName} ${tenant.lastName}`.trim() || 'Tenant',
          pmName: pm.businessName || `${pm.firstName} ${pm.lastName}`,
          pmType: pm.pmType,
          inviteLink: inviteResult.inviteLink,
          pmUuid: pm.uuid,
        });
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
