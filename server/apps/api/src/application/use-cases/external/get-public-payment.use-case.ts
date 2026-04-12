import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { 
  PAYMENT_REQUEST_REPOSITORY, 
  IPaymentRequestRepository,
  PAYMENT_LINE_ITEM_REPOSITORY,
  IPaymentLineItemRepository,
} from '../../../domains/payments/payment.repository'
import { PROPERTY_REPOSITORY, PropertyRepository } from '../../../domains/companies/property.repository'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { COMPANY_REPOSITORY, CompanyRepository, MANAGER_REPOSITORY, ManagerRepository } from '../../../domains/companies/company.repository'

@Injectable()
export class GetPublicPaymentDetailsUseCase {
  constructor(
    @Inject(PAYMENT_REQUEST_REPOSITORY) private readonly paymentRequestRepository: IPaymentRequestRepository,
    @Inject(PAYMENT_LINE_ITEM_REPOSITORY) private readonly lineItemRepository: IPaymentLineItemRepository,
    @Inject(PROPERTY_REPOSITORY) private readonly propertyRepository: PropertyRepository,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(COMPANY_REPOSITORY) private readonly companyRepository: CompanyRepository,
    @Inject(MANAGER_REPOSITORY) private readonly managerRepository: ManagerRepository,
  ) {}

  async execute(uuid: string): Promise<any> {
    const paymentRequest = await this.paymentRequestRepository.findByUuid(uuid)
    if (!paymentRequest) {
      throw new NotFoundException(`Payment request with UUID ${uuid} not found`)
    }

    const property = await this.propertyRepository.findById(paymentRequest.userPropertyId!)
    if (!property) {
      throw new NotFoundException('Associated property not found')
    }

    const user = await this.userRepository.findById(paymentRequest.userId)
    if (!user) {
      throw new NotFoundException('Associated user not found')
    }

    let company = null
    if (property.companyId) {
      company = await this.companyRepository.findById(property.companyId)
    }

    let manager = null
    if (property.managerId) {
      manager = await this.managerRepository.findById(property.managerId)
    }

    // Fetch structured line item records from DB
    const lineItemRecords = await this.lineItemRepository.findByPaymentRequestId(paymentRequest.id!)

    const subaccountCode = paymentRequest.subaccount?.subaccountCode || null

    // Company name: prefer company, fallback to manager full name
    const companyName = company?.name || 
                        (manager ? `${manager.firstName} ${manager.lastName}` : null)

    // Property location address: compose from location data
    const location = (property as any).location
    const locationAddress = location
      ? [location.address, location.area, location.state, location.country]
          .filter(Boolean).join(', ')
      : null

    return {
      payment: {
        uuid: paymentRequest.uuid,
        amount: paymentRequest.amount,
        amountPaid: paymentRequest.amountPaid || 0,
        currency: paymentRequest.currency,
        description: paymentRequest.description,
        dueDate: paymentRequest.dueDate,
        status: paymentRequest.status,
        subaccountCode: subaccountCode,
        allowPartial: paymentRequest.allowPartial || false,
        minAmount: paymentRequest.minAmount || undefined,
        lineItemRecords: lineItemRecords,
      },
      user: {
        uuid: user.uuid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      },
      property: {
        uuid: property.uuid,
        rentAmount: property.rentAmount,
        rentEndDate: property.rentEndDate,
        locationAddress: locationAddress,
      },
      company: {
        name: companyName,
      },
      manager: manager ? {
        firstName: manager.firstName,
        lastName: manager.lastName,
      } : null,
      hasPassword: user.passwordHash !== 'INVITED',
    }
  }
}
