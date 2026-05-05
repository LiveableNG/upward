import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import * as crypto from 'crypto';
import { EmailService } from '../../../shared/infrastructure/email/email.service';
import { ConfigService } from '@nestjs/config';
import { EVENT_BUS, EventBus } from '../../events/domain-event';
import { CredibilityRequestCreatedEvent } from '../../events/definition/credibility-request-created.event';

interface RequestRecordsInput {
  propertyUuid: string;
  requestContactDetails: {
    companyName: string;
    email?: string;
    phone?: string;
    address: string;
    alias?: string;
  };
}

@Injectable()
export class RequestCredibilityRecordsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus
  ) {}

  async execute(userId: string, input: RequestRecordsInput) {
    const user = await this.prisma.upward_user.findUnique({
      where: { uuid: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    const request = await this.prisma.upward_credibility_request.create({
      data: {
        uuid: crypto.randomUUID(),
        userId: user.id,
        propertyUuid: input.propertyUuid,
        companyName: input.requestContactDetails.companyName ? this.encryption.encrypt(input.requestContactDetails.companyName) : null,
        managerName: input.requestContactDetails.companyName ? this.encryption.encrypt(input.requestContactDetails.companyName) : null, // using company name as fallback
        email: input.requestContactDetails.email ? this.encryption.encrypt(input.requestContactDetails.email) : null,
        phone: input.requestContactDetails.phone ? this.encryption.encrypt(input.requestContactDetails.phone) : null,
        status: 'PENDING',
      }
    });

    const requestEmail = input.requestContactDetails.email;
    if (requestEmail) {
      const payUrl = this.configService.get<string>('PAY_APP_URL') || 
                     this.configService.get<string>('FRONTEND_URL')?.split(',')[0] || 
                     'https://upward.goodtenants.io';
      const requestLink = `${payUrl}/fill-record/${request.uuid}`;
      
      const property = await this.prisma.upward_user_property.findUnique({
        where: { uuid: input.propertyUuid },
        include: { 
          location: true,
          company: {
            include: { platform: true }
          }
        }
      });
      const propertyAddress = property?.location?.address || property?.location?.area || 'a property';

      const tenantName = `${this.encryption.decrypt(user.firstName)} ${this.encryption.decrypt(user.lastName)}`;

      await this.emailService.sendCredibilityRequestEmail({
        email: requestEmail,
        tenantName,
        propertyAddress,
        requestLink
      });

      // Publish event for webhook if property is verified and belongs to a platform
      if (property?.isVerified && property.company?.platformId) {
        this.eventBus.publish(new CredibilityRequestCreatedEvent(
          property.company.platformId,
          'past_tenancy_record.requested',
          {
            requestUuid: request.uuid,
            propertyUuid: property.uuid,
            propertyAddress,
            tenantName,
            tenantEmail: user.email,
          }
        ));
      }

      console.log(`Email request sent to ${requestEmail} with link ${requestLink}`);
    } else {
      console.log(`No email provided for credibility request ${request.uuid}`);
    }

    return { success: true, request };
  }
}
