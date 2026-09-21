import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

export interface GetPmVerificationsQuery {
  status?: string;
  page?: string | number;
  limit?: string | number;
}

@Injectable()
export class GetPmVerificationsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(query: GetPmVerificationsQuery) {
    const page = query.page ? Number(query.page) : 1;
    const limit = query.limit ? Number(query.limit) : 20;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: any = query.status ? { status: query.status } : {};

    const [items, total] = await Promise.all([
      this.prisma.upward_pm_verification.findMany({
        where,
        include: {
          pm: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              businessName: true,
              pmType: true,
              uuid: true,
              country: true,
              phone: true,
              cacNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.upward_pm_verification.count({ where }),
    ]);

    const decryptedItems = items.map((item: any) => {
      if (item.pm) {
        return {
          ...item,
          pm: {
            ...item.pm,
            firstName: item.pm.firstName ? this.encryption.decrypt(item.pm.firstName) : '',
            lastName: item.pm.lastName ? this.encryption.decrypt(item.pm.lastName) : '',
            email: item.pm.email ? this.encryption.decrypt(item.pm.email) : '',
            businessName: item.pm.businessName ? this.encryption.decrypt(item.pm.businessName) : null,
            phone: item.pm.phone ? this.encryption.decrypt(item.pm.phone) : null,
          },
        };
      }
      return item;
    });

    return {
      items: decryptedItems,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
