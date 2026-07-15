import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EmailService } from '../../../shared/infrastructure/email/email.service';
import { WhatsappService } from '../../../shared/infrastructure/whatsapp/whatsapp.service';
import { IEmailSequenceRepository, EMAIL_SEQUENCE_REPOSITORY } from '../../../domains/email-sequence/email-sequence.repository.interface';
import { IWhatsappSequenceLogRepository, WHATSAPP_SEQUENCE_REPOSITORY } from '../../../domains/whatsapp-sequence/whatsapp-sequence.repository.interface';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class QueueDailySequencesUseCase {
  private readonly logger = new Logger(QueueDailySequencesUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly whatsappService: WhatsappService,
    private readonly encryption: EncryptionService,
    @Inject(EMAIL_SEQUENCE_REPOSITORY)
    private readonly emailSequenceRepo: IEmailSequenceRepository,
    @Inject(WHATSAPP_SEQUENCE_REPOSITORY)
    private readonly whatsappSequenceRepo: IWhatsappSequenceLogRepository,
  ) {}

  async execute(): Promise<void> {
    this.logger.log('Queueing daily sequences and sending digest...');

    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const pendingEmails = await this.emailSequenceRepo.findLogsBeforeByStatus('PENDING', endOfDay, 1000);
    const pendingWhatsapp = await this.whatsappSequenceRepo.findLogsBeforeByStatus('PENDING', endOfDay, 1000);

    if (pendingEmails.length === 0 && pendingWhatsapp.length === 0) {
      this.logger.log('No pending sequences for today.');
      return;
    }

    for (const email of pendingEmails) {
      await this.prisma.upward_email_sequence_log.update({ where: { id: email.id }, data: { status: 'ON_HOLD' } });
    }
    for (const wa of pendingWhatsapp) {
      await this.prisma.upward_whatsapp_sequence_log.update({ where: { id: wa.id }, data: { status: 'ON_HOLD' } });
    }

    const alertAdmins = await this.prisma.upward_admin.findMany({
      where: { receivesSystemAlerts: true },
    });

    if (alertAdmins.length === 0) {
      this.logger.log('No admins configured to receive system alerts. Skipping digest and samples.');
      return;
    }

    const emailCounts: Record<string, number> = {};
    const whatsappCounts: Record<string, number> = {};

    for (const email of pendingEmails) {
      emailCounts[email.stage] = (emailCounts[email.stage] || 0) + 1;
    }
    for (const wa of pendingWhatsapp) {
      whatsappCounts[wa.stage] = (whatsappCounts[wa.stage] || 0) + 1;
    }

    for (const admin of alertAdmins) {
      for (const stage of Object.keys(emailCounts)) {
        const sampleEmail = pendingEmails.find(e => e.stage === stage);
        if (sampleEmail) {
          await this.emailService.sendOnboardingSequenceEmail({
            email: admin.email,
            firstName: 'Admin (Sample)',
            stage: stage as any,
          });
        }
      }

      // Send one sample for each Whatsapp stage
      const adminPhone = (admin as any).phone;
      if (adminPhone) {
        for (const stage of Object.keys(whatsappCounts)) {
          const sampleWa = pendingWhatsapp.find(w => w.stage === stage);
          if (sampleWa && sampleWa.templateName) {
            const bodyTextArgs = sampleWa.templateData?.body_text?.[0] || [];
            const parameters = bodyTextArgs.map((text: string) => {
              let decoded = text || '';
              if (text && text.includes(':')) {
                decoded = this.encryption.decrypt(text);
              }
              return {
                type: 'text',
                text: decoded,
              };
            });

            await this.whatsappService.sendMessage({
              to: adminPhone.replace('+', ''), // Whatsapp service might expect without + depending on implementation, but typically accepts standard format. Wait, the process-pending-sequences passes plainPhone directly.
              template: {
                name: sampleWa.templateName,
                components: [
                  {
                    type: 'body',
                    parameters,
                  }
                ],
              },
            });
          }
        }
      }

      let digestHtml = `<p>Hello Admin,</p><p>Here are the sequence metrics for today. These sequences are currently ON HOLD in the system awaiting manual dispatch.</p>`;
      
      if (Object.keys(emailCounts).length > 0) {
        digestHtml += `<h3>Email Sequences</h3><ul>`;
        for (const [stage, count] of Object.entries(emailCounts)) {
          digestHtml += `<li><strong>${count}</strong> people are queued to receive the <strong>${stage}</strong> email.</li>`;
        }
        digestHtml += `</ul>`;
      }

      if (Object.keys(whatsappCounts).length > 0) {
        digestHtml += `<h3>WhatsApp Sequences</h3><ul>`;
        for (const [stage, count] of Object.entries(whatsappCounts)) {
          digestHtml += `<li><strong>${count}</strong> people are queued to receive the <strong>${stage}</strong> WhatsApp message.</li>`;
        }
        digestHtml += `</ul>`;
      }

      digestHtml += `<p>Please log in to the admin dashboard to review and approve these sequences.</p>`;

      await this.emailService.sendEmailWithRetry({
        email: admin.email,
        subject: 'Daily Sequence Dispatch Digest',
        html: digestHtml,
        type: 'ADMIN_SEQUENCE_DIGEST',
      });
    }

    this.logger.log('Queueing and digest complete.');
  }
}
