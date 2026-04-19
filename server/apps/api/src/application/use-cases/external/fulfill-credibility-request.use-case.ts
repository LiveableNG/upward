import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { IngestPastRecordsUseCase } from '../user/ingest-past-records.use-case';
import { SendNotificationUseCase } from '../notifications/notification.use-cases';

interface FulfillRequestInput {
  records: {
    amount: number;
    dueDate: string;
    paidDate: string;
  }[];
}

@Injectable()
export class FulfillCredibilityRequestUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ingestPastRecords: IngestPastRecordsUseCase,
    private readonly sendNotification: SendNotificationUseCase
  ) {}

  async execute(requestUuid: string, input: FulfillRequestInput) {
    const credibilityReq = await this.prisma.upward_credibility_request.findUnique({
      where: { uuid: requestUuid },
      include: { user: true }
    });

    if (!credibilityReq) {
      throw new NotFoundException('Credibility request not found or invalid link.');
    }

    if (credibilityReq.status === 'COMPLETED') {
      throw new BadRequestException('This request has already been fulfilled.');
    }

    if (!input.records || input.records.length === 0) {
      throw new BadRequestException('At least one past payment record is required.');
    }

    // Reuse ingestion logic
    const ingestionPayload = {
      propertyUuid: credibilityReq.propertyUuid,
      records: input.records,
    };

    await this.ingestPastRecords.execute(credibilityReq.user.uuid, ingestionPayload);

    const updatedRequest = await this.prisma.upward_credibility_request.update({
      where: { uuid: requestUuid },
      data: { status: 'COMPLETED' }
    });

    const property = await this.prisma.upward_user_property.findUnique({
      where: { uuid: credibilityReq.propertyUuid },
      include: { location: true }
    });
    const address = property?.location?.address || property?.location?.area || 'your property';

    await this.sendNotification.execute({
      userId: credibilityReq.user.uuid,
      title: 'Credibility records received!',
      message: `Your past records for ${address} have been successfully verified and added to your profile.`,
      type: 'SYSTEM'
    }).catch(err => {
      console.error('Failed to send notification for fulfilled credibility request:', err);
    });

    return {
      success: true,
      message: 'Records securely ingested. Status marked as COMPLETED.',
      request: updatedRequest,
    };
  }
}
