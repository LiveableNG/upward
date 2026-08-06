import { Injectable, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../../../shared/infrastructure/prisma/prisma.service'
import { ReceiptService } from '../../../../shared/infrastructure/common/receipt/receipt.service'
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service'

export interface PreviewReceiptSettingDto {
  logoUrl?: string | null
  useEmailLogo?: boolean
  themeColor?: string
}

@Injectable()
export class PreviewPmReceiptUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly receiptService: ReceiptService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(pmUuid: string, data: PreviewReceiptSettingDto) {
    const pm = await this.prisma.upward_property_manager.findUnique({
      where: { uuid: pmUuid },
      include: { emailSetting: true },
    })

    if (!pm) throw new BadRequestException('PM not found')

    let activeLogoUrl = data.logoUrl
    if (data.useEmailLogo && pm.emailSetting?.logoUrl) {
      activeLogoUrl = pm.emailSetting.logoUrl
    }

    const businessName = pm.businessName ? this.encryption.decrypt(pm.businessName) : null
    const firstName = pm.firstName?.includes(':') ? this.encryption.decrypt(pm.firstName) : pm.firstName
    const lastName = pm.lastName?.includes(':') ? this.encryption.decrypt(pm.lastName) : pm.lastName

    const dummyData = {
      title: 'Transaction Receipt',
      receiptNumber: 'RCP-PREVIEW',
      paidAt: new Date(),
      tenantName: 'John Doe',
      propertyName: 'Greenfield Apartments',
      propertyAddress: '123 Preview Lane, Sandbox City',
      amount: 150000,
      currency: 'NGN',
      reference: 'TXN-1234567890',
      channel: 'Bank Transfer',
      type: 'Rent',
      status: 'SUCCESS',
      lineItems: [
        { label: 'Rent Payment', amount: 145000 },
        { label: 'Service Charge', amount: 5000 }
      ],
      logoUrl: activeLogoUrl || undefined,
      brandName: businessName || `${firstName} ${lastName}`.trim(),
      themeColor: data.themeColor || '#d97757'
    }

    return this.receiptService.generateReceiptPdf(dummyData)
  }
}
