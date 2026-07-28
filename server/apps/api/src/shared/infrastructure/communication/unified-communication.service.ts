import { Inject, Injectable, Logger, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EncryptionService } from '../common/encryption.service';
import { EmailService } from '../email/email.service';
import { SmsService } from '../sms/sms.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { EVENT_BUS, EventBus } from '../../../application/events/domain-event';
import { SendCommunicationEvent, SendCommunicationPayload } from '../../../application/events/definition/send-communication.event';
import { COMMUNICATION_TEMPLATES, resolveTheme } from './communication-templates';
import { buildGlobalLayoutHtml } from '../email/email.helper';

function isDeliverableEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 && !normalized.endsWith('@upward.com');
}

function isDeliverablePhone(phone?: string | null): boolean {
  if (!phone) return false;
  const normalized = phone.trim();
  return normalized.length >= 10 && normalized !== 'null' && normalized !== 'undefined';
}

@Injectable()
export class UnifiedCommunicationService {
  private readonly logger = new Logger(UnifiedCommunicationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    @Inject(forwardRef(() => EmailService))
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
    private readonly whatsappService: WhatsappService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
  ) {}

  private isEncryptedFormat(val: string): boolean {
    if (typeof val !== 'string' || !val.includes(':')) return false;
    const parts = val.split(':');
    if (parts.length !== 3) return false;
    const isHex = (s?: string) => !!s && /^[0-9a-fA-F]+$/.test(s);
    return isHex(parts[0]) && isHex(parts[1]) && isHex(parts[2]);
  }

  public smartDecrypt(val: any): any {
    if (val === null || val === undefined) return val;

    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (this.isEncryptedFormat(trimmed)) {
        try {
          const decrypted = this.encryption.decrypt(trimmed);
          if (decrypted && decrypted !== trimmed) {
            return decrypted;
          }
        } catch {
          // ignore
        }
      }

      // If it contains GCM encrypted pattern inside (IV(24-32hex):AUTHTAG(32hex):CIPHER(hex))
      const gcmPattern = /([0-9a-fA-F]{24,32}):([0-9a-fA-F]{32}):([0-9a-fA-F]+)/g;
      if (gcmPattern.test(val)) {
        return val.replace(gcmPattern, (match) => {
          try {
            const dec = this.encryption.decrypt(match);
            return dec !== match ? dec : match;
          } catch {
            return match;
          }
        });
      }

      return val;
    }

    if (Array.isArray(val)) {
      return val.map((item) => this.smartDecrypt(item));
    }

    if (typeof val === 'object' && !(val instanceof Date) && !Buffer.isBuffer(val)) {
      const decryptedObj: Record<string, any> = {};
      for (const [k, v] of Object.entries(val)) {
        decryptedObj[k] = this.smartDecrypt(v);
      }
      return decryptedObj;
    }

