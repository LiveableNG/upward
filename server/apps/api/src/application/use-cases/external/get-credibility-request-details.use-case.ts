import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class GetCredibilityRequestDetailsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService
  ) {}

  async execute(requestUuid: string) {
    const request = await this.prisma.upward_credibility_request.findUnique({
      where: { uuid: requestUuid },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
            profilePic: true,
          }
        }
      }
    });

    if (!request) {
      throw new NotFoundException('Credibility request not found or invalid link.');
    }

    const property = await this.prisma.upward_user_property.findUnique({
      where: { uuid: request.propertyUuid },
      include: {
        location: true
      }
    });

    return {
      success: true,
      data: {
        uuid: request.uuid,
        status: request.status,
        requestedAt: request.createdAt,
        tenantName: request.user.firstName + ' ' + request.user.lastName,
        tenantProfilePic: request.user.profilePic,
        propertyAddress: property?.location?.address || property?.location?.area || 'Address Not Provided',
        companyName: request.companyName ? this.encryption.decrypt(request.companyName) : null,
        managerName: request.managerName ? this.encryption.decrypt(request.managerName) : null,
      }
    };
  }
}
