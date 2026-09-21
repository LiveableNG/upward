import { Inject, Injectable, Logger } from '@nestjs/common'
import {
  PAYMENT_GATEWAY,
  IPaymentGateway,
  DVA_ACCOUNT_REPOSITORY,
  IDVAAccountRepository,
} from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class ResolveDedicatedAccountUseCase {
  private readonly logger = new Logger(ResolveDedicatedAccountUseCase.name)

  constructor(
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    @Inject(DVA_ACCOUNT_REPOSITORY)
    private readonly dvaRepo: IDVAAccountRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly prisma: PrismaService,
  ) { }

  async execute(data: { userPropertyId: number; tenantEmail?: string; tenantName?: string; tenantPhone?: string; subaccountCode?: string }) {
    this.logger.log(`Resolving dedicated account for User Property ID: ${data.userPropertyId}`)

    const existing = await this.dvaRepo.findByUserPropertyId(data.userPropertyId)
    if (existing) {
      this.logger.log(`Using existing DVA for User Property ${data.userPropertyId}: ${existing.accountNumber}`)
      return existing
    }
    const baseEmail = data.tenantEmail || `prop-${data.userPropertyId}@upward.ng`
    const [local, domain] = baseEmail.split('@')
    const customerEmail = `${local}+p${data.userPropertyId}@${domain}`

    const firstName = data.tenantName?.split(' ')[0] || 'Tenant'
    const lastName = data.tenantName?.split(' ')[1] || `Property-${data.userPropertyId}`

    this.logger.log(`Creating customer for DVA: ${customerEmail}`)
    const customerCode = await this.gateway.createCustomer({ email: customerEmail, firstName, lastName, phone: data.tenantPhone })
    if (!customerCode) throw new Error('Failed to resolve customer for DVA')

    this.logger.log(`Requesting DVA creation from Paystack for customer ${customerCode} (routing directly to main platform account)`)
    const res = await this.gateway.createDedicatedAccount({
      customerCode
    })

    if (!res.status || !res.data) {
      throw new Error(res.message || 'Failed to create dedicated account')
    }

    const account = res.data

    this.logger.log(`DVA created successfully: ${account.account_number}. Saving to DB...`)

    const existingByAccount = await this.dvaRepo.findByAccountNumber(account.account_number)
    if (existingByAccount) {
      if (existingByAccount.userPropertyId === data.userPropertyId) return existingByAccount

      this.logger.warn(`Account ${account.account_number} already exists for another property (${existingByAccount.userPropertyId}). Re-associating to current property (${data.userPropertyId}).`)
      await this.prisma.upward_dedicated_virtual_account.update({
        where: { id: existingByAccount.id },
        data: { userPropertyId: data.userPropertyId }
      })
      return { ...existingByAccount, userPropertyId: data.userPropertyId }
    }

    return await this.dvaRepo.create({
      accountNumber: account.account_number,
      accountName: account.account_name,
      bankName: account.bank.name,
      bankCode: account.bank.slug || '',
      accountCode: account.dedicated_account_code || account.account_number,
      paystackCustomerId: customerCode,
      userPropertyId: data.userPropertyId,
      metadata: account
    })
  }
}
