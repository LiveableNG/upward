import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
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

interface ArmLoginData {
  token: string
  refreshToken: string
  expiresAt: string
  merchantId: string
  membershipId: string
  merchantType: string
}

@Injectable()
export class ArmConnectInvestmentProvider implements IAssetManagementProvider {
  private readonly logger = new Logger(ArmConnectInvestmentProvider.name)
  public readonly providerName = 'ARM'

  private readonly baseUrl: string
  private readonly email: string
  private readonly password: string

  private cachedToken: string | null = null
  private tokenExpiresAt: Date | null = null
  private merchantMembershipId: string | null = null

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = (
      this.configService.get<string>('ARM_BASE_URL') || 'https://sandapi.arm.com.ng'
    ).replace(/\/$/, '')
    this.email = this.configService.get<string>('ARM_EMAIL') || 'tech@goodtenants.africa'
    this.password = this.configService.get<string>('ARM_PASSWORD') || 'Test@123'
  }

  /**
   * Retrieves or refreshes the merchant JWT bearer token
   */
  private async getValidToken(): Promise<string> {
    const now = new Date()
    // Refresh 5 minutes before expiration
    if (
      this.cachedToken &&
      this.tokenExpiresAt &&
      this.tokenExpiresAt.getTime() - now.getTime() > 300_000
    ) {
      return this.cachedToken
    }

    this.logger.log(`Authenticating with ARM Connect API (${this.baseUrl})...`)
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/merchant/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: this.email,
          password: this.password,
        }),
      })

      if (!response.ok) {
        const errorBody = await response.text()
        this.logger.error(`ARM login failed (${response.status}): ${errorBody}`)
        throw new Error(`ARM login failed with status ${response.status}`)
      }

      const resJson = await response.json()
      if (!resJson.status || !resJson.data?.token) {
        throw new Error(resJson.message || 'Invalid authentication response from ARM')
      }

      const data = resJson.data as ArmLoginData
      this.cachedToken = data.token
      this.tokenExpiresAt = new Date(data.expiresAt)
      this.merchantMembershipId = data.membershipId
      this.logger.log(`ARM Connect authenticated successfully. MembershipId: ${data.membershipId}`)
      return this.cachedToken
    } catch (err) {
      this.logger.error('Failed to authenticate with ARM Connect API', err)
      // Fallback: If external sandbox is unreachable during development, allow graceful error propagation
      throw err
    }
  }

  async getYieldMetrics(productCode: string = 'ARMMMF'): Promise<YieldMetrics> {
    try {
      const token = await this.getValidToken()
      const response = await fetch(`${this.baseUrl}/Product/MutualFunds`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const resJson = await response.json()
        const funds = Array.isArray(resJson.data) ? resJson.data : []
        const fund = funds.find(
          (f: any) => f.productCode === productCode || f.identifier === productCode,
        )

        if (fund) {
          const rateNum = Number(fund.productRate || 14.5) / 100
          return {
            annualNetYieldRate: rateNum > 0 ? rateNum : 0.145,
            annualGrossYieldRate: (rateNum > 0 ? rateNum : 0.145) + 0.02,
            dailyYieldRate: (rateNum > 0 ? rateNum : 0.145) / 365,
            productCode,
            canInvest: fund.canInvest !== false && fund.isActive !== false,
          }
        }
      }
    } catch (err) {
      this.logger.warn(
        `Could not fetch live rate from ARM for ${productCode}, falling back to baseline 14.5% p.a.`,
        err,
      )
    }

    // Default baseline if ARM network is slow or sandbox fund list is empty
    return {
      annualNetYieldRate: 0.145,
      annualGrossYieldRate: 0.165,
      dailyYieldRate: 0.145 / 365,
      productCode,
      canInvest: true,
    }
  }

  async onboardInvestor(customer: InvestorOnboardingRequest): Promise<InvestorOnboardingResponse> {
    const token = await this.getValidToken()
    this.logger.log(`Submitting B2B2C customer onboarding to ARM for ${customer.customerEmail}...`)

    const payload = {
      customerEmail: customer.customerEmail,
      personalDetails: {
        surname: customer.personalDetails.surname,
        firstName: customer.personalDetails.firstName,
        middleName: customer.personalDetails.middleName || '',
        dateOfBirth: customer.personalDetails.dateOfBirth,
        gender: customer.personalDetails.gender,
        nationality: customer.personalDetails.nationality || 'Nigerian',
        title: customer.personalDetails.gender === 'Female' ? 'Ms' : 'Mr',
        stateOfOrigin: customer.personalDetails.stateOfOrigin || 'Lagos',
        placeOfBirth: customer.personalDetails.placeOfBirth || 'Lagos',
        annualExpectedAnnualIncomeRange:
          customer.personalDetails.annualExpectedIncomeRange || '1M-5M',
        riskAppetite: customer.personalDetails.riskAppetite || 'Medium',
        riskProfile: customer.personalDetails.riskProfile || 'Balanced',
        sourceOfFunds: customer.personalDetails.sourceOfFunds || 'Salary',
        occupation: customer.personalDetails.occupation || 'Professional',
        mothersMaidenName: customer.personalDetails.mothersMaidenName || 'Unknown',
        emailAddress: customer.customerEmail,
        mobilePhone: customer.personalDetails.mobilePhone,
      },
      address: {
        addressNumber: customer.address.addressNumber || '1',
        streetName: customer.address.streetName,
        town: customer.address.town || 'Lagos',
        residentialCountry: customer.address.residentialCountry || 'Nigeria',
        residentialStateCode: customer.address.residentialStateCode || 'LA',
      },
      kycDetails: customer.kycDetails
        ? {
            bvn: customer.kycDetails.bvn,
            idType: customer.kycDetails.idType || 'NationalId',
            idNumber: customer.kycDetails.idNumber || '00000000',
            nin: customer.kycDetails.nin,
          }
        : undefined,
      bankDetails: customer.bankDetails
        ? {
            bankName: customer.bankDetails.bankName,
            accountName: customer.bankDetails.accountName,
            accountNumber: customer.bankDetails.accountNumber,
            bankCode: customer.bankDetails.bankCode,
          }
        : undefined,
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/api/MerchantOnboarding/merchant-customers/onboard`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
      )

      const resJson = await response.json()
      if (!response.ok) {
        this.logger.error(`ARM customer onboarding failed: ${JSON.stringify(resJson)}`)
        return {
          success: false,
          status: 'Failed',
          failureReason: resJson.message || 'Customer onboarding rejected by ARM',
        }
      }

      return {
        success: true,
        status: resJson.data?.status || 'Submitted',
        customerId: resJson.data?.customerId,
        customerMembershipId: resJson.data?.customerMembershipId,
        crmAccountNumber: resJson.data?.crmAccountNumber,
      }
    } catch (err: any) {
      this.logger.error(`ARM customer onboarding error: ${err.message}`)
      return {
        success: false,
        status: 'Failed',
        failureReason: err.message,
      }
    }
  }

  async subscribe(request: PurchaseSubscriptionRequest): Promise<PurchaseSubscriptionResponse> {
    const token = await this.getValidToken()
    const amountInNaira = Number(request.amountKobo) / 100
    const membershipId = request.membershipId || this.merchantMembershipId || ''

    this.logger.log(
      `Executing ARM bulk purchase: ₦${amountInNaira} for product ${request.productCode}...`,
    )

    const payload = {
      requests: [
        {
          amount: amountInNaira,
          productCode: request.productCode || 'ARMMMF',
          membershipId,
        },
      ],
    }

    const response = await fetch(`${this.baseUrl}/Product/mutualfunds/purchase/bulk`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const resJson = await response.json()
    if (!response.ok) {
      throw new Error(`ARM purchase call failed (${response.status}): ${JSON.stringify(resJson)}`)
    }

    // Inspect individual element status (per ARM Gotcha #4)
    const item = Array.isArray(resJson.data) ? resJson.data[0] : null
    if (item && item.status === false) {
      throw new Error(`ARM purchase item rejected: ${item.message || 'Unknown reason'}`)
    }

    return {
      success: true,
      transactionId: resJson.transactionId,
      purchaseId: item?.purchaseId,
      unitsAllocated: amountInNaira,
      message: 'ARM purchase successfully processed',
    }
  }

  async redeem(request: RedemptionRequest): Promise<RedemptionResponse> {
    const token = await this.getValidToken()
    const amountInNaira = Number(request.amountKobo) / 100
    const membershipId = request.membershipId || this.merchantMembershipId || ''

    this.logger.log(
      `Executing ARM bulk withdrawal: ₦${amountInNaira} from account ${request.productAccountNumber}...`,
    )

    const payload = {
      requests: [
        {
          amount: amountInNaira,
          productCode: request.productCode || 'ARMMMF',
          membershipId,
          productAccountNumber: request.productAccountNumber,
        },
      ],
    }

    const response = await fetch(`${this.baseUrl}/Product/mutualfunds/withdraw/bulk`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const resJson = await response.json()
    if (!response.ok) {
      throw new Error(`ARM withdrawal call failed (${response.status}): ${JSON.stringify(resJson)}`)
    }

    const item = Array.isArray(resJson.data) ? resJson.data[0] : null
    if (item && item.status === false) {
      throw new Error(`ARM withdrawal item rejected: ${item.message || 'Unknown reason'}`)
    }

    return {
      success: true,
      transactionId: resJson.transactionId,
      withdrawalId: item?.withdrawalId,
      message: 'ARM withdrawal successfully processed',
    }
  }

  async getPortfolio(membershipIdOrAccountId: string): Promise<PortfolioSummary> {
    const token = await this.getValidToken()
    const response = await fetch(`${this.baseUrl}/Product/MutualFunds/Portfolio`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ARM portfolio fetch failed (${response.status}): ${errorText}`)
    }

    const resJson = await response.json()
    const holdings = Array.isArray(resJson.data) ? resJson.data : []
    const holding =
      holdings.find(
        (h: any) =>
          h.accountNumber === membershipIdOrAccountId ||
          h.productAccountNumber === membershipIdOrAccountId ||
          h.investmentIdentifier === membershipIdOrAccountId,
      ) || holdings[0]

    if (!holding) {
      return {
        membershipId: membershipIdOrAccountId,
        productCode: 'ARMMMF',
        accountNumber: membershipIdOrAccountId,
        units: 0,
        unitPrice: 1.0,
        marketValueKobo: 0n,
        currentBalanceKobo: 0n,
        accruedInterestKobo: 0n,
      }
    }

    return {
      membershipId: membershipIdOrAccountId,
      productCode: holding.productCode || 'ARMMMF',
      accountNumber:
        holding.accountNumber || holding.investmentIdentifier || membershipIdOrAccountId,
      units: Number(holding.units || 0),
      unitPrice: Number(holding.currentPrice || 1.0),
      marketValueKobo: BigInt(Math.round(Number(holding.marketValue || 0) * 100)),
      currentBalanceKobo: BigInt(Math.round(Number(holding.currentBalance || 0) * 100)),
      accruedInterestKobo: BigInt(Math.round(Number(holding.accruedInterest || 0) * 100)),
    }
  }
}
