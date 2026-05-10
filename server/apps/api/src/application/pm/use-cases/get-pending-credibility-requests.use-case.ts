import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class GetPendingCredibilityRequestsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService
  ) {}

  async execute(pmId: number) {
    // Get PM's email and phone
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { id: pmId }
    });

    if (!pm) return [];

    const pmEmail = pm.email?.toLowerCase();
    const pmPhone = pm.phone; // Assuming standardized format

    // Fetch all pending requests (since we can't query encrypted columns directly)
    // In a production system at scale, we'd add an emailHash column.
    const allPending = await this.prisma.upward_credibility_request.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: { firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const matchedRequests = allPending.filter((req: any) => {
      let matches = false;
      if (req.email && pmEmail) {
        const decryptedEmail = this.encryption.decrypt(req.email);
        if (decryptedEmail.toLowerCase() === pmEmail) matches = true;
      }
      if (!matches && req.phone && pmPhone) {
        const decryptedPhone = this.encryption.decrypt(req.phone);
        if (decryptedPhone === pmPhone) matches = true;
      }
      return matches;
    });

    return Promise.all(matchedRequests.map(async (req: any) => {
      // Fetch property details (user's property)
      const property = await this.prisma.upward_user_property.findUnique({
        where: { uuid: req.propertyUuid },
        include: { location: true }
      });

      return {
        uuid: req.uuid,
        status: req.status,
        createdAt: req.createdAt,
        tenantName: `${req.user.firstName} ${req.user.lastName}`,
        propertyAddress: property?.location?.address || property?.location?.area || 'Unknown Address'
      };
    }));
  }
}
