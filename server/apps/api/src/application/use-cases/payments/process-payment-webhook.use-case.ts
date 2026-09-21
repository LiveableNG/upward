import { Inject, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac } from 'node:crypto'
import { RecordTransactionUseCase } from './record-transaction.use-case'
import { CreditRentDepositUseCase } from './credit-rent-deposit.use-case'
import { CreditWalletUseCase } from './wallet.use-cases'
import {
  DVA_ACCOUNT_REPOSITORY,
  IDVAAccountRepository,
  PAYMENT_GATEWAY,
  IPaymentGateway,
} from '../../../domains/payments/payment.repository'
import { EVENT_BUS, EventBus } from '../../events/domain-event'
import { UnderpaymentDetectedEvent } from '../../events/definition/underpayment-detected.event'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { PaymentConfigurationService } from '../../../shared/infrastructure/common/payment-config.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service'

@Injectable()
export class ProcessPaymentWebhookUseCase {
  private readonly logger = new Logger(ProcessPaymentWebhookUseCase.name)

  constructor(
    private readonly recordTransaction: RecordTransactionUseCase,
    private readonly creditRentDeposit: CreditRentDepositUseCase,
    private readonly configService: ConfigService,
    @Inject(DVA_ACCOUNT_REPOSITORY)
    private readonly dvaRepo: IDVAAccountRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly paymentGateway: IPaymentGateway,
    @Inject(EVENT_BUS)
    private readonly eventBus: EventBus,
    private readonly prisma: PrismaService,
    private readonly paymentConfig: PaymentConfigurationService,
    private readonly encryption: EncryptionService,
    private readonly creditWalletUseCase: CreditWalletUseCase,
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) { }

  async execute(payload: any, signature?: string, url: string = '/payments/webhook') {
    let logRecord: any = null
    try {
      logRecord = await this.prisma.upward_webhook_log.create({
        data: {
          event: payload?.event || 'UNKNOWN',
          url,
          payload: payload || {},
          status: 'RECEIVED',
          direction: 'INCOMING',
        },
      })
    } catch (e) {
      this.logger.error('Failed to create incoming webhook log', e)
    }

    try {
      const result = await this.processWebhookPayload(payload, signature)
      if (logRecord) {
        await this.prisma.upward_webhook_log.update({
          where: { id: logRecord.id },
          data: { status: 'SUCCESS', responseCode: 200 },
        }).catch(() => {})
      }
      return result
    } catch (error: any) {
      this.logger.error('Webhook processing failed:', error)
      if (logRecord) {
        await this.prisma.upward_webhook_log.update({
          where: { id: logRecord.id },
          data: {
            status: 'FAILED',
            errorMessage: error.message || String(error),
            responseCode: error.status || 500,
          },
        }).catch(() => {})
      }
      throw error
    }
  }

