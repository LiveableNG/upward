import { Injectable, Logger, Inject } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import {
  IPaymentGateway,
  Bank,
  AccountVerification,
  TransactionVerification,
  SUBACCOUNT_REPOSITORY,
  ISubaccountRepository,
  PaystackSubaccount,
} from '../../../domains/payments/payment.repository'
import { isProductionRuntime } from '../../utils/runtime-env'

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

  private sanitizeEmail(email?: string | null): string {
    if (!email || typeof email !== 'string' || email.includes(':')) {
      return 'tenant@upward.ng'
    }
    const trimmed = email.trim().toLowerCase()
    // Fix common domain/TLD typos that Paystack's strict IANA validator rejects
    const normalized = trimmed.replace(/\.(cpem|cem|c0m|con|comm|cm)$/i, '.com')
    const validEmailRegex = /^[^\s@]+@[^\s@]+\.[a-z]{2,10}$/i
    if (!validEmailRegex.test(normalized)) {
      return 'tenant@upward.ng'
    }
    return normalized
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
      const res = await fetch(
        `${this.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
        {
          method: 'GET',
          headers: this.headers,
        },
      )

      const data = await res.json()

      if (!res.ok || !data.status) {
        const errorMsg = data.message || 'Could not resolve account'

        const isNonProdTest = !isProductionRuntime(this.secretKey) && this.secretKey.startsWith('sk_test_')

        // Handle Paystack test mode limit gracefully in non-production
        if (isNonProdTest && errorMsg.includes('Test mode daily limit')) {
          this.logger.warn(
            `Paystack test limit reached. Using mock resolution for ${accountNumber}`,
          )
          return {
            accountNumber,
            accountName: 'RONALD EKOM (VERIFIED)',
            bankCode,
          }
        }

        // In non-production, if Paystack test sandbox cannot resolve fake NUBAN, provide mock verification
        if (
          isNonProdTest &&
          (errorMsg.includes('Could not resolve') || errorMsg.includes('Test mode'))
        ) {
          this.logger.warn(`Non-production mock resolution fallback for ${accountNumber}`)
          return {
            accountNumber,
            accountName: 'RONALD EKOM (VERIFIED)',
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
      if (
        !isProductionRuntime(this.secretKey) &&
        this.secretKey.startsWith('sk_test_') &&
        error?.message?.includes('Test mode daily limit')
      ) {
        return {
          accountNumber,
          accountName: 'RONALD EKOM (VERIFIED)',
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
      const res = await fetch(
        `${this.baseUrl}/transaction/verify/${encodeURIComponent(reference)}`,
        {
          method: 'GET',
          headers: this.headers,
        },
      )

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
      const txData = data.data
      const isSuccess = Boolean(data.status && txData && txData.status === 'success')

      if (isSuccess) {
        const rawAmountKobo = BigInt(Math.round(Number(txData.amount || 0)))
        let parsedMetadata: Record<string, unknown> | undefined
        if (typeof txData.metadata === 'string' && txData.metadata.trim()) {
          try {
            parsedMetadata = JSON.parse(txData.metadata)
          } catch {
            parsedMetadata = undefined
          }
        } else if (txData.metadata && typeof txData.metadata === 'object') {
          parsedMetadata = txData.metadata as Record<string, unknown>
        }

        const receiverAccountNumber =
          txData.authorization?.receiver_bank_account_number ||
          txData.dedicated_account?.account_number ||
          (typeof parsedMetadata?.receiver_account_number === 'string'
            ? parsedMetadata.receiver_account_number
            : undefined)

        this.logger.log(
          `Transaction ${reference} verified successfully. Amount: ${txData.amount}`,
        )
        return {
          status: true,
          amount: Number(rawAmountKobo) / 100,
          amountKobo: rawAmountKobo,
          currency: txData.currency,
          fees: typeof txData.fees === 'number' ? txData.fees / 100 : undefined,
          channel: txData.channel || undefined,
          reference: txData.reference || reference,
          gatewayStatus: txData.status,
          customerCode: txData.customer?.customer_code || undefined,
          customerEmail: txData.customer?.email || undefined,
          receiverAccountNumber: receiverAccountNumber ? String(receiverAccountNumber) : undefined,
          metadata: parsedMetadata,
          paidAt: txData.paid_at || undefined,
        }
      } else {
        this.logger.warn(
          `Transaction ${reference} verification returned non-success status: ${txData?.status}`,
        )
        return { status: false, gatewayStatus: txData?.status }
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
      const safeEmail = this.sanitizeEmail(data.email)
      const sendInit = (emailToUse: string, extraMeta?: Record<string, unknown>) =>
        fetch(`${this.baseUrl}/transaction/initialize`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            email: emailToUse,
            amount: Math.round(data.amount * 100), // convert to kobo
            reference: data.reference,
            metadata: extraMeta ? { ...(data.metadata || {}), ...extraMeta } : data.metadata,
            subaccount: data.subaccount,
            channels: data.channels,
          }),
        })

      this.logger.log(`Initializing transaction ${data.reference} for ${safeEmail}`)
      let res = await sendInit(safeEmail)

      if (!res.ok) {
        const errorText = await res.text()
        const isInvalidEmailError =
          res.status === 400 &&
          safeEmail !== 'tenant@upward.ng' &&
          errorText.toLowerCase().includes('email')

        if (isInvalidEmailError) {
          this.logger.warn(
            `Paystack rejected email "${safeEmail}" for ${data.reference}; retrying with fallback tenant@upward.ng`,
          )
          res = await sendInit('tenant@upward.ng', { originalEmail: data.email })
          if (!res.ok) {
            const retryErr = await res.text()
            this.logger.error(`Paystack initialize retry error: ${res.status} - ${retryErr}`)
            throw new Error(`Gateway initialization failed: ${res.status}`)
          }
        } else {
          this.logger.error(`Paystack initialize error: ${res.status} - ${errorText}`)
          throw new Error(`Gateway initialization failed: ${res.status}`)
        }
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
      const existing = await this.subaccountRepository.findByAccountInfo(
        data.accountNumber,
        data.bankCode,
      )
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
        this.logger.error(
          `Subaccount creation failed: ${res.status} - ${JSON.stringify(responseData)}`,
        )

        if (responseData.message?.toLowerCase().includes('already exists')) {
          this.logger.log(`Subaccount likely exists on Paystack. Attempting to fetch...`)
          const listRes = await fetch(`${this.baseUrl}/subaccount?perPage=100`, {
            method: 'GET',
            headers: this.headers,
          })
          const listData = await listRes.json()
          if (listRes.ok && listData.status && Array.isArray(listData.data)) {
            const found = listData.data.find(
              (s: any) =>
                s.settlement_bank === data.bankCode && s.account_number === data.accountNumber,
            )
            if (found) {
              this.logger.log(
                `Successfully recovered subaccount from Paystack: ${found.subaccount_code}`,
              )
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
      let safeEmail = this.sanitizeEmail(data.email)
      this.logger.log(`Creating Paystack customer: ${safeEmail}`)
      let res = await fetch(`${this.baseUrl}/customer`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          email: safeEmail,
          first_name: data.firstName,
          last_name: data.lastName,
          phone: data.phone,
          metadata: {
            source_app: 'upward',
          },
        }),
      })

      let responseData = await res.json()
      if (
        !res.ok &&
        res.status === 400 &&
        safeEmail !== 'tenant@upward.ng' &&
        String(responseData?.message || '').toLowerCase().includes('email')
      ) {
        this.logger.warn(
          `Paystack rejected customer email "${safeEmail}"; retrying with fallback tenant@upward.ng`,
        )
        safeEmail = 'tenant@upward.ng'
        res = await fetch(`${this.baseUrl}/customer`, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            email: safeEmail,
            first_name: data.firstName,
            last_name: data.lastName,
            phone: data.phone,
            metadata: {
              source_app: 'upward',
              originalEmail: data.email,
            },
          }),
        })
        responseData = await res.json()
      }
      let customerCode = ''
      if (res.ok) {
        customerCode = responseData.data.customer_code
      } else if (
        responseData.message?.toLowerCase().includes('already exists') ||
        responseData.data?.customer_code
      ) {
        customerCode = responseData.data?.customer_code || ''
      }

      if (!customerCode) {
        this.logger.warn(
          `Failed to resolve customer code directly. Searching customer by email: ${safeEmail}`,
        )
        const listRes = await fetch(
          `${this.baseUrl}/customer?email=${encodeURIComponent(safeEmail)}`,
          {
            method: 'GET',
            headers: this.headers,
          },
        )
        const listData = await listRes.json()
        if (
          listRes.ok &&
          listData.status &&
          Array.isArray(listData.data) &&
          listData.data.length > 0
        ) {
          customerCode = listData.data[0].customer_code
        }
      }

      if (!customerCode) {
        this.logger.error(
          `Paystack customer creation failed: ${res.status} - ${JSON.stringify(responseData)}`,
        )
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
          this.logger.warn(
            `Failed to update Paystack customer phone: ${updateRes.status} - ${JSON.stringify(updateData)}`,
          )
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
    preferredBank?: string
    disableFallback?: boolean
  }): Promise<any> {
    const isTest = !isProductionRuntime(this.secretKey) && this.secretKey.startsWith('sk_test_')
    const primaryBank = isTest ? 'test-bank' : data.preferredBank || 'titan-paystack'
    const fallbackBank =
      isTest || data.disableFallback
        ? null
        : primaryBank === 'titan-paystack'
          ? 'wema-bank'
          : 'titan-paystack'

    const attemptCreation = async (bank: string): Promise<any> => {
      this.logger.log(
        `Attempting Paystack DVA creation for customer ${data.customerCode} with preferred bank: ${bank}`,
      )
      const res = await fetch(`${this.baseUrl}/dedicated_account`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          customer: data.customerCode,
          preferred_bank: bank,
        }),
      })

      const responseData = await res.json()
      if (!res.ok || !responseData.status) {
        throw new Error(responseData.message || `DVA creation failed with HTTP ${res.status}`)
      }
      return responseData
    }

    try {
      return await attemptCreation(primaryBank)
    } catch (primaryError: any) {
      this.logger.warn(
        `Primary Paystack DVA creation failed with bank ${primaryBank}: ${primaryError?.message}`,
      )

      if (fallbackBank) {
        try {
          this.logger.log(
            `Attempting fallback Paystack DVA creation with bank ${fallbackBank} for customer ${data.customerCode}...`,
          )
          return await attemptCreation(fallbackBank)
        } catch (fallbackError: any) {
          this.logger.error(
            `Fallback Paystack DVA creation also failed with bank ${fallbackBank}: ${fallbackError?.message}`,
          )
          throw fallbackError
        }
      }

      throw primaryError
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
          type: 'nuban',
          name: 'Landlord Settlement',
          account_number: data.accountNumber,
          bank_code: data.bankCode,
          currency: 'NGN',
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
          source: 'balance',
          amount: Math.round(data.amount * 100), // ensure integer in kobo
          reference: data.reference,
          recipient: recipientCode,
          reason: data.narration || 'Rent Settlement',
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

  async validateCustomerIdentification(data: {
    customerCode: string
    country?: string
    type: 'bvn' | 'bank_account'
    value: string
    firstName: string
    lastName: string
  }): Promise<{ status: boolean; message: string }> {
    try {
      this.logger.log(`Validating customer ${data.customerCode} identification via Paystack`)
      const res = await fetch(`${this.baseUrl}/customer/${data.customerCode}/identification`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          country: data.country || 'NG',
          type: data.type,
          value: data.value,
          first_name: data.firstName,
          last_name: data.lastName,
        }),
      })
      const responseData = await res.json()
      return {
        status: res.ok && !!responseData.status,
        message:
          responseData.message ||
          (res.ok ? 'Customer identification submitted' : 'Failed to submit identification'),
      }
    } catch (err: any) {
      this.logger.warn(
        `Failed to submit identification to Paystack for customer ${data.customerCode}: ${err.message}`,
      )
      return { status: false, message: err.message }
    }
  }
}
