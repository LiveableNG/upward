import { Controller, Get, Query, UnauthorizedException, Logger } from '@nestjs/common';
import { BulkInviteService } from '../../../shared/infrastructure/common/bulk-invite.service';
import { WebhookService } from '../../../shared/infrastructure/common/webhook/webhook.service';
import { RentReminderWorkflowUseCase } from '../../../application/use-cases/notifications/rent-reminder-workflow.use-case';

@Controller('public/cron')
export class CronController {
  private readonly logger = new Logger(CronController.name);

  constructor(
    private readonly bulkInviteService: BulkInviteService,
    private readonly webhookService: WebhookService,
    private readonly rentReminderUseCase: RentReminderWorkflowUseCase,
  ) {}

  @Get('run')
  async runCron(@Query('secret') secret: string) {
    const cronSecret = process.env.CRON_SECRET || 'ab54714d7103723bafdfbd3a';
    if (secret !== cronSecret) {
      throw new UnauthorizedException('Invalid cron secret');
    }

    this.logger.log('Manually triggering cron tasks via HTTP...');

    const results: any = {
        bulkInvites: 'completed',
        webhooks: 'completed',
        rentReminders: 'completed'
    };

    try {
        await this.bulkInviteService.processPendingInvites();
    } catch (e: any) {
        this.logger.error('Error in bulkInviteService.processPendingInvites', e);
        results.bulkInvites = 'failed: ' + e.message;
    }

    try {
        await this.webhookService.retryFailedWebhooks();
    } catch (e: any) {
        this.logger.error('Error in webhookService.retryFailedWebhooks', e);
        results.webhooks = 'failed: ' + e.message;
    }

    try {
        await this.rentReminderUseCase.execute();
    } catch (e: any) {
        this.logger.error('Error in rentReminderUseCase.execute', e);
        results.rentReminders = 'failed: ' + e.message;
    }

    return {
      success: true,
      timestamp: new Date().toISOString(),
      results
    };
  }
}