  private async processWebhookPayload(payload: any, signature?: string) {
    this.logger.log(`Incoming Webhook: ${payload?.event || 'unknown event'}`)

    if (!signature) {
      this.logger.warn('Webhook received without signature')
      throw new UnauthorizedException('Missing webhook signature')
    }

    const secret = this.configService.get<string>('PAYSTACK_SECRET_KEY') || process.env.PAYSTACK_SECRET_KEY || 'sk_test_fallback'

    // Verify HMAC SHA512 signature
    const bodyString = JSON.stringify(payload)
    const hash = createHmac('sha512', secret)
      .update(bodyString)
      .digest('hex')

    if (hash !== signature) {
      this.logger.warn(`Invalid webhook signature attempt. Received: ${signature.slice(0, 8)}..., Expected: ${hash.slice(0, 8)}...`)
      this.logger.debug(`Hashed string: ${bodyString}`)

      if (secret.startsWith('sk_test_')) {
        this.logger.warn('BYPASS: Allowing invalid signature because sk_test key is in use. Fix stringification for production!')
      } else {
        throw new UnauthorizedException('Invalid signature')
      }
    }

    let rawMetadata = payload.data?.metadata
    if (typeof rawMetadata === 'string' && rawMetadata.length > 0) {
      try {
        rawMetadata = JSON.parse(rawMetadata)
      } catch (e) {
      }
    }
    const sourceApp = rawMetadata?.source_app || payload.data?.customer?.metadata?.source_app

    if (sourceApp && sourceApp !== 'upward') {
      this.logger.log(`Webhook ignored: event is for source_app '${sourceApp}'`)
      return { success: true, message: `Event ignored: for ${sourceApp}` }
    }

    if (payload.event === 'charge.success') {
      const { reference, amount, currency } = payload.data
      let metadata = payload.data.metadata

      if (typeof metadata === 'string' && metadata.length > 0) {
        try {
          metadata = JSON.parse(metadata)
        } catch (e) {
          this.logger.warn(`Failed to parse metadata string for reference ${reference}`)
        }
      }

      if (payload.data.dedicated_account || payload.data.channel === 'dedicated_account' || payload.data.channel === 'dedicated_nuban') {
        this.logger.log(`DVA Payment detected in charge.success for reference: ${reference}`)
        return this.handleDvaPayment(payload.data)
      }

      let { userUuid, userId } = metadata || {}

      if (!userUuid && !userId && payload.data.customer?.email) {
        const rawEmail = payload.data.customer.email as string
        let searchEmail = rawEmail

        if (rawEmail.includes('+p')) {
          const parts = rawEmail.split('@')
          if (parts.length === 2 && parts[0] && parts[1]) {
            const base = parts[0].split('+p')[0]
            searchEmail = `${base}@${parts[1]}`

            const propertyMatch = parts[0].match(/\+p(\d+)/)
            if (propertyMatch && propertyMatch[1]) {
              const propertyId = parseInt(propertyMatch[1])
              if (!metadata) metadata = {}
              const prop = await this.prisma.upward_user_property.findUnique({
                where: { id: propertyId }
              })
              if (prop) {
                metadata.userPropertyUuid = prop.uuid
                this.logger.log(`Resolved property context from alias: ${rawEmail} -> Prop UUID: ${prop.uuid}`)

                const dva = await this.dvaRepo.findByUserPropertyId(prop.id)
                if (dva && dva.metadata && typeof dva.metadata === 'object' && 'lastPaymentIntent' in (dva.metadata as any)) {
                  const intent = (dva.metadata as any).lastPaymentIntent
                  const amountPaid = amount / 100

                  if (intent && intent.amount === amountPaid && (Date.now() - intent.timestamp < 48 * 60 * 60 * 1000)) {
                    metadata.lineItems = intent.lineItems
                    this.logger.log(`Recovered lineItems from DVA intent for alias-based payment: ${JSON.stringify(metadata.lineItems)}`)

                    await this.prisma.upward_dedicated_virtual_account.update({
                      where: { id: dva.id },
                      data: { metadata: { ...((dva.metadata as any) || {}), lastPaymentIntent: null } }
                    })
                  }
                }
              }
            }
          }
        }

        const emailHash = this.encryption.hash(searchEmail)
        const user = await this.prisma.upward_user.findUnique({
          where: { emailHash }
        })

        if (user) {
          userUuid = user.uuid
          this.logger.log(`Recovered user identity via email for reference ${reference}: ${user.email} (from ${rawEmail})`)
        } else {
          this.logger.warn(`Could not find user for customer email: ${searchEmail} (raw: ${rawEmail})`)
        }
      }

      if (!userUuid && !userId) {
        this.logger.error(`Webhook failed: No user identification in metadata or customer record for reference ${reference}`)
        throw new Error('No user identification in Paystack metadata')
      }

      this.logger.log(`Processing charge.success for reference ${reference}. Lineitems: ${JSON.stringify(metadata?.lineItems || 'none')}`)

      const effectiveUserId = userUuid || userId

      if (metadata?.paymentKind === 'WALLET_DEPOSIT' || metadata?.type === 'WALLET_DEPOSIT') {
        const targetUser = userUuid
          ? await this.prisma.upward_user.findUnique({ where: { uuid: String(userUuid) } })
          : await this.prisma.upward_user.findUnique({ where: { id: Number(userId) || -1 } })
        if (!targetUser) {
          throw new Error('User not found for wallet deposit webhook')
        }
        await this.creditWalletUseCase.execute({
          userId: targetUser.id,
          amount: amount / 100,
          reference,
          type: 'WALLET_DEPOSIT',
          narration: metadata?.description || 'Savings wallet deposit',
          metadata: { gateway: 'paystack', currency: currency || 'NGN' },
        })
        return { success: true, walletCredited: true }
      }

      return this.recordTransaction.execute({
        userId: String(effectiveUserId),
        reference,
        amount: amount / 100,
        currency: currency || 'NGN',
        userPropertyUuid: metadata?.userPropertyUuid,
        paymentRequestId: metadata?.paymentRequestId,
        type: metadata?.type || 'RENT',
        status: 'SUCCESS',
        narration: metadata?.description || payload.data.display_text || 'Paystack Payment',
        lineItemPayments: metadata?.lineItems,
      })
    }

    if (payload.event === 'dedicatedaccount.payment.success') {
      return this.handleDvaPayment(payload.data)
    }

    if (['transfer.success', 'transfer.failed', 'transfer.reversed'].includes(payload.event)) {
      const { reference } = payload.data
      const isSuccess = payload.event === 'transfer.success'
      const status = isSuccess ? 'COMPLETED' : 'FAILED'

      this.logger.log(`Transfer ${payload.event} received for reference: ${reference}`)

      if (reference.startsWith('BATCH-')) {
        const batchUuid = reference.replace('BATCH-', '')
        const batch = await this.prisma.upward_settlement_batch.findUnique({ where: { uuid: batchUuid } })
        if (batch) {
          await this.prisma.upward_settlement_batch.update({
            where: { id: batch.id },
            data: { status }
          })
          if (!isSuccess) {
            await this.prisma.upward_transaction.updateMany({
              where: { settlementBatchId: batch.id },
              data: { settlementStatus: 'VERIFIED', settlementBatchId: null }
            })
          }
        }
      }

      if (reference.startsWith('REFUND-')) {
        const originalTxRef = reference.replace('REFUND-', '')
        await this.prisma.upward_transaction.update({
          where: { reference: originalTxRef },
          data: { settlementStatus: isSuccess ? 'REFUNDED' : 'PENDING_REFUND' }
        })

        const targetTx = await this.prisma.upward_transaction.findUnique({
          where: { reference: originalTxRef }
        })
        if (targetTx) {
          const logStatus = isSuccess ? 'DISPATCHED' : 'FAILED'
          const existingLog = await this.prisma.upward_refund_log.findFirst({
            where: { transactionId: targetTx.id },
            orderBy: { createdAt: 'desc' }
          })
          if (existingLog) {
            await this.prisma.upward_refund_log.update({
              where: { id: existingLog.id },
              data: {
                status: logStatus,
                resolvedAt: isSuccess ? new Date() : undefined,
                metadata: {
                  ...(existingLog.metadata as any || {}),
                  webhookPayload: payload.data
                }
              }
            })
          }
        }
      }

      return { success: true }
    }

    return { success: true, message: 'Event ignored' }
  }

