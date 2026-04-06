import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { IPaymentGateway, Bank, AccountVerification } from '@domains/payments/payment.repository'

@Injectable()
export class PaystackGateway implements IPaymentGateway {
  private readonly logger = new Logger(PaystackGateway.name)
  private readonly secretKey: string
  private readonly baseUrl = 'https://api.paystack.co'

  constructor(private configService: ConfigService) {
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

  async createVirtualAccount(tenant: {
    email: string
    fullName: string
    phone?: string
  }): Promise<{
    bankName: string
    accountNumber: string
    bankCode?: string
    accountName?: string
  }> {
    try {
      this.logger.log(`Creating virtual account for ${tenant.email}`)

      // Step 1: Create/Update Customer
      const customerRes = await fetch(`${this.baseUrl}/customer`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          email: tenant.email,
          first_name: tenant.fullName.split(' ')[0],
          last_name: tenant.fullName.split(' ').slice(1).join(' '),
          phone: tenant.phone,
        }),
      })

      if (!customerRes.ok) {
        const errorText = await customerRes.text()
        this.logger.error(`Paystack customer creation error: ${customerRes.status} - ${errorText}`)
        // If customer exists, we might need to fetch them, but usually Paystack returns 200/201
      }

      const customerData = await customerRes.json()

      const isTestMode = this.secretKey.startsWith('sk_test_')
      const preferredBank = isTestMode
        ? 'test-bank'
        : this.configService.get<string>('PAYSTACK_PREFERRED_BANK') || 'wema-bank'

      const dvaRes = await fetch(`${this.baseUrl}/dedicated_account`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          customer: customerData.data?.customer_code || customerData.data?.id,
          preferred_bank: preferredBank,
        }),
      })

      if (!dvaRes.ok) {
        const errorText = await dvaRes.text()
        this.logger.error(`Paystack DVA creation error: ${dvaRes.status} - ${errorText}`)
        throw new Error(`Could not create virtual account: ${dvaRes.status}`)
      }

      const dvaData = await dvaRes.json()

      return {
        bankName: dvaData.data.bank.name,
        accountNumber: dvaData.data.account_number,
        bankCode: dvaData.data.bank.slug,
        accountName: dvaData.data.account_name,
      }
    } catch (error) {
      this.logger.error('Paystack createVirtualAccount error:', error)
      throw error
    }
  }
}
