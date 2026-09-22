import { Inject, Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common'
import {
  DVA_ACCOUNT_REPOSITORY,
  IDVAAccountRepository,
} from '../../../domains/payments/payment.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { ResolveDedicatedAccountUseCase } from './resolve-dedicated-account.use-case'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class SwitchDedicatedAccountUseCase {
  private readonly logger = new Logger(SwitchDedicatedAccountUseCase.name)

  constructor(
    @Inject(DVA_ACCOUNT_REPOSITORY)
    private readonly dvaRepo: IDVAAccountRepository,
    private readonly resolveDedicatedAccount: ResolveDedicatedAccountUseCase,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(data: {
    userId?: number
    userPropertyId?: number
    paymentRequestUuid?: string
    preferredBank?: string
  }) {
    this.logger.log(`Switching DVA for request: ${JSON.stringify(data)}`)

    let targetUserPropertyId = data.userPropertyId
    let tenantUser: any = null
    let subaccountCode: string | undefined

    if (data.paymentRequestUuid) {
      const pr = await this.prisma.upward_payment_request.findUnique({
        where: { uuid: data.paymentRequestUuid },
        include: {
          userProperty: {
            include: {
              user: true,
              subaccount: true,
            },
          },
          subaccount: true,
        },
      })
      if (!pr || !pr.userProperty) {
        throw new NotFoundException('Payment request or property not found')
      }
      targetUserPropertyId = pr.userProperty.id
      tenantUser = pr.userProperty.user
      subaccountCode = pr.subaccount?.subaccountCode || pr.userProperty.subaccount?.subaccountCode
    } else if (targetUserPropertyId) {
      const prop = await this.prisma.upward_user_property.findUnique({
        where: { id: targetUserPropertyId },
        include: {
          user: true,
          subaccount: true,
        },
      })
      if (!prop) {
        throw new NotFoundException('Property not found')
      }
      tenantUser = prop.user
      subaccountCode = prop.subaccount?.subaccountCode
    } else if (data.userId) {
      const prop = await this.prisma.upward_user_property.findFirst({
        where: { userId: data.userId },
        include: {
          user: true,
          subaccount: true,
        },
        orderBy: { updatedAt: 'desc' },
      })
      if (!prop) {
        throw new NotFoundException('No active property found for user')
      }
      targetUserPropertyId = prop.id
      tenantUser = prop.user
      subaccountCode = prop.subaccount?.subaccountCode
    } else {
      throw new BadRequestException('Either userPropertyId, paymentRequestUuid, or userId must be provided')
    }

    const existingAccounts = await this.dvaRepo.findAllByUserPropertyId(targetUserPropertyId)
    const currentActive = existingAccounts.find((a) => a.isDefault) || existingAccounts[0]

    // Determine target bank
    let targetBank = data.preferredBank
    if (!targetBank) {
      const currentBankName = (currentActive?.bankName || '').toLowerCase()
      const currentBankSlug = (currentActive?.bankSlug || '').toLowerCase()
      const isCurrentlyWema = currentBankSlug === 'wema-bank' || currentBankName.includes('wema')

      targetBank = isCurrentlyWema ? 'titan-paystack' : 'wema-bank'
    }

    this.logger.log(
      `Current DVA: ${currentActive?.bankName} (${currentActive?.accountNumber}) -> Target alternate bank: ${targetBank}`,
    )

    // Check if an account with target bank already exists
    const matchingExisting = existingAccounts.find((a) => {
      const slug = (a.bankSlug || '').toLowerCase()
      const name = (a.bankName || '').toLowerCase()
      if (targetBank === 'titan-paystack') {
        return slug === 'titan-paystack' || name.includes('titan') || name.includes('paystack')
      }
      if (targetBank === 'wema-bank') {
        return slug === 'wema-bank' || name.includes('wema')
      }
      return slug === targetBank
    })

    const hasTitan = existingAccounts.some((a) => {
      const slug = (a.bankSlug || '').toLowerCase()
      const name = (a.bankName || '').toLowerCase()
      return slug === 'titan-paystack' || name.includes('titan') || name.includes('paystack')
    })
    const isTargetTitan = targetBank === 'titan-paystack'

    if (matchingExisting && matchingExisting.accountNumber !== currentActive?.accountNumber) {
      this.logger.log(`Activating existing cached DVA for ${targetBank}: ${matchingExisting.accountNumber}`)
      // Only set as permanent default if target bank is Titan or if user has no Titan account
      if (!hasTitan || isTargetTitan) {
        await this.dvaRepo.setDefault(matchingExisting.id, targetUserPropertyId)
      }
      return {
        ...matchingExisting,
        isDefault: isTargetTitan || !hasTitan,
      }
    }

    // Otherwise, generate a new DVA for the target bank
    let decryptedEmail = tenantUser?.email
    let decryptedFirstName = tenantUser?.firstName
    let decryptedLastName = tenantUser?.lastName
    let decryptedPhone = tenantUser?.phone

    try {
      if (decryptedEmail && this.encryption.isEncrypted(decryptedEmail)) {
        decryptedEmail = this.encryption.decrypt(decryptedEmail)
      }
      if (decryptedFirstName && this.encryption.isEncrypted(decryptedFirstName)) {
        decryptedFirstName = this.encryption.decrypt(decryptedFirstName)
      }
      if (decryptedLastName && this.encryption.isEncrypted(decryptedLastName)) {
        decryptedLastName = this.encryption.decrypt(decryptedLastName)
      }
      if (decryptedPhone && this.encryption.isEncrypted(decryptedPhone)) {
        decryptedPhone = this.encryption.decrypt(decryptedPhone)
      }
    } catch {
      // Ignore decryption failures and use plain fields
    }

    const newDva = await this.resolveDedicatedAccount.execute({
      userPropertyId: targetUserPropertyId,
      tenantEmail: decryptedEmail,
      tenantName: `${decryptedFirstName || 'Tenant'} ${decryptedLastName || 'User'}`.trim(),
      tenantPhone: decryptedPhone,
      subaccountCode,
      preferredBank: targetBank,
      forceReissue: true,
      disableFallback: true,
    })

    if (currentActive && newDva.accountNumber === currentActive.accountNumber) {
      throw new BadRequestException(
        `Unable to provision an alternate ${targetBank === 'titan-paystack' ? 'Paystack-Titan' : 'Wema Bank'} account at this time. Please try again in a few minutes.`,
      )
    }

    return newDva
  }
}
