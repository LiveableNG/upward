import { Injectable, Logger } from '@nestjs/common';
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository';
import { SendLandlordReportDto } from '../dtos/landlord.dto';
import { Inject } from '@nestjs/common';

@Injectable()
export class SendLandlordReportUseCase {
  private readonly logger = new Logger(SendLandlordReportUseCase.name);

  constructor(
    private readonly unifiedCommService: UnifiedCommunicationService,
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepo: PropertyManagerRepository,
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

    // 1.5 Apply Letterhead if requested
    let content = dto.content;
    if (dto.includeLetterhead) {
      const pm = await this.pmRepo.findById(pmId);
      if (pm) {
        const headerUrl = pm.letterheadHeaderUrl ? await this.s3Service.getDownloadUrl(pm.letterheadHeaderUrl) : null;
        const footerUrl = pm.letterheadFooterUrl ? await this.s3Service.getDownloadUrl(pm.letterheadFooterUrl) : null;

        let wrappedContent = `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; max-width: 800px; margin: 0 auto;">`;
        
        if (headerUrl) {
          wrappedContent += `
            <div style="margin-bottom: 30px; text-align: center; border-bottom: 1px solid #eee; padding-bottom: 20px;">
              <img src="${headerUrl}" style="max-width: 100%; max-height: 150px; object-fit: contain;" alt="Letterhead Header" />
            </div>`;
        }

        wrappedContent += `<div style="padding: 10px 0; min-height: 400px;">${content}</div>`;

        if (footerUrl) {
          wrappedContent += `
            <div style="margin-top: 50px; text-align: center; border-top: 1px solid #eee; padding-top: 20px;">
              <img src="${footerUrl}" style="max-width: 100%; max-height: 100px; object-fit: contain;" alt="Letterhead Footer" />
            </div>`;
        }
        wrappedContent += `</div>`;
        content = wrappedContent;
      }
    }

    // 2. Send via Unified Communication Service
    await this.unifiedCommService.processCommunication({
      recipientEmail: dto.landlordEmail,
      recipientName: dto.landlordName,
      recipientRole: 'LANDLORD',
      pmUuid: undefined, // Will resolve inside unified service or PM settings
      type: 'LANDLORD_REPORT',
      context: {
        htmlOverride: content,
        title: dto.subject || `Property Performance Report - ${dto.landlordName}`,
      }
    });

    return { success: true };
  }
}
