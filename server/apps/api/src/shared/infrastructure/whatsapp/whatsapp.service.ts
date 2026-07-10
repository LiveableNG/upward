import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

export interface WhatsappOptions {
  to: string;
  message: string;
}

export interface WhatsappResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface WhatsAppResponse {
  messages?: {
    id: string;
  }[];
  error?: unknown;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  private get token() {
    return this.configService.get<string>('WHATSAPP_TOKEN');
  }

  private get phoneNumberId() {
    return this.configService.get<string>('WHATSAPP_PHONE_NUMBER_ID');
  }

  async sendMessage(options: WhatsappOptions): Promise<WhatsappResult> {
    const isProd = process.env.NODE_ENV === 'production';
    let finalMessage = options.message;
    if (!finalMessage.endsWith('Upward by Goodtenants')) {
      finalMessage = `${finalMessage}\n\nUpward by Goodtenants`;
    }

    if (!isProd) {
      await this.prisma.upward_dev_email_preview.create({
        data: {
          to: options.to,
          subject: 'WhatsApp Message',
          html: `<p>${finalMessage.replace(/\n/g, '<br>')}</p>`,
          text: finalMessage,
        }
      });
      this.logger.log(`WhatsApp preview saved for ${options.to}`);
      return { success: true };
    }

    if (!this.token || !this.phoneNumberId) {
      this.logger.warn(`WhatsApp credentials missing. Mock sending WhatsApp to ${options.to}: ${finalMessage}`);
      return { success: true };
    }

    try {
      const sanitizedPhone = options.to.replace(/\D/g, '');
      
      const payload = {
        messaging_product: 'whatsapp',
        to: sanitizedPhone,
        type: 'text',
        text: {
          body: finalMessage,
        },
      };

      const url = `https://graph.facebook.com/v19.0/${this.phoneNumberId}/messages`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data: WhatsAppResponse = await response.json();

      if (!response.ok) {
        this.logger.error(`Failed to send WhatsApp to ${options.to}. Meta Response: ${JSON.stringify(data)}`);
        return { success: false, error: JSON.stringify(data.error || data) };
      }

      this.logger.log(`WhatsApp sent to ${options.to}. Message ID: ${data.messages?.[0]?.id}`);
      return { success: true, messageId: data.messages?.[0]?.id };
    } catch (error) {
      this.logger.error(
        `Error sending WhatsApp to ${options.to}`,
        error instanceof Error ? error.stack : String(error),
      );
      return { success: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}
