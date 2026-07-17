import { Inject, Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PM_TENANT_REPOSITORY, ITenantRepository, TenantEntity } from '../../../../domains/pm/IPropertyRepository';
import { USER_REPOSITORY, UserRepository } from '../../../../domains/users/user.repository';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';
import { InviteTenantUseCase } from './invite-tenant.use-case';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

export interface CreateTenantDto {
  commercialName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  otherPhone?: string;
  units?: string[]; // Optional unit UUIDs to assign immediately
  deliveryChannel?: 'EMAIL' | 'SMS' | 'WHATSAPP';
}

@Injectable()
export class CreateTenantUseCase {
  constructor(
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    private readonly encryption: EncryptionService,
    private readonly inviteTenantUseCase: InviteTenantUseCase,
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmId: number, data: CreateTenantDto): Promise<TenantEntity> {
    const hasIndividualName = !!data.firstName?.trim() || !!data.lastName?.trim();
    const hasCommercialName = !!data.commercialName?.trim();
    if (!hasIndividualName && !hasCommercialName) {
      throw new BadRequestException('A tenant must have either a first/last name or a commercial/business name.');
    }

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
          throw new BadRequestException('Nigerian phone number must be in format +2348000000000 or 08000000000');
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
          throw new BadRequestException('Nigerian alternative phone number must be in format +2348000000000 or 08000000000');
        }
      } else {
        if (!/^\+\d{7,15}$/.test(cleaned)) {
          throw new BadRequestException('International alternative phone number must start with + followed by 7 to 15 digits');
        }
      }
      
      data.otherPhone = cleaned;
    }

    let ownerPmId = pmId;
    if (data.units && data.units.length > 0) {
      const firstUnit = await this.prisma.upward_pm_unit.findFirst({
        where: { uuid: data.units[0] },
        include: { property: true }
      });
      if (firstUnit?.property?.pmId) {
        ownerPmId = firstUnit.property.pmId;
      }
    }

    let tenant: TenantEntity | null = null;
    let existingUser: any = null;

    if (data.email) {
      const emailHash = this.encryption.hash(data.email);
      tenant = await this.tenantRepo.findByEmailHash(ownerPmId, emailHash);
      existingUser = await this.userRepo.findByEmail(data.email);
    } 
    
    if (!tenant && data.phone) {
      const phoneHash = this.encryption.hash(data.phone);
      tenant = await this.tenantRepo.findByPhoneHash(ownerPmId, phoneHash);
      if (!existingUser) {
        existingUser = await this.userRepo.findByPhone(data.phone);
      }
    }

    if (!tenant) {
      const initialStatus = existingUser ? 'ON_UPWARD' : 'PENDING';
      const { units, ...tenantData } = data;
      tenant = await this.tenantRepo.create({
        pmId: ownerPmId,
        ...tenantData,
        inviteStatus: initialStatus,
        inviteSentAt: null,
      });
    }

    this.inviteTenantUseCase.execute(ownerPmId, tenant.uuid, data.deliveryChannel).catch((error) => {
      console.error(`[CreateTenantUseCase] Failed to auto-sync/invite tenant ${tenant.uuid}:`, error);
    });

    // Join-request resolution only makes sense when an email is present
    if (data.email) {
      try {
        const logs = await this.prisma.upward_pm_activity_log.findMany({
          where: {
            ownerPmId: ownerPmId,
            action: 'TENANT_JOIN_REQUEST',
          },
        });

        for (const log of logs) {
          const metadata = log.metadata as any;
          if (metadata && metadata.status === 'PENDING') {
            let matches = false;
            try {
              const decryptedEmail = this.encryption.decrypt(metadata.userEmail);
              if (decryptedEmail && decryptedEmail.toLowerCase() === data.email.toLowerCase()) {
                matches = true;
              }
            } catch (e) {
              // ignore decryption error
            }

            if (matches) {
              // Mark request as accepted
              metadata.status = 'ACCEPTED';
              await this.prisma.upward_pm_activity_log.update({
                where: { id: log.id },
                data: { metadata },
              });


              if (existingUser) {
                const pendingProp = await this.prisma.upward_user_property.findFirst({
                  where: {
                    userId: existingUser.id!,
                    pmId: ownerPmId,
                    verificationStatus: 'PENDING',
                  },
                  orderBy: { createdAt: 'desc' }
                });

                if (pendingProp) {
                  await this.prisma.upward_user_property.update({
                    where: { id: pendingProp.id },
                    data: {
                      isVerified: true,
                      verificationStatus: 'VERIFIED',
                    }
                  });
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('[CreateTenantUseCase] Failed to resolve pending join request:', err);
      }
    }

    return tenant;
  }
}
