import { Injectable, Logger, Inject, NotFoundException } from '@nestjs/common'
import { PROPERTY_MANAGER_REPOSITORY, PropertyManagerRepository } from '../../../domains/pm/property-manager.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class UpdatePmBankInfoUseCase {
  private readonly logger = new Logger(UpdatePmBankInfoUseCase.name)

  constructor(
    @Inject(PROPERTY_MANAGER_REPOSITORY)
    private readonly pmRepository: PropertyManagerRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(pmUuid: string, dto: {
    bankName: string
    bankCode: string
    accountNumber: string
    accountName: string
  }) {
    const pm = await this.pmRepository.findByUuid(pmUuid)
    if (!pm) throw new NotFoundException('Property manager not found')

    const updatedPm = await this.pmRepository.update(pm.id!, dto)

    const existingPrimary = await this.prisma.upward_manual_account.findFirst({
      where: { pmId: pm.id, isPrimary: true }
    })

    if (existingPrimary) {
      await this.prisma.upward_manual_account.update({
        where: { id: existingPrimary.id },
        data: {
          accountNumber: dto.accountNumber,
          accountName: dto.accountName,
          bankName: dto.bankName,
          bankCode: dto.bankCode,
        }
      })
    } else {
      await this.prisma.upward_manual_account.create({
        data: {
          accountNumber: dto.accountNumber,
          accountName: dto.accountName,
          bankName: dto.bankName,
          bankCode: dto.bankCode,
          pmId: pm.id,
          isPrimary: true,
        }
      })
    }
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, id: serverId, uuid, ...rest } = updatedPm
    return {
      id: uuid,
      uuid,
      ...rest
    }
  }
}