    return val;
  }

  public dispatch(payload: SendCommunicationPayload): void {
    this.eventBus.publish(new SendCommunicationEvent(payload));
  }

  public async processCommunication(payload: SendCommunicationPayload): Promise<boolean> {
    try {
      const email = this.smartDecrypt(payload.recipientEmail);
      const phone = this.smartDecrypt(payload.recipientPhone);
      const name = this.smartDecrypt(payload.recipientName);
      const rawContext = this.smartDecrypt(payload.context || {});

      // Try to look up any tracked channel preference override for this recipient
      let dbPreferredChannel: string | null = null;
      if (email || phone) {
        const emailHash = email ? this.encryption.hash(email) : null;
        const phoneHash = phone ? this.encryption.hash(phone) : null;

        const tenantPref = await this.prisma.upward_pm_tenant.findFirst({
          where: {
            OR: [
              ...(emailHash ? [{ emailHash }] : []),
              ...(phoneHash ? [{ phoneHash }] : []),
            ],
            channel: { not: null }
          } as any,
          select: { channel: true } as any,
          orderBy: { updatedAt: 'desc' } as any
        }) as any;

        if (tenantPref?.channel) {
          dbPreferredChannel = tenantPref.channel;
        }
      }

      const context = {
        displayName: name || rawContext.displayName || rawContext.firstName || 'there',
        email,
        phone,
        ...rawContext,
      };

      // Try to load template override from the database system templates
      const dbTemplate = await this.prisma.upward_system_email.findFirst({
        where: { slug: payload.type, isActive: true },
      });

      let subject = '';
      let plainText = '';
      let htmlContent = '';
      const role = payload.recipientRole || 'TENANT';
      const theme = resolveTheme(role);

      if (dbTemplate) {
        subject = this.interpolate(dbTemplate.subject, context);
        plainText = dbTemplate.textContent
          ? this.interpolate(dbTemplate.textContent, context)
          : payload.title || payload.type;
        htmlContent = dbTemplate.htmlContent
          ? this.interpolate(dbTemplate.htmlContent, context)
          : `<p>${plainText}</p>`;
      } else {
        const templateDef = COMMUNICATION_TEMPLATES[payload.type];

        subject = payload.title
          ? this.interpolate(payload.title, context)
          : templateDef
          ? this.interpolate(templateDef.subjectTemplate, context)
          : payload.type;

        plainText = templateDef
          ? this.interpolate(templateDef.plainTextTemplate, context)
          : payload.title || payload.type;

        if (rawContext.htmlOverride) {
          htmlContent = rawContext.htmlOverride;
        } else if (templateDef?.buildHtml) {
          htmlContent = templateDef.buildHtml(context, theme);
        } else {
          const titleText = subject;
          const formattedBody = plainText.replace(/\n/g, '<br/>');

          let buttonText = undefined;
          let buttonUrl = undefined;
          const buttonKeys = ['inviteLink', 'paymentLink', 'requestLink', 'completeProfileLink', 'portalLink', 'claimLink', 'receiptUrl'];
          for (const key of buttonKeys) {
            if (context[key]) {
              buttonUrl = context[key];
              if (key === 'inviteLink') buttonText = 'Accept Upward Invite';
              else if (key === 'paymentLink') buttonText = 'View & Pay Now';
              else if (key === 'requestLink') buttonText = 'Review Request';
              else if (key === 'completeProfileLink') buttonText = 'Complete Profile';
              else if (key === 'portalLink') buttonText = 'Go to Portal';
              else if (key === 'claimLink') buttonText = 'Claim Access';
              else if (key === 'receiptUrl') buttonText = 'View Receipt';
              break;
            }
          }

          htmlContent = buildGlobalLayoutHtml({
            role,
            title: titleText,
            contentHtml: `<p>${formattedBody}</p>`,
            buttonText,
            buttonUrl,
            branding: rawContext.branding,
          });
        }
      }

      if (payload.trackingPixelUrl && email) {
        htmlContent += `\n<img src="${payload.trackingPixelUrl}" width="1" height="1" alt="" style="display:none!important;visibility:hidden!important;max-height:1px;max-width:1px;border:0;outline:none;text-decoration:none;" />`;
      }

      const hasEmail = isDeliverableEmail(email);
      const hasPhone = isDeliverablePhone(phone);

      const preferredChannel = payload.forceChannel || dbPreferredChannel || rawContext.deliveryChannel;

      let channelsToTry: Array<'EMAIL' | 'WHATSAPP' | 'SMS'> = [];

      if (preferredChannel) {
        if (preferredChannel === 'WHATSAPP') {
          if (hasEmail && hasPhone) {
            channelsToTry = ['WHATSAPP', 'SMS', 'EMAIL'];
          } else {
            channelsToTry = ['WHATSAPP', 'SMS'];
          }
        } else {
          channelsToTry = [preferredChannel];
        }
      } else {
        if (hasEmail && !hasPhone) {
          channelsToTry = ['EMAIL'];
        } else if (hasPhone && !hasEmail) {
          channelsToTry = ['WHATSAPP', 'SMS'];
        } else if (hasEmail && hasPhone) {
          channelsToTry = ['EMAIL']; // Default to email when both exist
        } else {
          this.logger.warn(`No deliverable email or phone for communication type ${payload.type}`);
          return false;
        }
      }

      const templateDef = COMMUNICATION_TEMPLATES[payload.type];
      let success = false;

      for (const channel of channelsToTry) {
        let channelSuccess = false;
        let lastError = '';

        if (channel === 'EMAIL' && hasEmail && email) {
          const res = await this.emailService.sendEmailWithRetry({
            userId: payload.userId,
            pmUuid: payload.pmUuid,
            email,
            subject,
            html: htmlContent,
            text: plainText,
            type: payload.type,
            fromOverride: payload.fromOverride,
            attachments: payload.attachments,
            cc: payload.cc,
            bcc: payload.bcc,
            emailSequenceLogId: payload.emailSequenceLogId,
          });
          channelSuccess = !!res.success;
          lastError = res.error || '';
        } else if (channel === 'WHATSAPP' && hasPhone && phone) {
          let waMessageId: string | undefined;
          if (templateDef?.whatsappTemplateName) {
            const waParams = (templateDef.whatsappParams || []).map((pKey) => ({
              type: 'text',
              text: String(context[pKey] || ''),
            }));

            const components: any[] = [{ type: 'body', parameters: waParams }];

            if (templateDef.whatsappButtonParam && context[templateDef.whatsappButtonParam]) {
              const buttonVal = String(context[templateDef.whatsappButtonParam]);
              const pathOnly = buttonVal.includes('://')
                ? new URL(buttonVal).pathname.slice(1)
                : buttonVal;

              components.push({
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [{ type: 'text', text: pathOnly }],
              });
            }

            const waRes = await this.whatsappService.sendMessage({
              to: phone,
              template: {
                name: templateDef.whatsappTemplateName,
                components,
              },
            });
            channelSuccess = waRes.success;
            lastError = waRes.error || '';
            waMessageId = waRes.messageId;
          } else {
            const waRes = await this.whatsappService.sendMessage({
              to: phone,
              message: plainText,
            });
            channelSuccess = waRes.success;
            lastError = waRes.error || '';
            waMessageId = waRes.messageId;
          }

          if (channelSuccess && payload.whatsappSequenceLogId && waMessageId) {
            try {
              await this.prisma.upward_whatsapp_sequence_log.update({
                where: { id: payload.whatsappSequenceLogId },
                data: { metaMessageId: waMessageId },
              });
            } catch (err: any) {
              this.logger.warn(
                `Failed to persist WhatsApp metaMessageId for sequence log ${payload.whatsappSequenceLogId}: ${err?.message || err}`,
              );
            }
          }
        } else if (channel === 'SMS' && hasPhone && phone && phone.startsWith('+234')) {
          const smsRes = await this.smsService.sendSms({
            to: phone,
            message: plainText,
          });
          channelSuccess = smsRes;
          lastError = smsRes ? '' : 'SMS dispatch failed';
        }

        if (channel !== 'EMAIL') {
          await this.logCommunication({
            userId: payload.userId,
            registeredUserId: payload.registeredUserId,
            type: payload.type,
            channel,
            subject,
            body: plainText,
            recipient: phone,
            email: email || null,
            status: channelSuccess ? 'SENT' : 'FAILED',
            lastError: channelSuccess ? null : lastError,
          });
        }

        if (channelSuccess) {
          success = true;
          break; // Stop fallback chain on first success
        }
      }

      // Background tenant invite status updating
      if (payload.type === 'TENANT_INVITE' || payload.type === 'RECORD_ADDED') {
        const emailHash = email ? this.encryption.hash(email) : null;
        const phoneHash = phone ? this.encryption.hash(phone) : null;
        
        const isActuallyOnUpward = payload.type === 'RECORD_ADDED';
        const finalInviteStatus = isActuallyOnUpward ? 'ON_UPWARD' : (success ? 'SENT' : 'FAILED');

        await this.prisma.upward_pm_tenant.updateMany({
          where: {
            OR: [
              ...(emailHash ? [{ emailHash }] : []),
              ...(phoneHash ? [{ phoneHash }] : []),
            ]
          },
          data: {
            inviteStatus: finalInviteStatus,
            inviteSentAt: success && !isActuallyOnUpward ? new Date() : undefined,
          }
        });
      }

      return success;
    } catch (err: any) {
      this.logger.error(`Error processing communication ${payload.type}:`, err.stack || err.message);
      return false;
    }
  }

  public async retryCommunication(logId: string): Promise<boolean> {
    const log = await this.prisma.upward_communication_log.findUnique({
      where: { id: logId }
    });
    if (!log) {
      this.logger.error(`No communication log found with ID ${logId}`);
      return false;
    }

    let success = false;
    let lastError = '';

    try {
      if (log.channel === 'EMAIL' && log.email) {
        const res = await this.emailService.sendEmailWithRetry({
          userId: log.userId || undefined,
          email: log.email,
          subject: log.subject,
          html: log.body || '',
          text: log.body || '',
          type: `${log.type}_RETRY`,
        });
        success = !!res.success;
        lastError = res.error || '';
      } else if (log.channel === 'WHATSAPP' && log.recipient) {
        const waRes = await this.whatsappService.sendMessage({
          to: log.recipient,
          message: log.body || '',
        });
        success = waRes.success;
        lastError = waRes.error || '';
      } else if (log.channel === 'SMS' && log.recipient) {
        const smsRes = await this.smsService.sendSms({
          to: log.recipient,
          message: log.body || '',
        });
        success = smsRes;
        lastError = smsRes ? '' : 'SMS dispatch failed';
      }

      // Record retry attempt in log
      await this.prisma.upward_communication_log.update({
        where: { id: logId },
        data: {
          status: success ? 'SENT' : 'FAILED',
          lastError: success ? null : lastError,
          retries: log.retries + 1,
          sentAt: success ? new Date() : log.sentAt,
        }
      });

      return success;
    } catch (err: any) {
      this.logger.error(`Failed manual retry for communication log ${logId}:`, err.message);
      return false;
    }
  }

  private interpolate(str: string, ctx: Record<string, any>): string {
    return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
      return ctx[key] !== undefined && ctx[key] !== null ? String(ctx[key]) : '';
    });
  }

  private async logCommunication(data: {
    userId?: string;
    registeredUserId?: number;
    type: string;
    channel: string;
    subject: string;
    body: string;
    recipient?: string | null;
    email?: string | null;
    status: string;
    lastError?: string | null;
  }) {
    try {
      let registeredUserId = data.registeredUserId || null;
      let waitlistUserId: string | null = null;

      // 1. Resolve registeredUserId (upward_user) if email matches
      if (!registeredUserId && data.email) {
        const hashedEmail = this.encryption.hash(data.email);
        const user = await this.prisma.upward_user.findFirst({
          where: { OR: [{ email: data.email }, { emailHash: hashedEmail }] },
          select: { id: true },
        });
        if (user) {
          registeredUserId = user.id;
        }
      }

      // 2. Resolve waitlistUserId (upward_waitlist) if email or waitlist ID matches
      if (data.email) {
        const waitlist = await this.prisma.upward_waitlist.findFirst({
          where: { email: data.email },
          select: { id: true },
        });
        if (waitlist) {
          waitlistUserId = waitlist.id;
        }
      }

      await this.prisma.upward_communication_log.create({
        data: {
          userId: waitlistUserId,
          registeredUserId,
          type: data.type,
          channel: data.channel,
          subject: data.subject,
          body: data.body,
          recipient: data.recipient || null,
          email: data.email || null,
          status: data.status,
          lastError: data.lastError || null,
          sentAt: data.status === 'SENT' ? new Date() : null,
        },
      });
    } catch (err: any) {
      this.logger.error('Failed to save communication log entry:', err.message);
    }
  }
}
