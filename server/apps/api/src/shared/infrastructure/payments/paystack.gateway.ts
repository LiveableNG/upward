import { Injectable, Logger, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { 
  IPaymentGateway, 
  Bank, 
  AccountVerification,
  TransactionVerification,
  SUBACCOUNT_REPOSITORY,
  ISubaccountRepository,
  PaystackSubaccount
} from '../../../domains/payments/payment.repository'

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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const banks: Bank[] = data.data.map((b: any) => ({
        code: b.code,
        name: b.name,
      }))
      const uniqueBanks = Array.from(new Map(banks.map((b) => [b.code, b])).values())
      this.logger.log(`Successfully fetched ${uniqueBanks.length} banks`)
      return uniqueBanks
    } catch (error) {
      this.logger.error('Paystack getBanks error:', error)
      throw new Error('Could not fetch banks from gateway')
    }
  }

  async verifyAccountNumber(accountNumber: string, bankCode: string): Promise<AccountVerification> {
    try {
      this.logger.log(`Resolving account: ${accountNumber} with bank: ${bankCode}`)
      const res = await fetch(`${this.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`, {
        method: 'GET',
        headers: this.headers,
      })

      const data = await res.json()
      
      if (!res.ok || !data.status) {
        const errorMsg = data.message || 'Could not resolve account'
        
        // Handle Paystack test mode limit gracefully
        if (errorMsg.includes('Test mode daily limit')) {
          this.logger.warn(`Paystack test limit reached. Using mock resolution for ${accountNumber}`)
          return {
            accountNumber,
            accountName: 'TEST ACCOUNT (LIMIT REACHED)',
            bankCode,
          }
        }

        this.logger.warn(`Account resolution failed: ${errorMsg}`)
        throw new Error(errorMsg)
      }

      return {
        accountNumber: data.data.account_number,
        accountName: data.data.account_name,
        bankCode,
      }
    } catch (error: any) {
      if (error?.message?.includes('Test mode daily limit')) {
        return {
          accountNumber,
          accountName: 'TEST ACCOUNT (LIMIT REACHED)',
          bankCode,
        }
      }
      this.logger.error('Paystack verifyAccount error:', error)
      throw error 
    }
  }

  async verifyTransaction(reference: string): Promise<TransactionVerification> {
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
        if (res.status >= 400 && res.status < 500 && res.status !== 429) {
          return { status: false }
        }
        // For 5xx or 429 or other network issues, we should throw to trigger atomicity protection
        throw new Error(`Paystack Gateway verification error: ${res.status}`)
      }

      const data = await res.json()
      const isSuccess = data.status && data.data && data.data.status === 'success'

      if (isSuccess) {
        this.logger.log(`Transaction ${reference} verified successfully. Amount: ${data.data.amount}`)
        return {
          status: true,
          amount: data.data.amount / 100, 
          currency: data.data.currency,
          fees: data.data.fees / 100, // Paystack returns kobo
        }
      } else {
        this.logger.warn(
          `Transaction ${reference} verification returned non-success status: ${data.data?.status}`,
        )
        return { status: false }
      }
    } catch (error) {
      this.logger.error(`Error verifying transaction ${reference}:`, error)
      throw error
    }
  }

  async initializeTransaction(data: {
    email: string
    amount: number
    reference: string
    subaccount?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any
    channels?: string[]
  }): Promise<{ authorizationUrl: string; accessCode?: string; reference: string }> {
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
          channels: data.channels,
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
        accessCode: responseData.data.access_code,
        reference: data.reference,
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
        
        if (responseData.message?.toLowerCase().includes('already exists')) {
          this.logger.log(`Subaccount likely exists on Paystack. Attempting to fetch...`)
          const listRes = await fetch(`${this.baseUrl}/subaccount?perPage=100`, {
            method: 'GET',
            headers: this.headers,
          })
          const listData = await listRes.json()
          if (listRes.ok && listData.status && Array.isArray(listData.data)) {
            const found = listData.data.find((s: any) => 
              s.settlement_bank === data.bankCode && s.account_number === data.accountNumber
            )
            if (found) {
              this.logger.log(`Successfully recovered subaccount from Paystack: ${found.subaccount_code}`)
              return await this.subaccountRepository.create({
                accountNumber: data.accountNumber,
                bankCode: data.bankCode,
                subaccountCode: found.subaccount_code,
                businessName: data.businessName,
              })
            }
          }
        }
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

  async createCustomer(data: {
    email: string
    firstName: string
    lastName: string
    phone?: string
  }): Promise<string> {
    try {
      this.logger.log(`Creating Paystack customer: ${data.email}`)
      const res = await fetch(`${this.baseUrl}/customer`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          email: data.email,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          metadata: {
            source_app: 'upward',
          },
        }),
      })

      const responseData = await res.json()
      let customerCode = ''
      if (res.ok) {
        customerCode = responseData.data.customer_code
      } else if (responseData.message?.toLowerCase().includes('already exists') || responseData.data?.customer_code) {
        customerCode = responseData.data?.customer_code || ''
      }

      if (!customerCode) {
        this.logger.warn(`Failed to resolve customer code directly. Searching customer by email: ${data.email}`)
        const listRes = await fetch(`${this.baseUrl}/customer?email=${encodeURIComponent(data.email)}`, {
          method: 'GET',
          headers: this.headers,
        })
        const listData = await listRes.json()
        if (listRes.ok && listData.status && Array.isArray(listData.data) && listData.data.length > 0) {
          customerCode = listData.data[0].customer_code
        }
      }

      if (!customerCode) {
        this.logger.error(`Paystack customer creation failed: ${res.status} - ${JSON.stringify(responseData)}`)
        throw new Error(responseData.message || 'Customer creation failed')
      }

      // If we have a phone number, update the customer record on Paystack to ensure the phone number is active
      if (data.phone) {
        this.logger.log(`Updating customer ${customerCode} with phone number ${data.phone}`)
        const updateRes = await fetch(`${this.baseUrl}/customer/${customerCode}`, {
          method: 'PUT',
          headers: this.headers,
          body: JSON.stringify({
            phone: data.phone,
            first_name: data.firstName,
            last_name: data.lastName,
            metadata: {
              source_app: 'upward',
            },
          }),
        })
        if (!updateRes.ok) {
          const updateData = await updateRes.json().catch(() => ({}))
          this.logger.warn(`Failed to update Paystack customer phone: ${updateRes.status} - ${JSON.stringify(updateData)}`)
        } else {
          this.logger.log(`Successfully updated customer ${customerCode} with phone number`)
        }
      }

      return customerCode
    } catch (error) {
      this.logger.error('Paystack createCustomer error:', error)
      throw error
    }
  }

  async createDedicatedAccount(data: {
    customerCode: string
    subaccountCode?: string
  }): Promise<any> {
    try {
      const isTest = this.secretKey.startsWith('sk_test_')
      const preferredBank = isTest ? 'test-bank' : 'wema-bank'
      this.logger.log(`Creating Paystack DVA for customer ${data.customerCode} with preferred bank: ${preferredBank}`)
      const res = await fetch(`${this.baseUrl}/dedicated_account`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          customer: data.customerCode,
          subaccount: data.subaccountCode,
          preferred_bank: preferredBank,
        }),
      })

      const responseData = await res.json()
      if (!res.ok) {
        this.logger.error(`Paystack DVA creation failed: ${res.status} - ${JSON.stringify(responseData)}`)
        throw new Error(responseData.message || 'DVA creation failed')
      }

      return responseData
    } catch (error) {
      this.logger.error('Paystack createDedicatedAccount error:', error)
      throw error
    }
  }

  async initiateTransfer(data: {
    amount: number
    accountNumber: string
    bankCode: string
    reference: string
    narration?: string
  }): Promise<any> {
    try {
      this.logger.log(`Initiating transfer of ${data.amount} to ${data.accountNumber}`)

      // 1. Create Transfer Recipient
      const recipientRes = await fetch(`${this.baseUrl}/transferrecipient`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          type: "nuban",
          name: "Landlord Settlement",
          account_number: data.accountNumber,
          bank_code: data.bankCode,
          currency: "NGN"
        }),
      })
      const recipientData = await recipientRes.json()
      if (!recipientRes.ok || !recipientData.status) {
        throw new Error(recipientData.message || 'Failed to create transfer recipient')
      }

      const recipientCode = recipientData.data.recipient_code

      // 2. Initiate Transfer
      const transferRes = await fetch(`${this.baseUrl}/transfer`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          source: "balance",
          amount: data.amount * 100, // to kobo
          reference: data.reference,
          recipient: recipientCode,
          reason: data.narration || "Rent Settlement"
        }),
      })
      const transferData = await transferRes.json()
      if (!transferRes.ok || !transferData.status) {
        throw new Error(transferData.message || 'Transfer initiation failed')
      }

      return transferData
    } catch (error) {
      this.logger.error('Paystack initiateTransfer error:', error)
      throw error
    }
  }
}
