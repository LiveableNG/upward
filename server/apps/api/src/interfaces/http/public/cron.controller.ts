import { Controller, Get, Query, UnauthorizedException, Logger } from '@nestjs/common';
import { BulkInviteService } from '../../../shared/infrastructure/common/bulk-invite.service';
import { WebhookService } from '../../../shared/infrastructure/common/webhook/webhook.service';
import { RentReminderWorkflowUseCase } from '../../../application/use-cases/notifications/rent-reminder-workflow.use-case';
import { UnifiedReminderService } from '../../../shared/infrastructure/common/reminder.service';
import { ProcessHourlySettlementsUseCase } from '../../../application/use-cases/payments/settlement-cron.use-case';

@Controller('public/cron')
export class CronController {
  private readonly logger = new Logger(CronController.name);

  constructor(
    private readonly bulkInviteService: BulkInviteService,
    private readonly webhookService: WebhookService,
    private readonly rentReminderUseCase: RentReminderWorkflowUseCase,
    private readonly unifiedReminderService: UnifiedReminderService,
    private readonly processHourlySettlementsUseCase: ProcessHourlySettlementsUseCase,
  ) {}

  @Get('run')
  async runCron(
    @Query('secret') secret: string,
    @Query('tasks') tasks?: string,
  ) {
    const cronSecret = process.env.CRON_SECRET || 'ab54714d7103723bafdfbd3a';
    if (secret !== cronSecret) {
      throw new UnauthorizedException('Invalid cron secret');
    }

    this.logger.log(`Triggering cron tasks via HTTP (tasks: ${tasks || 'all'})...`);

    const runAll = !tasks;
    const tasksToRun = tasks ? tasks.split(',').map(t => t.trim().toLowerCase()) : [];
    const shouldRun = (taskName: string) => runAll || tasksToRun.includes(taskName.toLowerCase());

    const results: any = {};

    if (shouldRun('bulkInvites')) {
      try {
        await this.bulkInviteService.processPendingInvites();
        results.bulkInvites = 'completed';
      } catch (e: any) {
        this.logger.error('Error in bulkInviteService.processPendingInvites', e);
        results.bulkInvites = 'failed: ' + e.message;
      }
    }

    if (shouldRun('webhooks')) {
      try {
        await this.webhookService.retryFailedWebhooks();
        results.webhooks = 'completed';
      } catch (e: any) {
        this.logger.error('Error in webhookService.retryFailedWebhooks', e);
        results.webhooks = 'failed: ' + e.message;
      }
    }

    if (shouldRun('rentReminders')) {
      try {
        await this.rentReminderUseCase.execute();
        results.rentReminders = 'completed';
      } catch (e: any) {
        this.logger.error('Error in rentReminderUseCase.execute', e);
        results.rentReminders = 'failed: ' + e.message;
      }
    }

    if (shouldRun('paymentReminders')) {
      try {
        await this.unifiedReminderService.handleReminders();
        results.paymentReminders = 'completed';
      } catch (e: any) {
        this.logger.error('Error in unifiedReminderService.handleReminders', e);
        results.paymentReminders = 'failed: ' + e.message;
      }
    }

    if (shouldRun('pmDailyDigest')) {
      try {
        await this.unifiedReminderService.processPmDailyCrons();
        results.pmDailyDigest = 'completed';
      } catch (e: any) {
        this.logger.error('Error in unifiedReminderService.processPmDailyCrons', e);
        results.pmDailyDigest = 'failed: ' + e.message;
      }
    }

    if (shouldRun('processScheduledRequests')) {
      try {
        await this.unifiedReminderService.processScheduledRequests();
        results.processScheduledRequests = 'completed';
      } catch (e: any) {
        this.logger.error('Error in unifiedReminderService.processScheduledRequests', e);
        results.processScheduledRequests = 'failed: ' + e.message;
      }
    }

    if (shouldRun('settlements') || shouldRun('refunds')) {
      try {
        await this.processHourlySettlementsUseCase.execute();
        results.settlements = 'completed';
      } catch (e: any) {
        this.logger.error('Error in processHourlySettlementsUseCase.execute', e);
        results.settlements = 'failed: ' + e.message;
      }
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      results
    };
  }
}
