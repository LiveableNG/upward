import { Injectable, Logger } from '@nestjs/common';

export interface SmsOptions {
  to: string;
  message: string;
}

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly termiiApiKey = process.env.TERMII_API_KEY;
  private readonly termiiSenderId = process.env.TERMII_SENDER_ID || 'goodtenants';
  private readonly termiiUrl = 'https://api.ng.termii.com/api/sms/send';

  constructor(private readonly prisma: PrismaService) {}

  async sendSms(options: SmsOptions): Promise<boolean> {
    const isProd = process.env.NODE_ENV === 'production';
    let finalMessage = options.message;
    if (!finalMessage.includes('Upward by Goodtenants')) {
      finalMessage = `${finalMessage}\n\nUpward by Goodtenants`;
    }

    if (!isProd) {
      await this.prisma.upward_dev_email_preview.create({
        data: {
          to: options.to,
          subject: 'SMS Message',
          html: `<p>${finalMessage}</p>`,
          text: finalMessage,
        }
      });
    }

    if (!this.termiiApiKey) {
      this.logger.warn(`Termii API Key missing. Mock sending SMS to ${options.to}: ${finalMessage}`);
      return true;
    }

    try {
      // Termii requires phone numbers without the '+' sign
      const sanitizedPhone = options.to.replace('+', '');

      const payload = {
        to: sanitizedPhone,
        from: this.termiiSenderId,
        sms: finalMessage,
        type: 'plain',
        channel: 'generic', // Reverted to generic as per active channels
        api_key: this.termiiApiKey,
      };

      const response = await fetch(this.termiiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      this.logger.log(`SMS sent to ${options.to}. Response: ${JSON.stringify(data)}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${options.to}`, error);
      return false;
    }
  }
}
