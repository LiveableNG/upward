import { Injectable, Logger } from '@nestjs/common';
import { EmailService } from '../../../shared/infrastructure/email/email.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { SendLandlordReportDto } from '../dtos/landlord.dto';

@Injectable()
export class SendLandlordReportUseCase {
  private readonly logger = new Logger(SendLandlordReportUseCase.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmId: number, dto: SendLandlordReportDto): Promise<{ success: boolean }> {
    this.logger.log(`Sending landlord report to ${dto.landlordEmail} for PM ${pmId}`);

    // 1. Save to history
    await (this.prisma as any).upward_pm_landlord_report.create({
      data: {
        pmId,
        landlordEmail: dto.landlordEmail,
        landlordName: dto.landlordName,
        subject: dto.subject || `Property Performance Report - ${dto.landlordName}`,
        content: dto.content,
        status: 'SENT'
      }
    });

    // 2. Send email
    await this.emailService.sendGenericEmail(
      dto.landlordEmail,
      dto.subject || `Property Performance Report - ${dto.landlordName}`,
      dto.content,
      undefined
    );

    return { success: true };
  }
}
