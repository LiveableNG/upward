import { 
  Inject, 
  Injectable, 
  NotFoundException, 
  BadRequestException, 
  ConflictException, 
  Logger 
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
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
import { ActivityLogService, ActivityAction } from '../../../../shared/application/activity-log.service';

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
    private readonly activityLog: ActivityLogService,
    private readonly eventEmitter: EventEmitter2,
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
    isFullyPaid?: boolean,
    actor?: any,
    joinRequestUuid?: string,
    pmAcknowledgedAmountPaid?: number,
    breakdown?: {
      platformAmount?: number;
      offlineAmount?: number;
      platformPaymentIds?: number[];
    },
    receiptDecision?: 'APPROVED' | 'REJECTED',
    timeliness?: 'ON_TIME' | 'LATE',
    rejectionReason?: string,
  ): Promise<any> {
    const ownerPmId = actor ? actor.ownerPmId : pmId;
    const unit = await this.unitRepo.findByUuid(unitUuid);
    if (!unit) throw new NotFoundException('Unit not found');

    const property = await this.propertyRepo.findById(unit.propertyId);
    if (!property) throw new NotFoundException('Property not found');

    const hasAccess = await this.propertyRepo.hasAccessToProperty(ownerPmId, property.id, actor);
    if (!hasAccess) throw new NotFoundException('Unit not found or unauthorized');

    if (tenantUuid) {
      const tenant = await this.tenantRepo.findByUuid(tenantUuid);
      if (!tenant || (tenant.pmId !== ownerPmId && tenant.pmId !== property.pmId)) {
        throw new NotFoundException('Tenant not found');
      }

      // ── 1. Strict Input Validations & Decision Handling ────────────────────
      const effectiveRentAmount = rentAmount !== undefined ? rentAmount : unit.rentAmount;
      if (!effectiveRentAmount || effectiveRentAmount <= 0) {
        throw new BadRequestException('Confirmed rent amount must be greater than 0.');
      }

      // If PM explicitly rejected the receipt, zero out offline claimed amount
      const rawPlatform = Math.max(0, breakdown?.platformAmount ?? 0);
      let effectiveAcknowledgedOffline = 0;

      if (receiptDecision === 'REJECTED') {
        effectiveAcknowledgedOffline = 0;
        isFullyPaid = (rawPlatform >= effectiveRentAmount && effectiveRentAmount > 0);
      } else {
        const declaredPaid = pmAcknowledgedAmountPaid !== undefined ? pmAcknowledgedAmountPaid : (rentAmountPaid ?? 0);
        effectiveAcknowledgedOffline = isFullyPaid ? Math.max(0, effectiveRentAmount - rawPlatform) : Math.max(0, declaredPaid - rawPlatform);
      }

      const acknowledgedTotal = Math.min(effectiveRentAmount, rawPlatform + effectiveAcknowledgedOffline);

      if (acknowledgedTotal < 0) {
        throw new BadRequestException('Acknowledged amount received cannot be negative.');
      }

      const effectivePlatform = Math.min(acknowledgedTotal, rawPlatform);
      const effectiveOffline = Math.max(0, acknowledgedTotal - effectivePlatform);

      const effectiveBreakdown = {
        platformAmount: effectivePlatform,
        offlineAmount: effectiveOffline,
        platformPaymentIds: breakdown?.platformPaymentIds ?? [],
      };

      // ── 2. Race-Safe Atomic Idempotency Check (if join request fulfillment) ──
      if (joinRequestUuid) {
        const lockResult: any[] = await this.prisma.$queryRaw`
          UPDATE upward_pm_activity_log
          SET metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{status}',
            '"PROCESSING"'
          )
          WHERE uuid = ${joinRequestUuid}
            AND "ownerPmId" = ${ownerPmId}
            AND (metadata->>'status' = 'PENDING' OR metadata->>'status' = 'PROCESSING' OR metadata->>'status' IS NULL)
          RETURNING id;
        `;

        if (lockResult.length === 0) {
          const currentLog = await this.prisma.upward_pm_activity_log.findFirst({
            where: { uuid: joinRequestUuid, ownerPmId },
          });
          const currentMeta = currentLog?.metadata as any;
          if (currentMeta?.status === 'ACCEPTED') {
            this.logger.log(`Join request ${joinRequestUuid} already ACCEPTED. Returning idempotent result.`);
            return {
              alreadyProcessed: true,
              unitUuid: currentMeta?.assignedUnitUuid || unitUuid,
              tenantUuid: currentMeta?.assignedTenantUuid || tenantUuid,
              status: 'ACCEPTED',
            };
          }
        }
      }

      try {
        // ── 3. Update Unit State ────────────────────────────────────────────────
        const activeRentStartDate = rentStartDate || unit.rentStartDate;
        const activeRentDueDate = rentDueDate || unit.rentDueDate;
        const activeRentType = rentType || unit.rentType;

        await this.unitRepo.update(unitUuid, {
          tenantId: tenant.id,
          status: 'OCCUPIED',
          rentAmount: effectiveRentAmount,
          rentType: activeRentType,
          rentStartDate: activeRentStartDate,
          rentDueDate: activeRentDueDate,
        });

        // ── 4. Record PM Rent Payment with Provenance & Deterministic Reference ─
        if (acknowledgedTotal > 0) {
          const paymentReference = joinRequestUuid ? `JOIN_ASSIGN_${joinRequestUuid}` : null;
          let existingPayment = null;
          if (paymentReference) {
            existingPayment = await this.prisma.upward_pm_rent_payment.findFirst({
              where: { reference: paymentReference },
            });
          }

          if (!existingPayment) {
            let periodEnd = activeRentDueDate || null;
            if (!periodEnd && activeRentStartDate) {
              periodEnd = new Date(activeRentStartDate);
              if (activeRentType === 'Monthly') {
                periodEnd.setMonth(periodEnd.getMonth() + 1);
              } else {
                periodEnd.setFullYear(periodEnd.getFullYear() + 1);
              }
              periodEnd.setDate(periodEnd.getDate() - 1);
            }

            let paymentMethod = 'Bank Transfer';
            if (effectiveBreakdown.platformAmount > 0 && effectiveBreakdown.offlineAmount > 0) {
              paymentMethod = 'Platform + Offline Reconciled';
            } else if (effectiveBreakdown.platformAmount > 0) {
              paymentMethod = 'Platform (Upward Pay)';
            } else if (effectiveBreakdown.offlineAmount > 0) {
              paymentMethod = 'Offline / Direct';
            }

            const notesObj = {
              reconciliationType: 'JOIN_REQUEST_VERIFICATION',
              joinRequestUuid,
              pmAcknowledgedTotal: acknowledgedTotal,
              breakdown: effectiveBreakdown,
              receiptDecision: receiptDecision || null,
              timeliness: timeliness || 'ON_TIME',
              rejectionReason: rejectionReason || null,
              decidedByPmId: ownerPmId,
              decidedAt: new Date().toISOString(),
            };

            await this.unitRepo.addRentPayment(unitUuid, {
              amount: acknowledgedTotal,
              rentAmountAtPayment: effectiveRentAmount,
              paymentDate: new Date(),
              periodStart: activeRentStartDate,
              periodEnd,
              status: 'SUCCESS',
              method: paymentMethod,
              notes: JSON.stringify(notesObj),
              tenantId: tenant.id,
              reference: paymentReference,
            });
          }
        }

        // ── 5. Resolve Upward User and Sync Unit ────────────────────────────────
        const upwardUser = tenant.email ? await this.userRepo.findByEmail(tenant.email) : null;
        let syncSucceeded = false;
      if (upwardUser || tenant.inviteStatus === 'ON_UPWARD' || tenant.inviteStatus === 'ACCEPTED') {
        try {
          await this.syncUnitToUpwardUseCase.execute(unitUuid, pmId);
          syncSucceeded = true;
        } catch (error) {
          this.logger.error(`Auto-sync failed for unit ${unitUuid} during assignment: ${error}`);
        }
      }

      const freshUnit = await this.unitRepo.findByUuid(unitUuid);

      // ── 6. Scoped PR Reconciliation & User Property Synchronization ────────
      let userPropertyRecord: any = null;
      if (freshUnit?.userPropertyUuid) {
        userPropertyRecord = await this.prisma.upward_user_property.findUnique({
          where: { uuid: freshUnit.userPropertyUuid },
        });
      } else if (upwardUser) {
        userPropertyRecord = await this.prisma.upward_user_property.findFirst({
          where: {
            userId: upwardUser.id,
            pmId: ownerPmId,
            OR: [
              ...(freshUnit?.id ? [{ pmUnitId: freshUnit.id }] : []),
              ...(property?.address ? [{ location: { address: { contains: property.address, mode: 'insensitive' as const } } }] : []),
              { verificationStatus: 'PENDING' },
            ],
          },
          orderBy: { createdAt: 'desc' },
        });
      }

      if (userPropertyRecord) {
        // Cancel existing active rent PRs for this property
        const activeRentPRs = await this.prisma.upward_payment_request.findMany({
          where: {
            userPropertyId: userPropertyRecord.id,
            status: { in: ['PENDING', 'PARTIAL'] },
          },
        });

        for (const apr of activeRentPRs) {
          await this.prisma.upward_payment_request.update({
            where: { id: apr.id },
            data: {
              status: 'CANCELLED',
              description: isFullyPaid
                ? `${apr.description || 'Rent'} [Settled via PM Assignment]`
                : `${apr.description || 'Rent'} [Superseded by PM Assignment]`,
            },
          });
          this.logger.log(`Reconciled and cancelled active PR ${apr.uuid} (previous status was ${apr.status})`);
        }

        // Synchronize upward_user_property with PM confirmed values
        const remainingAmountDue = Math.max(0, effectiveRentAmount - acknowledgedTotal);
        await this.prisma.upward_user_property.update({
          where: { id: userPropertyRecord.id },
          data: {
            rentAmount: effectiveRentAmount,
            rentStartDate: activeRentStartDate,
            rentEndDate: activeRentDueDate,
            rentType: activeRentType,
            amountPaid: acknowledgedTotal,
            amountRemaining: remainingAmountDue,
            isVerified: true,
            verificationStatus: 'VERIFIED',
            isPastTenancy: false,
          },
        });
      }

      // ── 7. Authoritative Balance PR Generation ─────────────────────────────
      const remainingAmount = effectiveRentAmount - acknowledgedTotal;
      if (!isFullyPaid && remainingAmount > 0) {
        const isUnitSynced = freshUnit?.isSynced && !!freshUnit?.userPropertyUuid;
        if (syncSucceeded && isUnitSynced) {
          await this.autoCreateInitialPR(
            pmId,
            unitUuid,
            remainingAmount,
            activeRentType,
            activeRentStartDate,
            activeRentDueDate,
            timeliness || 'ON_TIME',
          );
        } else {
          this.logger.log(`Unit ${unitUuid}: deferring initial PR (pendingInitialPrAmount=${remainingAmount})`);
          await this.unitRepo.update(unitUuid, { pendingInitialPrAmount: remainingAmount });
        }
      }

      // ── 8. Transition Activity Log and Join Request to ACCEPTED with Provenance Decision ─────
      if (joinRequestUuid) {
        const pmDecisionPayload = {
          confirmedRentAmount: effectiveRentAmount,
          rentStartDate: activeRentStartDate ? new Date(activeRentStartDate).toISOString() : null,
          rentDueDate: activeRentDueDate ? new Date(activeRentDueDate).toISOString() : null,
          isFullyPaid: !!isFullyPaid,
          pmAcknowledgedTotal: acknowledgedTotal,
          breakdown,
          receiptDecision: receiptDecision || null,
          timeliness: timeliness || 'ON_TIME',
          rejectionReason: rejectionReason || null,
          remainingRentDue: Math.max(0, effectiveRentAmount - acknowledgedTotal),
          assignedUnitUuid: unitUuid,
          assignedTenantUuid: tenant.uuid,
          decidedAt: new Date().toISOString(),
        };

        await this.prisma.$queryRaw`
          UPDATE upward_pm_activity_log
          SET metadata = jsonb_set(
            jsonb_set(
              jsonb_set(
                COALESCE(metadata, '{}'::jsonb),
                '{status}',
                '"ACCEPTED"'
              ),
              '{assignedUnitUuid}',
              ${JSON.stringify(unitUuid)}::jsonb
            ),
            '{pmDecision}',
            ${JSON.stringify(pmDecisionPayload)}::jsonb
          )
          WHERE uuid = ${joinRequestUuid} AND "ownerPmId" = ${ownerPmId};
        `;

        try {
          await (this.prisma as any).upward_tenant_join_request?.updateMany({
            where: { uuid: joinRequestUuid },
            data: {
              status: 'ACCEPTED',
              receiptDecision: receiptDecision || null,
              timeliness: timeliness || null,
              rejectionReason: rejectionReason || null,
              assignedUnitUuid: unitUuid,
              assignedTenantUuid: tenant.uuid,
              decidedAt: new Date(),
            },
          });
        } catch (e) {
          // ignore if table does not exist yet
        }
      }

      // Only clean up exact duplicate pending join requests for the same property/residence
      try {
        const logs = await this.prisma.upward_pm_activity_log.findMany({
          where: {
            ownerPmId: ownerPmId,
            action: 'TENANT_JOIN_REQUEST',
          },
        });

        for (const log of logs) {
          const metadata = log.metadata as any;
          if (metadata && metadata.status === 'PENDING' && log.uuid !== joinRequestUuid) {
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
            if (upwardUser && metadata.userUuid === upwardUser.uuid) {
              matches = true;
            }

            if (matches) {
              const reqAddr = (metadata.unitDetails?.address || '').toLowerCase().trim();
              const propAddr = (property?.address || '').toLowerCase().trim();
              const propName = (property?.name || '').toLowerCase().trim();
              const isSameProperty = !reqAddr || (propAddr && reqAddr.includes(propAddr)) || (propName && reqAddr.includes(propName));
              
              if (isSameProperty) {
                metadata.status = 'ACCEPTED';
                metadata.assignedUnitUuid = unitUuid;
                await this.prisma.upward_pm_activity_log.update({
                  where: { id: log.id },
                  data: { metadata },
                });
              }
            }
          }
        }
      } catch (err) {
        this.logger.error(`Failed to resolve duplicate pending join request logs during assignment: ${err}`);
      }

      try {
        const tenantName = tenant.firstName
          ? `${this.encryption.decrypt(tenant.firstName)} ${tenant.lastName ? this.encryption.decrypt(tenant.lastName) : ''}`.trim()
          : (tenant.email || 'Tenant');

        await this.activityLog.log({
          pmId: ownerPmId,
          ownerPmId,
          employeeId: actor?.employeeId,
          action: ActivityAction.ASSIGN_TENANT,
          entityType: 'UNIT',
          entityId: unit.id?.toString(),
          description: `Assigned tenant ${tenantName} to unit ${unit.unitName || ''}`,
          metadata: {
            unitUuid,
            unitName: unit.unitName,
            tenantUuid: tenant.uuid,
            tenantName,
            rentAmount: effectiveRentAmount,
            rentType: activeRentType,
          },
        });
      } catch (logErr) {
        this.logger.error(`Failed to log tenant assignment activity: ${logErr}`);
      }

      // ── 9. Emit Event for Durable Background Processing ────────────────────
      this.eventEmitter.emit('pm.tenancy_assigned', {
        joinRequestUuid,
        unitUuid,
        tenantUuid: tenant.uuid,
        userPropertyUuid: freshUnit?.userPropertyUuid,
        pmId: ownerPmId,
      });

        return {
          success: true,
          unitUuid,
          tenantUuid: tenant.uuid,
        };
      } catch (err: any) {
        if (joinRequestUuid) {
          await this.prisma.$queryRaw`
            UPDATE upward_pm_activity_log
            SET metadata = jsonb_set(
              COALESCE(metadata, '{}'::jsonb),
              '{status}',
              '"PENDING"'
            )
            WHERE uuid = ${joinRequestUuid} AND "ownerPmId" = ${ownerPmId} AND metadata->>'status' = 'PROCESSING';
          `.catch(() => {});
        }
        throw err;
      }
    } else {
      if (unit.isSynced && unit.userPropertyUuid) {
        await this.prisma.upward_user_property.updateMany({
          where: { uuid: unit.userPropertyUuid },
          data: {
            isVerified: false,
            isPastTenancy: true,
          },
        });
      }

      await this.unitRepo.update(unitUuid, { 
        tenantId: null,
        status: 'VACANT',
        isSynced: false,
        userPropertyUuid: null,
      });

      try {
        await this.activityLog.log({
          pmId: ownerPmId,
          ownerPmId,
          employeeId: actor?.employeeId,
          action: ActivityAction.UPDATE_UNIT,
          entityType: 'UNIT',
          entityId: unit.id?.toString(),
          description: `Unassigned tenant from unit ${unit.unitName || ''}`,
          metadata: {
            unitUuid,
            unitName: unit.unitName,
          },
        });
      } catch (logErr) {
        this.logger.error(`Failed to log unit unassignment activity: ${logErr}`);
      }

      return {
        success: true,
        unitUuid,
        tenantUuid: null,
      };
    }
  }

  private async autoCreateInitialPR(
    pmId: number,
    unitUuid: string,
    remainingAmount: number,
    rentType: string | null | undefined,
    rentStartDate: Date | null | undefined,
    rentDueDate: Date | null | undefined,
    inheritedTimeliness: string = 'ON_TIME',
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
        description: 'Outstanding Rent Balance',
        allowPartial: false,
        inheritedTimeliness,
        lineItems: [
          {
            name: 'Rent',
            amount: remainingAmount,
          },
        ],
        allowSupersede: true,
        silent: true,
        bypassWelcomeCheck: true,
      });
      this.logger.log(`Auto-created initial balance PR for unit ${unitUuid}, amount=${remainingAmount}, inheritedTimeliness=${inheritedTimeliness}`);
    } catch (err: any) {
      this.logger.error(`Failed to auto-create initial PR for unit ${unitUuid}: ${err.message}`);
    }
  }
}
