import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WhatsappOptions {
  to: string;
  message: string;
}

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name);
  private readonly token = process.env.WHATSAPP_TOKEN;
  private readonly phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(options: WhatsappOptions): Promise<boolean> {
    const isProd = process.env.NODE_ENV === 'production';
    let finalMessage = options.message;
    if (!finalMessage.includes('Upward by Goodtenants')) {
      finalMessage = `${finalMessage}\n\nUpward by Goodtenants`;
    }

    // In dev, log to upward_dev_email_preview like SMS/Email
    if (!isProd) {
      await this.prisma.upward_dev_email_preview.create({
        data: {
          to: options.to,
          subject: 'WhatsApp Message',
          html: `<p>${finalMessage}</p>`,
          text: finalMessage,
        }
      });
    }

    if (!this.token || !this.phoneNumberId) {
      this.logger.warn(`WhatsApp credentials missing. Mock sending WhatsApp to ${options.to}: ${finalMessage}`);
      return true;
    }

    try {
      // Ensure phone number starts with country code without +
      let sanitizedPhone = options.to.replace('+', '');
      
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

      const data = await response.json();

      if (!response.ok) {
        this.logger.error(`Failed to send WhatsApp to ${options.to}. Meta Response: ${JSON.stringify(data)}`);
        return false;
      }

      this.logger.log(`WhatsApp sent to ${options.to}. Message ID: ${data.messages?.[0]?.id}`);
      return true;
    } catch (error) {
      this.logger.error(`Error sending WhatsApp to ${options.to}`, error);
      return false;
    }
  }
}
