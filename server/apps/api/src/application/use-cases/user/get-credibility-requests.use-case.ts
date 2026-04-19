import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';

@Injectable()
export class GetCredibilityRequestsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService
  ) {}

  async execute(userId: string) {
    const user = await this.prisma.upward_user.findUnique({
      where: { uuid: userId },
    });

    if (!user) throw new NotFoundException('User not found');

    const requests = await this.prisma.upward_credibility_request.findMany({
      where: { userId: user.id },
      include: {
        // We'll manually link property info if needed, or query it
      },
      orderBy: { createdAt: 'desc' },
    });

    const enriched = await Promise.all(requests.map(async (req) => {
      const property = await this.prisma.upward_user_property.findFirst({
        where: { uuid: req.propertyUuid, userId: user.id },
        include: { location: true }
      });

      let records: any[] = [];
      if (req.status === 'COMPLETED') {
        // Find payment requests associated with this property that were created after the request
        const relatedPayments = await this.prisma.upward_payment_request.findMany({
          where: { 
            userPropertyId: property?.id,
            createdAt: { gte: req.createdAt },
            status: 'PAID'
          },
          orderBy: { dueDate: 'asc' }
        });
        
        records = relatedPayments.map(p => {
          const finalPaidAt = p.paidAt || p.updatedAt;
          return {
            amount: p.amount,
            dueDate: p.dueDate,
            paidAt: finalPaidAt,
            isLate: finalPaidAt > p.dueDate
          };
        });
      }

      return {
        ...req,
        propertyAddress: property?.location?.address || property?.location?.area || 'Unknown Property',
        companyName: req.companyName ? this.encryption.decrypt(req.companyName) : null,
        managerName: req.managerName ? this.encryption.decrypt(req.managerName) : null,
        email: req.email ? this.encryption.decrypt(req.email) : null,
        phone: req.phone ? this.encryption.decrypt(req.phone) : null,
        ingestedRecords: records
      };
    }));

    return enriched;
  }
}
