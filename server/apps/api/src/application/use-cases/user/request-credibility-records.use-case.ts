import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import * as crypto from 'crypto';

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
    private readonly encryption: EncryptionService
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

    // TODO: Trigger Email/SMS Service here to the manager/company
    console.log(`Email request sent to ${input.requestContactDetails.email || input.requestContactDetails.phone}`);

    return { success: true, request };
  }
}
