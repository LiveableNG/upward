import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { 
  PAYMENT_REQUEST_REPOSITORY, 
  IPaymentRequestRepository,
} from '@domains/payments/payment.repository'
import { PROPERTY_REPOSITORY, PropertyRepository } from '@domains/companies/property.repository'
import { USER_REPOSITORY, UserRepository } from '@domains/users/user.repository'
import { COMPANY_REPOSITORY, CompanyRepository, MANAGER_REPOSITORY, ManagerRepository } from '@domains/companies/company.repository'

@Injectable()
export class GetPublicPaymentDetailsUseCase {
  constructor(
    @Inject(PAYMENT_REQUEST_REPOSITORY) private readonly paymentRequestRepository: IPaymentRequestRepository,
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

    const company = await this.companyRepository.findById(property.companyId!)
    if (!company) {
      throw new NotFoundException('Associated company not found')
    }

    let manager = null
    if (property.managerId) {
      manager = await this.managerRepository.findById(property.managerId)
    }

    const subaccountCode = paymentRequest.subaccount?.subaccountCode || null

    return {
      payment: {
        uuid: paymentRequest.uuid,
        amount: paymentRequest.amount,
        currency: paymentRequest.currency,
        description: paymentRequest.description,
        lineItems: paymentRequest.lineItems,
        dueDate: paymentRequest.dueDate,
        status: paymentRequest.status,
        subaccountCode: subaccountCode,
      },
      user: {
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        phone: user.phone,
      },
      property: {
        uuid: property.uuid,
        rentAmount: property.rentAmount,
        rentEndDate: property.rentEndDate,
      },
      company: {
        name: company.name,
        address: company.address,
      },
      manager: manager ? {
        firstName: manager.firstName,
        lastName: manager.lastName,
      } : null,
      hasPassword: user.passwordHash !== 'INVITED',
    }
  }
}
