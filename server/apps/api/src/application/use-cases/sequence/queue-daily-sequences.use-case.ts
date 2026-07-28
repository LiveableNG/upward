import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EmailService } from '../../../shared/infrastructure/email/email.service';
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service';
import { IEmailSequenceRepository, EMAIL_SEQUENCE_REPOSITORY } from '../../../domains/email-sequence/email-sequence.repository.interface';
import { IWhatsappSequenceLogRepository, WHATSAPP_SEQUENCE_REPOSITORY } from '../../../domains/whatsapp-sequence/whatsapp-sequence.repository.interface';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { ProcessPendingEmailSequencesUseCase } from '../email-sequence/process-pending-email-sequences.use-case';
import { ProcessPendingSequencesUseCase } from '../whatsapp-sequence/process-pending-sequences.use-case';

@Injectable()
export class QueueDailySequencesUseCase {
  private readonly logger = new Logger(QueueDailySequencesUseCase.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly unifiedCommService: UnifiedCommunicationService,
    private readonly encryption: EncryptionService,
    @Inject(EMAIL_SEQUENCE_REPOSITORY)
    private readonly emailSequenceRepo: IEmailSequenceRepository,
    @Inject(WHATSAPP_SEQUENCE_REPOSITORY)
    private readonly whatsappSequenceRepo: IWhatsappSequenceLogRepository,
    private readonly processEmailSequences: ProcessPendingEmailSequencesUseCase,
    private readonly processWhatsappSequences: ProcessPendingSequencesUseCase,
  ) {}

  async execute(): Promise<void> {
    this.logger.log('[DailySequences] Starting auto-dispatch at 8am...');

    const now = new Date();
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const pendingEmails   = await this.emailSequenceRepo.findLogsBeforeByStatus('PENDING', endOfDay, 1000);
    const pendingWhatsapp = await this.whatsappSequenceRepo.findLogsBeforeByStatus('PENDING', endOfDay, 1000);

    const eligibleEmails   = pendingEmails.filter(e => {
      const email = (e.email || '').toLowerCase();
      return !e.user?.isInternal
        && email.length > 0
        && !email.endsWith('@upward.com');
    });
    const ineligibleEmails = pendingEmails.filter(e => !eligibleEmails.includes(e));

    const eligibleWhatsapp   = pendingWhatsapp.filter(w =>
      !w.user?.isInternal && !!w.phoneEncrypted && !!w.user?.phone,
    );
    const ineligibleWhatsapp = pendingWhatsapp.filter(w => !eligibleWhatsapp.includes(w));

    for (const e of ineligibleEmails) {
      const reason = e.user?.isInternal
        ? 'User is marked as internal'
        : (e.email || '').toLowerCase().endsWith('@upward.com')
          ? 'Phone-only account — email sequence not applicable'
          : 'Invalid or missing email';
      await this.prisma.upward_email_sequence_log.update({
        where: { id: e.id },
        data: { status: 'FAILED', errorReason: reason },
      });
    }
    for (const w of ineligibleWhatsapp) {
      const reason = w.user?.isInternal
        ? 'User is marked as internal'
        : 'No valid phone number on record';
      await this.prisma.upward_whatsapp_sequence_log.update({
        where: { id: w.id },
        data: { status: 'FAILED', errorReason: reason },
      });
    }

    if (eligibleEmails.length === 0 && eligibleWhatsapp.length === 0) {
      this.logger.log('[DailySequences] No eligible sequences to dispatch today.');
      return;
    }

    if (eligibleEmails.length > 0) {
      await this.prisma.upward_email_sequence_log.updateMany({
        where: { id: { in: eligibleEmails.map(e => e.id!) } },
        data: { status: 'APPROVED' },
      });
      this.logger.log(`[DailySequences] Approved ${eligibleEmails.length} email sequence(s).`);
    }
    if (eligibleWhatsapp.length > 0) {
      await this.prisma.upward_whatsapp_sequence_log.updateMany({
        where: { id: { in: eligibleWhatsapp.map(w => w.id!) } },
        data: { status: 'APPROVED' },
      });
      this.logger.log(`[DailySequences] Approved ${eligibleWhatsapp.length} WhatsApp sequence(s).`);
    }

    this.logger.log('[DailySequences] Dispatching email sequences...');
    await this.processEmailSequences.execute();

    this.logger.log('[DailySequences] Dispatching WhatsApp sequences...');
    await this.processWhatsappSequences.execute();

    this.sendDigest(eligibleEmails, eligibleWhatsapp).catch(err =>
      this.logger.error('[DailySequences] Failed to send digest:', err?.message),
    );

    this.logger.log('[DailySequences] Auto-dispatch complete.');
  }

  private async sendDigest(
    dispatchedEmails: any[],
    dispatchedWhatsapp: any[],
  ): Promise<void> {
    const alertAdmins = await this.prisma.upward_admin.findMany({
      where: {
        OR: [{ receivesSystemAlerts: true }, { role: 'DEVELOPER' }],
      },
    });

    if (alertAdmins.length === 0) return;

    const emailCounts: Record<string, number>    = {};
    const whatsappCounts: Record<string, number> = {};
    for (const e of dispatchedEmails)   emailCounts[e.stage]    = (emailCounts[e.stage]    || 0) + 1;
    for (const w of dispatchedWhatsapp) whatsappCounts[w.stage] = (whatsappCounts[w.stage] || 0) + 1;

    const dispatchedAt = new Date().toLocaleString('en-NG', { timeZone: 'Africa/Lagos' });

    let digestHtml = `<p>Hello Admin,</p>
<p>The following sequences were <strong>automatically dispatched at 8:00 AM WAT</strong> on ${dispatchedAt}. No action is required.</p>`;

    if (Object.keys(emailCounts).length > 0) {
      digestHtml += `<h3>📧 Email Sequences Dispatched</h3><ul>`;
      for (const [stage, count] of Object.entries(emailCounts)) {
        digestHtml += `<li><strong>${count}</strong> user(s) received the <strong>${stage}</strong> email.</li>`;
      }
      digestHtml += `</ul>`;
    }

    if (Object.keys(whatsappCounts).length > 0) {
      digestHtml += `<h3>💬 WhatsApp Sequences Dispatched</h3><ul>`;
      for (const [stage, count] of Object.entries(whatsappCounts)) {
        digestHtml += `<li><strong>${count}</strong> user(s) received the <strong>${stage}</strong> WhatsApp message.</li>`;
      }
      digestHtml += `</ul>`;
    }

    digestHtml += `<p style="color:#888;font-size:13px;">You can review full logs in the admin dashboard under <em>Sequence Queue</em>.</p>`;

    for (const admin of alertAdmins) {
      try {
        const decryptedEmail = admin.email.includes(':')
          ? this.encryption.decrypt(admin.email)
          : admin.email;
        await this.emailService.sendEmailWithRetry({
          email: decryptedEmail,
          subject: `Daily Sequence Digest — ${Object.values(emailCounts).reduce((s, n) => s + n, 0) + Object.values(whatsappCounts).reduce((s, n) => s + n, 0)} dispatched`,
          html: digestHtml,
          type: 'ADMIN_SEQUENCE_DIGEST',
        });
      } catch (err: any) {
        this.logger.error(`[DailySequences] Failed to send digest to admin ${admin.id}: ${err?.message}`);
      }
    }
  }
}
