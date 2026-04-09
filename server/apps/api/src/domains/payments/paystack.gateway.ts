import { Injectable, Logger, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { 
  IPaymentGateway, 
  Bank, 
  AccountVerification,
  SUBACCOUNT_REPOSITORY,
  ISubaccountRepository,
  PaystackSubaccount
} from '../../domains/payments/payment.repository'

@Injectable()
export class PaystackGateway implements IPaymentGateway {
  private readonly logger = new Logger(PaystackGateway.name)
  private readonly secretKey: string
  private readonly baseUrl = 'https://api.paystack.co'

  constructor(
    private configService: ConfigService,
    @Inject(SUBACCOUNT_REPOSITORY) private readonly subaccountRepository: ISubaccountRepository,
  ) {
    this.secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY') || ''
    if (!this.secretKey) {
      this.logger.warn('PAYSTACK_SECRET_KEY is not defined in environment variables')
    }
  }

  private get headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    }
  }

  async getBanks(): Promise<Bank[]> {
    try {
      this.logger.log('Fetching banks from Paystack...')
      const res = await fetch(`${this.baseUrl}/bank?country=nigeria`, {
        method: 'GET',
        headers: this.headers,
      })

      if (!res.ok) {
        const errorText = await res.text()
        this.logger.error(`Paystack API error: ${res.status} - ${errorText}`)
        throw new Error(`HTTP error ${res.status}`)
      }

      const data = await res.json()
      if (!data.status || !data.data) {
        this.logger.error('Unexpected response format from Paystack')
        return []
      }

      this.logger.log(`Successfully fetched ${data.data.length} banks`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.data.map((b: any) => ({
        code: b.code,
        name: b.name,
      }))
    } catch (error) {
      this.logger.error('Paystack getBanks error:', error)
      throw new Error('Could not fetch banks from gateway')
    }
  }

  async verifyAccountNumber(accountNumber: string, bankCode: string): Promise<AccountVerification> {
    try {
      const url = new URL(`${this.baseUrl}/bank/resolve`)
      url.searchParams.append('account_number', accountNumber)
      url.searchParams.append('bank_code', bankCode)

      const res = await fetch(url.toString(), {
        method: 'GET',
        headers: this.headers,
      })

      if (!res.ok) {
        if (res.status === 429) {
          throw new Error('Verification rate limit exceeded. Please wait a few seconds.')
        }
        if (res.status === 404 || res.status === 400) {
          throw new Error(
            'Account number could not be resolved. Please check the bank and account number.',
          )
        }
        throw new Error(`HTTP error ${res.status}`)
      }

      const data = await res.json()

      if (!data.status || !data.data) {
        throw new Error(data.message || 'Could not verify account')
      }

      return {
        accountNumber: data.data.account_number,
        accountName: data.data.account_name,
        bankCode,
      }
    } catch (error) {
      this.logger.error('Paystack verifyAccount error:', error)
      throw error // Re-throw the specific error
    }
  }

  async verifyTransaction(reference: string): Promise<boolean> {
    try {
      this.logger.log(`Verifying transaction: ${reference}`)
      const res = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: this.headers,
      })

      if (!res.ok) {
        const errorBody = await res.text().catch(() => 'No body')
        this.logger.warn(
          `Transaction verification failed for ${reference}: ${res.status} - ${errorBody}`,
        )
        return false
      }

      const data = await res.json()
      const isSuccess = data.status && data.data && data.data.status === 'success'

      if (isSuccess) {
        this.logger.log(`Transaction ${reference} verified successfully`)
      } else {
        this.logger.warn(
          `Transaction ${reference} verification returned non-success status: ${data.data?.status}`,
        )
      }

      return !!isSuccess
    } catch (error) {
      this.logger.error(`Error verifying transaction ${reference}:`, error)
      return false
    }
  }

  async initializeTransaction(data: {
    email: string
    amount: number
    reference: string
    subaccount?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any
  }): Promise<{ authorizationUrl: string }> {
    try {
      this.logger.log(`Initializing transaction ${data.reference} for ${data.email}`)
      const res = await fetch(`${this.baseUrl}/transaction/initialize`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          email: data.email,
          amount: Math.round(data.amount * 100), // convert to kobo
          reference: data.reference,
          metadata: data.metadata,
          subaccount: data.subaccount,
        }),
      })

      if (!res.ok) {
        const errorText = await res.text()
        this.logger.error(`Paystack initialize error: ${res.status} - ${errorText}`)
        throw new Error(`Gateway initialization failed: ${res.status}`)
      }

      const responseData = await res.json()
      if (!responseData.status || !responseData.data) {
        throw new Error(responseData.message || 'Initialization failed')
      }

      return {
        authorizationUrl: responseData.data.authorization_url,
      }
    } catch (error) {
      this.logger.error('Paystack initializeTransaction error:', error)
      throw error
    }
  }

  async findOrCreateSubaccount(data: {
    businessName: string
    bankCode: string
    accountNumber: string
  }): Promise<PaystackSubaccount | null> {
    try {
      this.logger.log(`Resolving subaccount for ${data.accountNumber} at ${data.bankCode}`)
      
      // 1. Check database first
      const existing = await this.subaccountRepository.findByAccountInfo(data.accountNumber, data.bankCode)
      if (existing) {
        this.logger.log(`Found existing subaccount in DB: ${existing.subaccountCode}`)
        return existing
      }

      // 2. Create on Paystack if not in DB
      const res = await fetch(`${this.baseUrl}/subaccount`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          business_name: data.businessName,
          settlement_bank: data.bankCode,
          account_number: data.accountNumber,
          percentage_charge: 0,
        }),
      })

      const responseData = await res.json()
      
      if (!res.ok) {
        this.logger.error(`Subaccount creation failed: ${res.status} - ${JSON.stringify(responseData)}`)
        return null
      }

      const subaccountCode = responseData.data?.subaccount_code || ''
      
      if (subaccountCode) {
        // 3. Save to DB for next time
        return await this.subaccountRepository.create({
          accountNumber: data.accountNumber,
          bankCode: data.bankCode,
          subaccountCode: subaccountCode,
          businessName: data.businessName,
        })
      }

      return null
    } catch (error) {
      this.logger.error('Paystack findOrCreateSubaccount error:', error)
      return null
    }
  }
}
