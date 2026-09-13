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

  async execute(pmId: number, uuid: string, data: UpdateTenantDto, actor?: any): Promise<TenantEntity> {
    const ownerPmId = actor ? actor.ownerPmId : pmId;
    const tenant = await this.tenantRepo.findByUuid(uuid);
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.pmId !== ownerPmId) {
      throw new NotFoundException('Tenant not found');
    }

    if (actor?.isEmployee && actor.accessLevel !== 'ALL') {
      if (!actor.employeeId) {
        throw new NotFoundException('Tenant not found');
      }

      const assignedLinks = await (this.prisma as any).upward_pm_employee_property.findMany({
        where: {
          employeeId: actor.employeeId,
          ownerPmId: actor.ownerPmId,
        },
        select: { propertyId: true },
      });

      const propertyIds = new Set(assignedLinks.map((al: any) => al.propertyId));
      const hasUnitInAssigned = tenant.units?.some((u: any) => propertyIds.has(u.propertyId));

      if (!hasUnitInAssigned) {
        throw new NotFoundException('Tenant not found');
      }
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
