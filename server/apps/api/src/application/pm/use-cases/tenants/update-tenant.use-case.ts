import { Inject, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PM_TENANT_REPOSITORY, ITenantRepository, TenantEntity } from '../../../../domains/pm/IPropertyRepository';
import { InviteTenantUseCase } from './invite-tenant.use-case';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

export interface UpdateTenantDto {
  commercialName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  otherPhone?: string;
  formerAddress?: string;
  nextOfKinName?: string;
  nextOfKinEmail?: string;
  nextOfKinPhone?: string;
  guarantorName?: string;
  guarantorEmail?: string;
  guarantorPhone?: string;
  emergencyContactName?: string;
  emergencyContactEmail?: string;
  emergencyContactPhone?: string;
}

@Injectable()
export class UpdateTenantUseCase {
  constructor(
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    private readonly inviteTenantUseCase: InviteTenantUseCase,
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmId: number, uuid: string, data: UpdateTenantDto): Promise<TenantEntity> {
    const tenant = await this.tenantRepo.findByUuid(uuid);
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

    const oldEmail = tenant.email;

    if (data.phone) {
      let cleaned = data.phone.trim().replace(/\s+/g, '');
      
      if (!cleaned.startsWith('+')) {
        if (cleaned.startsWith('0') && cleaned.length === 11) {
          cleaned = '+234' + cleaned.substring(1);
        } else if (cleaned.length === 10) {
          cleaned = '+234' + cleaned;
        }
      }

      if (cleaned.startsWith('+234')) {
        if (!/^\+234\d{10}$/.test(cleaned)) {
          throw new BadRequestException('Phone number must be in format +2348000000000 or 08000000000');
        }
      } else {
        if (!/^\+\d{7,15}$/.test(cleaned)) {
          throw new BadRequestException('International phone number must start with + followed by 7 to 15 digits');
        }
      }
      
      data.phone = cleaned;
    }

    if (data.otherPhone) {
      let cleaned = data.otherPhone.trim().replace(/\s+/g, '');
      
      if (!cleaned.startsWith('+')) {
        if (cleaned.startsWith('0') && cleaned.length === 11) {
          cleaned = '+234' + cleaned.substring(1);
        } else if (cleaned.length === 10) {
          cleaned = '+234' + cleaned;
        }
      }

      if (cleaned.startsWith('+234')) {
        if (!/^\+234\d{10}$/.test(cleaned)) {
          throw new BadRequestException('Other phone number must be in format +2348000000000 or 08000000000');
        }
      } else {
        if (!/^\+\d{7,15}$/.test(cleaned)) {
          throw new BadRequestException('International alternative phone number must start with + followed by 7 to 15 digits');
        }
      }
      
      data.otherPhone = cleaned;
    }

    const updatedTenant = await this.tenantRepo.update(uuid, data);

    if (
      oldEmail?.endsWith('@upward.com') &&
      data.email &&
      !data.email.endsWith('@upward.com')
    ) {
      try {
        await this.inviteTenantUseCase.execute(pmId, uuid);
      } catch (err: any) {
        console.error(`Failed to send auto-invite to updated tenant ${uuid}:`, err.message);
      }
    }

    return updatedTenant;
  }
}
