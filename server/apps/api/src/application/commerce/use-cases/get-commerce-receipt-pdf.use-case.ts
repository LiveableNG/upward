import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  COMMERCE_ORDER_REPOSITORY,
  CommerceOrderRepository,
} from '../../../domains/commerce/commerce-order.repository'
import {
  USER_REPOSITORY,
  UserRepository,
} from '../../../domains/users/user.repository'
import {
  CommerceReceiptData,
  CommerceReceiptService,
} from '../../../shared/infrastructure/common/receipt/commerce-receipt.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Injectable()
export class GetCommerceReceiptPdfUseCase {
  constructor(
    @Inject(COMMERCE_ORDER_REPOSITORY)
    private readonly orderRepo: CommerceOrderRepository,
    @Inject(USER_REPOSITORY)
    private readonly userRepo: UserRepository,
    private readonly receiptService: CommerceReceiptService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(userUuid: string, orderUuid: string): Promise<{ buffer: Buffer; filename: string }> {
    const user = await this.userRepo.findByUuid(userUuid)
    if (!user?.id) {
      throw new NotFoundException('Order not found')
    }

    const order = await this.orderRepo.findOrderByUuid(orderUuid)
    if (!order || order.userId !== user.id) {
      throw new NotFoundException('Order not found')
    }

    if (order.paymentStatus !== 'PAID') {
      throw new BadRequestException('Receipt is only available for confirmed paid orders')
    }

    let customerName = order.recipientName
    let customerEmail: string | undefined = undefined

    if (user) {
      try {
        const decryptedFirst = user.firstName ? this.encryption.decrypt(user.firstName) : ''
        const decryptedLast = user.lastName ? this.encryption.decrypt(user.lastName) : ''
        const fullName = `${decryptedFirst} ${decryptedLast}`.trim()
        if (fullName) customerName = fullName

        if (user.email) {
          customerEmail = this.encryption.decrypt(user.email)
        }
      } catch {
        // Fallback to order recipient name
      }
    }

    // Build line items from suborders
    const lineItems: CommerceReceiptData['lineItems'] = []
    ;(order.subOrders || []).forEach((sub) => {
      ;(sub.items || []).forEach((item) => {
        const title = item.snapshotData?.title || `Item #${item.offeringId}`
        const offeringType = item.offeringType || 'PRODUCT'
        lineItems.push({
          title,
          offeringType,
          quantity: item.quantity,
          unitPriceKobo: item.unitPriceKobo,
          totalPriceKobo: item.totalPriceKobo,
        })
      })
    })

    const receiptNumber = order.orderNumber.replace('UPW-ORD-', 'UPW-RCP-')

    const receiptData: CommerceReceiptData = {
      orderNumber: order.orderNumber,
      receiptNumber,
      customerName,
      customerEmail,
      deliveryAddress: order.deliveryAddress,
      paymentReference: order.paymentReference || 'N/A',
      paymentChannel: 'Paystack Central Checkout',
      paidAt: order.paidAt || order.createdAt || new Date(),
      currency: order.currency || 'NGN',
      itemsSubtotalKobo: order.itemsSubtotalKobo,
      deliveryFeeKobo: order.deliveryFeeKobo,
      discountKobo: order.discountKobo,
      totalAmountKobo: order.totalAmountKobo,
      lineItems,
    }

    const buffer = await this.receiptService.generateReceiptPdf(receiptData)
    const filename = `${receiptNumber}.pdf`

    return { buffer, filename }
  }
}
