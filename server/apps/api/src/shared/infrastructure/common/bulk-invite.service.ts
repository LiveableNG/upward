import { Injectable, Logger, Inject } from '@nestjs/common';
import { BULK_INVITE_REPOSITORY, IBulkInviteRepository, BulkInvite } from '../../../domains/pm/IBulkInviteRepository';
import { InviteTenantUseCase } from '../../../application/pm/use-cases/tenants/invite-tenant.use-case';
import { PM_TENANT_REPOSITORY, ITenantRepository } from '../../../domains/pm/IPropertyRepository';

@Injectable()
export class BulkInviteService {
  private readonly logger = new Logger(BulkInviteService.name);
  private isProcessing = false;

  constructor(
    @Inject(BULK_INVITE_REPOSITORY)
    private readonly bulkInviteRepo: IBulkInviteRepository,
    @Inject(PM_TENANT_REPOSITORY)
    private readonly tenantRepo: ITenantRepository,
    private readonly inviteTenantUseCase: InviteTenantUseCase,
  ) {}

  /** Invoked by ScheduleService (Kernel) every minute. */
  async processPendingInvites() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      const pendingInvites = await this.bulkInviteRepo.findPending();
      if (pendingInvites.length === 0) {
        this.isProcessing = false;
        return;
      }

      this.logger.log(`Found ${pendingInvites.length} bulk invite jobs to process`);

      for (const bulkInvite of pendingInvites) {
        await this.processBulkInvite(bulkInvite);
      }
    } catch (error) {
      this.logger.error('Error processing bulk invites', error);
    } finally {
      this.isProcessing = false;
    }
  }

  private async processBulkInvite(bulkInvite: BulkInvite) {
    this.logger.log(`Processing bulk invite ${bulkInvite.id}`);
    
    // Update status to PROCESSING
    if (bulkInvite.status === 'PENDING') {
      await this.bulkInviteRepo.update(bulkInvite.id!, { status: 'PROCESSING' });
    }

    const items = bulkInvite.items || [];
    let sentCount = bulkInvite.sentCount;
    let failedCount = bulkInvite.failedCount;

    for (const item of items) {
      if (item.status === 'SENT') continue;
      if (item.retries >= 3) continue; // Max retries

      try {
        this.logger.log(`Sending invite for tenant ${item.tenantUuid} (Bulk Job: ${bulkInvite.id}) via ${bulkInvite.channel || 'EMAIL'}`);
        await this.inviteTenantUseCase.execute(bulkInvite.pmId, item.tenantUuid, bulkInvite.channel as any);
        
        await this.bulkInviteRepo.updateItem(item.id!, { 
          status: 'SENT',
          updatedAt: new Date()
        });
        sentCount++;
      } catch (error: any) {
        this.logger.error(`Failed to send invite for tenant ${item.tenantUuid}`, error.message);
        await this.bulkInviteRepo.updateItem(item.id!, { 
          status: 'FAILED',
          error: error.message,
          retries: item.retries + 1,
          updatedAt: new Date()
        });
        
        // Update tenant status to FAILED so PM can see it failed and retry manually
        try {
          await this.tenantRepo.update(item.tenantUuid, {
            inviteStatus: 'FAILED',
          });
        } catch (e: any) {
          this.logger.error(`Failed to update tenant status for ${item.tenantUuid}`, e.message);
        }
        
        failedCount++;
      }

      // Small delay to prevent rate limiting or server load
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const allProcessed = sentCount + failedCount >= bulkInvite.totalTenants;
    await this.bulkInviteRepo.update(bulkInvite.id!, {
      sentCount,
      failedCount,
      status: allProcessed ? 'COMPLETED' : 'PROCESSING',
      updatedAt: new Date()
    });
  }
}
