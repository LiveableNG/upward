import { Inject, Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { IPropertyRepository, PM_PROPERTY_REPOSITORY } from '../../../domains/pm/IPropertyRepository';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { S3Service } from '../../../shared/infrastructure/common/s3/s3.service';

export interface GetPaymentReceiptFileDto {
  pmId: number;
  paymentUuid: string;
  unitUuid: string;
  actor?: any;
  res: any;
}

@Injectable()
export class GetPaymentReceiptFileUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
    @Inject(PM_PROPERTY_REPOSITORY)
    private readonly propertyRepository: IPropertyRepository,
  ) {}

  async execute(dto: GetPaymentReceiptFileDto) {
    const { pmId, paymentUuid, unitUuid, actor, res } = dto;
    const ownerPmId = actor ? actor.ownerPmId : pmId;

    const payment = await this.prisma.upward_pm_rent_payment.findUnique({
      where: { uuid: paymentUuid },
      include: {
        unit: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!payment || payment.unit.uuid !== unitUuid) {
      throw new NotFoundException('Rent record not found');
    }

    const hasAccess = await this.propertyRepository.hasAccessToProperty(ownerPmId, payment.unit.property.id, actor);
    if (!hasAccess) {
      throw new ForbiddenException('You do not have access to this unit');
    }

    const p = payment as any;
    if (!p.receiptUrl) {
      throw new NotFoundException('No receipt document is attached to this payment record');
    }

    const downloadUrl = await this.s3Service.getDownloadUrl(p.receiptUrl);

    if (res && typeof res.redirect === 'function') {
      return res.redirect(downloadUrl, 302);
    }

    return {
      downloadUrl,
      fileName: p.receiptFileName || 'receipt',
    };
  }
}
