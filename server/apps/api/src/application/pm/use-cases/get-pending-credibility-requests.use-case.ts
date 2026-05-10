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

    const pmEmail = pm.email?.toLowerCase().trim();
    const pmPhone = pm.phone?.trim();

    // Fetch all pending requests
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
      try {
        if (req.email && pmEmail) {
          const decryptedEmail = this.encryption.decrypt(req.email).toLowerCase().trim();
          if (decryptedEmail === pmEmail) matches = true;
        }
        if (!matches && req.phone && pmPhone) {
          const decryptedPhone = this.encryption.decrypt(req.phone).trim();
          if (decryptedPhone === pmPhone) matches = true;
        }
      } catch (e) {
        // Skip if decryption fails
        return false;
      }
      return matches;
    });

    return Promise.all(matchedRequests.map(async (req: any) => {
      const property = await this.prisma.upward_user_property.findUnique({
        where: { uuid: req.propertyUuid },
        include: { location: true }
      });

      let tenantName = 'Unknown Tenant';
      try {
        tenantName = `${this.encryption.decrypt(req.user.firstName)} ${this.encryption.decrypt(req.user.lastName)}`;
      } catch (e) {}

      return {
        uuid: req.uuid,
        status: req.status,
        createdAt: req.createdAt,
        tenantName,
        propertyAddress: property?.location?.address || property?.location?.area || 'Unknown Address'
      };
    }));
  }
}
