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

  async execute(data: {
    userPropertyId: number
    tenantEmail?: string
    tenantName?: string
    tenantPhone?: string
    subaccountCode?: string
    preferredBank?: string
    forceReissue?: boolean
    disableFallback?: boolean
  }) {
    this.logger.log(`Resolving dedicated account for User Property ID: ${data.userPropertyId}`)

    if (!data.forceReissue) {
      const existing = await this.dvaRepo.findByUserPropertyId(data.userPropertyId)
      if (existing) {
        this.logger.log(`Using existing DVA for User Property ${data.userPropertyId}: ${existing.accountNumber} (${existing.bankName})`)
        return existing
      }
    }

    const baseEmail = data.tenantEmail || `prop-${data.userPropertyId}@upward.ng`
    const [local, domain] = baseEmail.split('@')
    const customerEmail = `${local}+p${data.userPropertyId}@${domain}`

    const firstName = data.tenantName?.split(' ')[0] || 'Tenant'
    const lastName = data.tenantName?.split(' ')[1] || `Property-${data.userPropertyId}`

    this.logger.log(`Creating customer for DVA: ${customerEmail}`)
    const customerCode = await this.gateway.createCustomer({ email: customerEmail, firstName, lastName, phone: data.tenantPhone })
    if (!customerCode) throw new Error('Failed to resolve customer for DVA')

    this.logger.log(`Requesting DVA creation from Paystack for customer ${customerCode} with preferred bank: ${data.preferredBank || 'titan-paystack'}`)
    const res = await this.gateway.createDedicatedAccount({
      customerCode,
      subaccountCode: data.subaccountCode,
      preferredBank: data.preferredBank,
      disableFallback: data.disableFallback,
    })

    if (!res.status || !res.data) {
      throw new Error(res.message || 'Failed to create dedicated account')
    }

    const account = res.data
    const bankName = account.bank?.name || (data.preferredBank === 'wema-bank' ? 'Wema Bank' : 'Paystack-Titan')
    const bankSlug = data.preferredBank || (bankName.toLowerCase().includes('wema') ? 'wema-bank' : 'titan-paystack')

    this.logger.log(`DVA created successfully: ${account.account_number} (${bankName}). Saving to DB...`)

    const existingAccounts = await this.dvaRepo.findAllByUserPropertyId(data.userPropertyId)
    const hasTitan = existingAccounts.some((a) => {
      const slug = (a.bankSlug || '').toLowerCase()
      const name = (a.bankName || '').toLowerCase()
      return (slug === 'titan-paystack' || name.includes('titan') || name.includes('paystack')) && a.accountNumber !== account.account_number
    })
    const isTargetTitan = bankSlug === 'titan-paystack'
    const shouldBeDefault = isTargetTitan || !hasTitan

    const existingByAccount = await this.dvaRepo.findByAccountNumber(account.account_number)
    if (existingByAccount) {
      if (existingByAccount.userPropertyId === data.userPropertyId) {
        if (shouldBeDefault) {
          await this.dvaRepo.setDefault(existingByAccount.id, data.userPropertyId)
        }
        return { ...existingByAccount, isDefault: shouldBeDefault }
      }

      this.logger.warn(`Account ${account.account_number} already exists for another property (${existingByAccount.userPropertyId}). Re-associating to current property (${data.userPropertyId}).`)
      await (this.prisma as any).upward_dedicated_virtual_account.update({
        where: { id: existingByAccount.id },
        data: { userPropertyId: data.userPropertyId, isDefault: shouldBeDefault, bankSlug }
      })
      if (shouldBeDefault) {
        await this.dvaRepo.setDefault(existingByAccount.id, data.userPropertyId)
      }
      return { ...existingByAccount, userPropertyId: data.userPropertyId, isDefault: shouldBeDefault, bankSlug }
    }

    return await this.dvaRepo.create({
      accountNumber: account.account_number,
      accountName: account.account_name,
      bankName: bankName,
      bankCode: account.bank?.slug || account.bank?.id?.toString() || '',
      bankSlug: bankSlug,
      isDefault: shouldBeDefault,
      accountCode: account.dedicated_account_code || account.account_number,
      paystackCustomerId: customerCode,
      userPropertyId: data.userPropertyId,
      metadata: account
    })
  }
}
