import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  buildSequenceWelcomeHtml,
  buildSequenceDay2Html,
  buildSequenceDay5Html,
  buildSequenceDay9Html,
  buildSequenceDay14Html,
} from '../../../shared/infrastructure/email/email.helper';

export interface PreviewEmailSequenceQuery {
  stage: string;
  firstName?: string;
}

@Injectable()
export class PreviewEmailSequenceUseCase {
  constructor(private readonly configService: ConfigService) {}

  async execute(query: PreviewEmailSequenceQuery): Promise<{ html: string }> {
    const firstName = query.firstName || 'John';
    const frontendUrl =
      (this.configService.get<string>('FRONTEND_URL') || 'https://upward.goodtenants.io').split(',')[0]?.trim() || 'https://upward.goodtenants.io';

    let html = '';

    switch (query.stage) {
      case 'WELCOME':
        html = buildSequenceWelcomeHtml({
          firstName,
          loginLink: `${frontendUrl}/login`,
        });
        break;
      case 'DAY_2':
        html = buildSequenceDay2Html({
          firstName,
          scoreLink: `${frontendUrl}/dashboard`,
        });
        break;
      case 'DAY_5':
        html = buildSequenceDay5Html({
          firstName,
          guideLink: `${frontendUrl}/dashboard`,
        });
        break;
      case 'DAY_9':
        html = buildSequenceDay9Html({
          firstName,
          appLink: `${frontendUrl}/dashboard`,
        });
        break;
      case 'DAY_14':
        html = buildSequenceDay14Html({
          firstName,
          appLink: `${frontendUrl}/dashboard`,
        });
        break;
      default:
        html = '<p>Template not found for the given stage.</p>';
    }

    return { html };
  }
}