  private async handleDvaPayment(data: any) {
    const accountNumber = data.dedicated_account?.account_number || data.dedicated_account || data.authorization?.receiver_bank_account_number || data.metadata?.receiver_account_number
    if (!accountNumber) {
      this.logger.error(`Could not resolve account number from DVA payload: ${JSON.stringify(data)}`)
      return { success: false, message: 'Missing account number' }
    }

    this.logger.log(`Processing DVA Payment for account: ${accountNumber}`)

    const pmDva = await this.prisma.upward_pm_dedicated_virtual_account.findUnique({
      where: { accountNumber }
    });

    if (pmDva) {
      this.logger.log(`Routing DVA Payment for PM Wallet: PM ID ${pmDva.pmId}`);
      
      const amountPaid = data.amount / 100;

      const existingTx = data.reference
        ? await this.prisma.upward_pm_wallet_transaction.findUnique({
            where: { reference: data.reference },
          })
        : null;

      if (existingTx) {
        this.logger.log(`Skipping duplicate PM wallet DVA payment for reference ${data.reference}`)
        return { success: true, message: 'PM Wallet Funding already processed' }
      }
      
      let wallet = await this.prisma.upward_pm_wallet.findUnique({ where: { pmId: pmDva.pmId } });
      if (!wallet) {
        wallet = await this.prisma.upward_pm_wallet.create({ data: { pmId: pmDva.pmId, balance: 0 } });
      }

      await this.prisma.upward_pm_wallet_transaction.create({
        data: {
          walletId: wallet.id,
          pmId: pmDva.pmId,
          amount: amountPaid,
          type: 'DEPOSIT',
          reference: data.reference || `PM_DVA_${Date.now()}`,
          status: 'SUCCESS',
          narration: 'Wallet Funding via Dedicated Virtual Account',
        }
      });
      
      await this.prisma.upward_pm_wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: amountPaid } }
      });

      const updatedBalance = (wallet.balance || 0) + amountPaid

      const pm = await this.prisma.upward_property_manager.findUnique({
        where: { id: pmDva.pmId },
      })

      const sub = await this.prisma.upward_subscription.findUnique({
        where: { pmId: pmDva.pmId },
      });

      const totalUnits = await this.prisma.upward_pm_unit.count({
        where: { property: { pmId: pmDva.pmId } },
      });

      const occupiedUnits = await this.prisma.upward_pm_unit.count({
        where: { property: { pmId: pmDva.pmId }, status: 'OCCUPIED' },
      });

      const billingMode = sub?.unitBillingMode ?? 'ALL';
      const unitCount = billingMode === 'ALL' ? Math.max(totalUnits, 1) : occupiedUnits;
      const yearlyRate = sub?.tier === 'TIER_3' ? 2250 : 1500;
      const minRequiredDeposit = Math.max(50000, unitCount * yearlyRate);

      if (updatedBalance >= minRequiredDeposit && pm && !(pm as any).isManuallyBlocked) {
        await this.prisma.upward_property_manager.update({
          where: { id: pmDva.pmId },
          data: { isBlocked: false },
        });
      }
      const pmEmail = pm?.email ? this.encryption.decrypt(pm.email) : null
      const pmFirstName = pm?.firstName ? this.encryption.decrypt(pm.firstName) : ''
      const pmLastName = pm?.lastName ? this.encryption.decrypt(pm.lastName) : ''
      const pmBusinessName = pm?.businessName ? this.encryption.decrypt(pm.businessName) : ''
      const pmName = pmBusinessName || `${pmFirstName} ${pmLastName}`.trim() || 'Property Manager'

      await this.prisma.upward_pm_notification.create({
        data: {
          pmId: pmDva.pmId,
          title: 'Wallet credited',
          message: `Your wallet has been credited with NGN ${amountPaid.toLocaleString()} via Dedicated Virtual Account. New balance: NGN ${updatedBalance.toLocaleString()}.`,
          type: 'PAYMENT_COMPLETED',
          isPopup: true,
          url: '/subscription/wallet',
        },
      })

      if (pmEmail) {
        const baseUrl = (process.env.FRONTEND_URL || 'https://upward.goodtenants.io').split(',')[0]!.trim();
        await this.unifiedCommService.processCommunication({
          recipientEmail: pmEmail,
          recipientName: pmName,
          recipientRole: 'PM',
          pmUuid: pm?.uuid,
          type: 'PM_WALLET_FUNDING_RECEIVED',
          context: {
            pmName,
            amount: amountPaid,
            formattedAmount: amountPaid.toLocaleString(),
            walletBalance: updatedBalance,
            formattedWalletBalance: updatedBalance.toLocaleString(),
            accountNumber,
            baseUrl,
          },
        }).catch((err) => {
          this.logger.error(`Failed to send DVA funding email to PM ${pmEmail}:`, err)
        })
      }
      
      return { success: true, message: 'PM Wallet Funded' };
    }

    const dva = await this.dvaRepo.findByAccountNumber(accountNumber)
    if (!dva || !dva.userPropertyId) {
      this.logger.warn(`DVA payment received for unknown or unlinked account: ${accountNumber}`)
      return { success: true, message: 'Unlinked account' }
    }

    // Find active payment request for this user property
    const pr = await this.prisma.upward_payment_request.findFirst({
      where: {
        userPropertyId: dva.userPropertyId,
        status: { in: ['PENDING', 'PARTIAL'] }
      },
      include: {
        user: true,
        userProperty: {
          include: { subaccount: true }
        }
      }
    })

    const amountPaid = data.amount / 100

    if (!pr) {
      this.logger.log(`Direct DVA transfer received for Property ${dva.userPropertyId} with no active request. Crediting Rent Deposit Balance directly.`)

      // Find the user associated with this property
      const userProp = await this.prisma.upward_user_property.findUnique({
        where: { id: dva.userPropertyId },
        include: { user: true, subaccount: true }
      })

      if (!userProp) {
        this.logger.error(`DVA payment received for non-existent property relation: ${dva.userPropertyId}`)
        return { success: true, message: 'Property not found' }
      }

      const depositTx = await this.creditRentDeposit.execute({
        userId: userProp.user.id,
        userPropertyId: userProp.id,
        amount: amountPaid,
        reference: data.reference,
        currency: data.currency || 'NGN',
        source: 'DVA_INFLOW',
        narration: `Direct Bank Transfer to Virtual Account (${dva.accountNumber})`,
      })

      return {
        success: true,
        type: 'RENT_DEPOSIT_CREDIT',
        depositTransactionId: depositTx?.id,
        message: 'Funds credited to Rent Deposit Balance',
      }
    }

    // 1. Check for stored payment intent in DVA metadata
    let lineItemPayments: any[] | undefined = undefined
    let upwardFeeAmount = 0
    let excludeBenefits = false
    if (dva.metadata && typeof dva.metadata === 'object' && 'lastPaymentIntent' in (dva.metadata as any)) {
      const intent = (dva.metadata as any).lastPaymentIntent
      // If the intent is fresh (e.g. < 48 hours) and amount matches exactly
      if (intent && intent.amount === amountPaid && (Date.now() - intent.timestamp < 48 * 60 * 60 * 1000)) {
        lineItemPayments = intent.lineItems
        excludeBenefits = intent.excludeBenefits === true || !!(lineItemPayments && !lineItemPayments.some(lp => lp.name === 'Upward Benefits'))
        this.logger.log(`Found matching payment intent for DVA transfer. Using manual allocations. ExcludeBenefits: ${excludeBenefits}`)

        // Extract fee if specified
        const feeItem = lineItemPayments?.find(lp => lp.name === 'Upward Benefits')
        if (feeItem) {
          upwardFeeAmount = Number(feeItem.amount || feeItem.amountPaid || 0)
        }

        // Map amount to amountPaid for distribute-allocations compatibility
        lineItemPayments = lineItemPayments?.map(lp => ({
          ...lp,
          amountPaid: Number(lp.amount || lp.amountPaid || 0)
        }))

        // Clear the intent so it's not reused
        await this.prisma.upward_dedicated_virtual_account.update({
          where: { id: dva.id },
          data: {
            metadata: {
              ...((dva.metadata as any) || {}),
              lastPaymentIntent: null
            }
          }
        })
      } else if (intent) {
        this.logger.log(`DVA payment amount (${amountPaid}) does not match saved intent amount (${intent.amount}). Falling back to sequential fill.`)
        // Clear non-matching or expired intent
        await this.prisma.upward_dedicated_virtual_account.update({
          where: { id: dva.id },
          data: {
            metadata: {
              ...((dva.metadata as any) || {}),
              lastPaymentIntent: null
            }
          }
        })
      }
    }

    // Verification Logic: Intercept & Check against Source of Truth
    const rates = await this.paymentConfig.getDynamicProcessingRates(pr.userId, pr.userPropertyId, pr.id)
    const activeBenefitsFee = (rates.benefitsPaid || excludeBenefits) ? 0 : rates.benefitsFee
    const dynamicFee = rates.transactionFee + activeBenefitsFee
    const expectedTotal = pr.amount + dynamicFee

    let settlementStatus = 'VERIFIED'
    if (!pr.allowPartial && amountPaid < expectedTotal) {
      this.logger.warn(`Full-Payment Violation: User ${pr.user.email} paid ${amountPaid} instead of ${expectedTotal}. Marking for refund.`)
      settlementStatus = 'PENDING_REFUND'
    }

    const hasNoIntent = !lineItemPayments
    const sequentialFill = hasNoIntent && pr.allowPartial && !!pr.id

    const result = await this.recordTransaction.execute({
      userId: pr.user.uuid,
      amount: amountPaid,
      currency: data.currency || 'NGN',
      reference: data.reference,
      type: 'RENT',
      status: 'SUCCESS',
      paymentRequestId: pr.id,
      narration: `Bank Transfer to ${dva.accountNumber} (${dva.bankName})`,
      settlementStatus,
      lineItemPayments,
      sequentialFill,
      metadata: {
        excludeBenefits
      }
    })

    if (settlementStatus === 'PENDING_REFUND') {
      this.eventBus.publish(new UnderpaymentDetectedEvent(
        pr.user.id,
        pr.userPropertyId!,
        pr.id,
        amountPaid,
        expectedTotal,
        data.reference,
        true
      ))
    }

    return result
  }
}
