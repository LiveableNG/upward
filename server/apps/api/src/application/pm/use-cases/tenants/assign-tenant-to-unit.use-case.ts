import { Inject, Injectable, NotFoundException, Logger } from '@nestjs/common';
import { 
  PM_UNIT_REPOSITORY, 
  IUnitRepository, 
  PM_TENANT_REPOSITORY,
  ITenantRepository,
  IPropertyRepository, 
  PM_PROPERTY_REPOSITORY 
} from '../../../../domains/pm/IPropertyRepository';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { SyncUnitToUpwardUseCase } from '../units/sync-unit.use-case';
import { USER_REPOSITORY, UserRepository } from '../../../../domains/users/user.repository';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';
import { CreatePmPaymentRequestUseCase } from '../payments/create-pm-payment-request.use-case';

@Injectable()
export class AssignTenantToUnitUseCase {
  private readonly logger = new Logger(AssignTenantToUnitUseCase.name);

  constructor(
    @Inject(PM_UNIT_REPOSITORY)
    private readonly unitRepo: IUnitRepository,
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepo: IPropertyRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    private readonly prisma: PrismaService,
    private readonly syncUnitToUpwardUseCase: SyncUnitToUpwardUseCase,
    private readonly encryption: EncryptionService,
    private readonly createPmPaymentRequestUseCase: CreatePmPaymentRequestUseCase,
  ) {}

  async execute(
    pmId: number, 
    unitUuid: string, 
    tenantUuid: string | null, 
    rentAmountPaid?: number,
    rentAmount?: number,
    rentType?: string,
    rentStartDate?: Date,
    rentDueDate?: Date,
    isFullyPaid?: boolean
  ): Promise<void> {
    const unit = await this.unitRepo.findByUuid(unitUuid);
    if (!unit) throw new NotFoundException('Unit not found');

    const property = await this.propertyRepo.findById(unit.propertyId);
    if (!property) throw new NotFoundException('Property not found');

    const hasAccess = await this.propertyRepo.hasAccessToProperty(pmId, property.id);
    if (!hasAccess) throw new NotFoundException('Unit not found or unauthorized');

    if (tenantUuid) {
      const tenant = await this.tenantRepo.findByUuid(tenantUuid);
      if (!tenant || (tenant.pmId !== pmId && tenant.pmId !== property.pmId)) {
        throw new NotFoundException('Tenant not found');
      }
      const effectiveRentAmount = rentAmount !== undefined ? rentAmount : unit.rentAmount;

      await this.unitRepo.update(unitUuid, {
        tenantId: tenant.id,
        status: 'OCCUPIED',
        rentAmount: effectiveRentAmount,
        rentType: rentType || unit.rentType,
        rentStartDate: rentStartDate || unit.rentStartDate,
        rentDueDate: rentDueDate || unit.rentDueDate,
      });

      const actualRentAmountPaid = isFullyPaid ? effectiveRentAmount : rentAmountPaid;

      if (actualRentAmountPaid !== undefined && actualRentAmountPaid > 0) {
        const activeRentStartDate = rentStartDate || unit.rentStartDate;
        const activeRentType = rentType || unit.rentType;
        
        let periodEnd: Date | null = null;
        if (activeRentStartDate) {
          periodEnd = new Date(activeRentStartDate);
          if (activeRentType === 'Monthly') {
            periodEnd.setMonth(periodEnd.getMonth() + 1);
          } else {
            periodEnd.setFullYear(periodEnd.getFullYear() + 1);
          }
          periodEnd.setDate(periodEnd.getDate() - 1);
        }

        await this.unitRepo.addRentPayment(unitUuid, {
          amount: actualRentAmountPaid,
          rentAmountAtPayment: effectiveRentAmount,
          paymentDate: new Date(),
          periodStart: activeRentStartDate,
          status: 'SUCCESS',
          method: 'Other',
          notes: 'Initial payment recorded during tenant assignment',
          periodEnd: periodEnd,
          tenantId: tenant.id,
          reference: null
        });
      }

      // ── Resolve Upward user and attempt sync ──────────────────────────────
      const upwardUser = tenant.email ? await this.userRepo.findByEmail(tenant.email) : null;

      let syncSucceeded = false;
      if (upwardUser || tenant.inviteStatus === 'ON_UPWARD' || tenant.inviteStatus === 'ACCEPTED') {
        try {
          await this.syncUnitToUpwardUseCase.execute(unitUuid, pmId);
          syncSucceeded = true;
        } catch (error) {
          console.error(`Auto-sync failed for unit ${unitUuid} during assignment:`, error);
        }
      }

      if (isFullyPaid === false) {
        const effectivePaid = rentAmountPaid ?? 0;
        const remainingAmount = effectiveRentAmount - effectivePaid;

        const freshUnit = await this.unitRepo.findByUuid(unitUuid);
        const isUnitSynced = freshUnit?.isSynced && !!freshUnit?.userPropertyUuid;

        if (syncSucceeded && isUnitSynced) {

          await this.autoCreateInitialPR(
            pmId, unitUuid, remainingAmount,
            rentType || unit.rentType,
            rentStartDate || unit.rentStartDate,
            rentDueDate || unit.rentDueDate,
          );
        } else {
          this.logger.log(`Unit ${unitUuid}: deferring initial PR (pendingInitialPrAmount=${remainingAmount})`);
          await this.unitRepo.update(unitUuid, { pendingInitialPrAmount: remainingAmount });
        }
      }
      // ─────────────────────────────────────────────────────────────────────

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

            if (tenant.email) {
              try {
                const decryptedEmail = this.encryption.decrypt(metadata.userEmail);
                if (decryptedEmail && decryptedEmail.toLowerCase() === tenant.email.toLowerCase()) {
                  matches = true;
                }
              } catch (e) {
                // ignore decryption error
              }
            }

            // 2. Try matching by userUuid
            if (upwardUser && metadata.userUuid === upwardUser.uuid) {
              matches = true;
            }

            if (matches) {
              metadata.status = 'ACCEPTED';
              await this.prisma.upward_pm_activity_log.update({
                where: { id: log.id },
                data: { metadata },
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to resolve pending join request log during assignment:', err);
      }
    } else {
      if (unit.isSynced && unit.userPropertyUuid) {
        await this.prisma.upward_user_property.updateMany({
          where: { uuid: unit.userPropertyUuid },
          data: {
            isVerified: false,
            isPastTenancy: true
          }
        });
      }

      await this.unitRepo.update(unitUuid, { 
        tenantId: null,
        status: 'VACANT',
        isSynced: false,
        userPropertyUuid: null
      });
    }
  }

  private async autoCreateInitialPR(
    pmId: number,
    unitUuid: string,
    remainingAmount: number,
    rentType: string | null | undefined,
    rentStartDate: Date | null | undefined,
    rentDueDate: Date | null | undefined,
  ): Promise<void> {
    try {
      const dueDate = rentDueDate?.toISOString() || new Date().toISOString();
      await this.createPmPaymentRequestUseCase.execute(pmId, {
        unitUuid,
        amount: remainingAmount,
        dueDate,
        rentStartDate: rentStartDate?.toISOString(),
        rentEndDate: rentDueDate?.toISOString(),
        rentType: rentType || undefined,
        description: 'Outstanding rent balance — initial payment recorded',
        silent: true,
        bypassWelcomeCheck: true,
      });
      this.logger.log(`Auto-created initial balance PR for unit ${unitUuid}, amount=${remainingAmount}`);
    } catch (err: any) {
      this.logger.error(`Failed to auto-create initial PR for unit ${unitUuid}: ${err.message}`);
    }
  }
}
