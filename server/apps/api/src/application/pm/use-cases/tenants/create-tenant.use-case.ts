import { Inject, Injectable, BadRequestException, ConflictException } from '@nestjs/common';
import { PM_TENANT_REPOSITORY, ITenantRepository, TenantEntity } from '../../../../domains/pm/IPropertyRepository';
import { USER_REPOSITORY, UserRepository } from '../../../../domains/users/user.repository';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';
import { InviteTenantUseCase } from './invite-tenant.use-case';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';

export interface CreateTenantDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  units?: string[]; // Optional unit UUIDs to assign immediately
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
    if (data.phone) {
      let cleaned = data.phone.trim().replace(/\s+/g, '');
      
      if (cleaned.startsWith('0') && cleaned.length === 11) {
        cleaned = '+234' + cleaned.substring(1);
      } 
      // Handle 10-digit format without prefix: 80... (10 digits)
      else if (!cleaned.startsWith('+') && cleaned.length === 10) {
        cleaned = '+234' + cleaned;
      }

      if (!/^\+234\d{10}$/.test(cleaned)) {
        throw new BadRequestException('Phone number must be in format +2348000000000 or 08000000000');
      }
      
      data.phone = cleaned;
    }

    // Check for duplicate tenant for this PM
    const emailHash = this.encryption.hash(data.email);
    const existingTenant = await this.tenantRepo.findByEmailHash(pmId, emailHash);
    
    const existingUser = await this.userRepo.findByEmail(data.email);
    const initialStatus = existingUser ? 'ON_UPWARD' : 'PENDING';

    let tenant: TenantEntity;

    if (existingTenant) {
      tenant = existingTenant;
    } else {
      const { units, ...tenantData } = data;
      tenant = await this.tenantRepo.create({
        pmId,
        ...tenantData,
        inviteStatus: initialStatus,
        inviteSentAt: null,
      });
    }

    this.inviteTenantUseCase.execute(pmId, tenant.uuid).catch((error) => {
      console.error(`[CreateTenantUseCase] Failed to auto-sync/invite tenant ${tenant.uuid}:`, error);
    });

    try {
      const logs = await this.prisma.upward_pm_activity_log.findMany({
        where: {
          ownerPmId: pmId,
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
                  pmId: pmId,
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

    return tenant;
  }
}

