import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';
import { Injectable } from '@nestjs/common';

@Injectable()
export class GetPmLandlordsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(pmId: number) {
    const relations = await this.prisma.upward_pm_landlord_relation.findMany({
      where: { pmId },
      include: { landlord: true },
      orderBy: { createdAt: 'desc' }
    });

    return relations.map((r:any) => {
      const l = r.landlord;
      return {
        id: l.id,
        uuid: l.uuid,
        name: l.firstName ? this.encryption.decrypt(l.firstName) + (l.lastName ? ' ' + this.encryption.decrypt(l.lastName) : '') : 'Landlord',
        email: l.email ? this.encryption.decrypt(l.email) : '',
        phone: l.phone ? this.encryption.decrypt(l.phone) : '',
        createdAt: l.createdAt,
      };
    });
  }
}
