import { Inject, Injectable, UnauthorizedException } from '@nestjs/common'
import {
  PAYMENT_REQUEST_REPOSITORY,
  IPaymentRequestRepository,
  PAYMENT_LINE_ITEM_REPOSITORY,
  IPaymentLineItemRepository,
  PAYMENT_GATEWAY,
  IPaymentGateway,
} from '../../../domains/payments/payment.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'

@Injectable()
export class GetPendingPaymentsUseCase {
  constructor(
    @Inject(PAYMENT_REQUEST_REPOSITORY)
    private readonly paymentRequestRepo: IPaymentRequestRepository,
    @Inject(PAYMENT_LINE_ITEM_REPOSITORY)
    private readonly lineItemRepo: IPaymentLineItemRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    @Inject(PAYMENT_GATEWAY)
    private readonly gateway: IPaymentGateway,
    private readonly prisma: PrismaService,
  ) { }

  async execute(userId: string) {
    const user = await this.userRepository.findByUuid(userId)
    if (!user) throw new UnauthorizedException('User not found')

    const pending = await this.paymentRequestRepo.findByUserIdAndStatus(user.id!, 'PENDING')
    const partial = await this.paymentRequestRepo.findByUserIdAndStatus(user.id!, 'PARTIAL')

    // Fetch Refund Alerts
    const refundAlerts = await this.prisma.upward_transaction.findMany({
      where: { userId: user.id!, settlementStatus: 'PENDING_REFUND' } as any,
      include: { paymentRequest: true }
    })

    const payments = [...pending, ...partial]

    const paymentsData = await Promise.all(payments.map(async (p: any) => {
      const lineItemRecords = await this.lineItemRepo.findByPaymentRequestId(p.id!)

      const pmPR = await this.prisma.upward_pm_payment_request.findFirst({
        where: { paymentRequestId: p.id },
        include: { pm: true }
      })

      const proofs = await this.prisma.upward_payment_proof.findMany({
        where: { paymentRequestId: p.id },
        orderBy: { createdAt: 'desc' },
      })

      const latestProof = proofs.length > 0 ? proofs[0] : null

      return {
        id: p.id,
        uuid: p.uuid,
        total_amount: p.amount,
        amountPaid: p.amountPaid || 0,
        currency: p.currency,
        status: p.status,
        allowPartial: p.allowPartial,
        minAmount: p.minAmount,
        remainingBalance: p.amount - (p.amountPaid || 0),
        payment_link_token: p.uuid,
        invoice_number: p.reference || p.uuid.slice(-8),
        description: p.description || 'Property Payment',
        subaccountCode: p.subaccount?.subaccountCode || null,
        company_name: p.companyName,
        manager_name: p.managerName,
        property_address: p.propertyLocation,
        userPropertyUuid: p.userPropertyUuid,
        isManual: p.isManual,
        isVerified: pmPR?.pm?.isVerified || false,
        lineItemRecords,
        type: 'invoice',
        latestProof: latestProof ? {
          id: latestProof.id,
          status: latestProof.status,
          remarks: latestProof.remarks,
          createdAt: latestProof.createdAt,
        } : null
      }
    }))

    const alertsData = refundAlerts.map(a => ({
      id: a.id,
      uuid: a.uuid,
      amount: a.amount,
      currency: a.currency,
      reference: a.reference,
      status: 'PENDING_REFUND',
      type: 'refund_alert',
      description: 'Refund Pending: Full payment requirement not met',
      property_address: a.propertyAddress || 'Your Property'
    }))

    const standaloneProofs = await this.prisma.upward_payment_proof.findMany({
      where: {
        paymentRequestId: null,
        status: { in: ['PENDING', 'REJECTED'] },
        OR: [
          { uploadedByUserId: user.id },
          { userProperty: { userId: user.id } },
        ],
      },
      include: {
        userProperty: { include: { location: true, company: true } }
      }
    })

    const standaloneProofsData = standaloneProofs.map(proof => {
      const p = proof.userProperty
      const property_address = p?.location ? `${p.location.area}, ${p.location.state}` : 'Your Property'
      return {
        id: proof.id,
        uuid: proof.uuid,
        total_amount: proof.amount || 0,
        amountPaid: 0,
        currency: proof.currency || 'NGN',
        status: 'PENDING',
        allowPartial: false,
        minAmount: null,
        remainingBalance: proof.amount || 0,
        payment_link_token: proof.uuid,
        invoice_number: `MNL-${proof.id}`,
        description: 'Manual Payment Proof',
        subaccountCode: null,
        company_name: p?.company?.name,
        manager_name: null,
        property_address,
        userPropertyUuid: p?.uuid,
        isManual: true,
        isVerified: false,
        lineItemRecords: [],
        type: 'invoice',
        latestProof: {
          id: proof.id,
          status: proof.status,
          remarks: proof.remarks,
          createdAt: proof.createdAt,
        }
      }
    })

    return [...alertsData, ...paymentsData, ...standaloneProofsData]
  }
}
