import { Injectable, Logger } from '@nestjs/common'
import {
  IAssetManagementProvider,
  YieldMetrics,
  InvestorOnboardingRequest,
  InvestorOnboardingResponse,
  PurchaseSubscriptionRequest,
  PurchaseSubscriptionResponse,
  RedemptionRequest,
  RedemptionResponse,
  PortfolioSummary,
} from '../../../domains/rent-savings/asset-management.provider'

@Injectable()
export class MockInvestmentProvider implements IAssetManagementProvider {
  private readonly logger = new Logger(MockInvestmentProvider.name)
  public readonly providerName = 'MOCK'

  async getYieldMetrics(productCode: string = 'ARMMMF'): Promise<YieldMetrics> {
    return {
      annualNetYieldRate: 0.145,
      annualGrossYieldRate: 0.165,
      dailyYieldRate: 0.145 / 365,
      productCode,
      canInvest: true,
    }
  }

  async onboardInvestor(customer: InvestorOnboardingRequest): Promise<InvestorOnboardingResponse> {
    this.logger.log(`[MOCK] Onboarded investor for ${customer.customerEmail}`)
    const suffix = Math.floor(100000 + Math.random() * 900000)
    return {
      success: true,
      status: 'Approved',
      customerId: `MOCK_CUS_${suffix}`,
      customerMembershipId: `MEM_${suffix}`,
      crmAccountNumber: `CRM_${suffix}`,
    }
  }

  async subscribe(request: PurchaseSubscriptionRequest): Promise<PurchaseSubscriptionResponse> {
    this.logger.log(
      `[MOCK] Subscribed ₦${Number(request.amountKobo) / 100} for membership ${request.membershipId}`,
    )
    const id = Date.now().toString()
    return {
      success: true,
      transactionId: `MOCK_TXN_${id}`,
      purchaseId: `MOCK_PUR_${id}`,
      unitsAllocated: Number(request.amountKobo) / 100,
      message: 'Mock subscription successful',
    }
  }

  async redeem(request: RedemptionRequest): Promise<RedemptionResponse> {
    this.logger.log(
      `[MOCK] Redeemed ₦${Number(request.amountKobo) / 100} for account ${request.productAccountNumber}`,
    )
    const id = Date.now().toString()
    return {
      success: true,
      transactionId: `MOCK_TXN_${id}`,
      withdrawalId: `MOCK_WDL_${id}`,
      message: 'Mock redemption successful',
    }
  }

  async getPortfolio(membershipIdOrAccountId: string): Promise<PortfolioSummary> {
    return {
      membershipId: membershipIdOrAccountId,
      productCode: 'ARMMMF',
      accountNumber: `${membershipIdOrAccountId}-ARMMMF-01`,
      units: 25000,
      unitPrice: 1.0,
      marketValueKobo: 250000000n,
      currentBalanceKobo: 250000000n,
      accruedInterestKobo: 1540000n,
    }
  }
}
