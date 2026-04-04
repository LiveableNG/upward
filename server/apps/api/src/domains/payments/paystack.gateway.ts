import { Injectable } from '@nestjs/common'
import { IPaymentGateway, Bank, AccountVerification } from '@domains/payments/payment.repository'

@Injectable()
export class PaystackGateway implements IPaymentGateway {
  private readonly secretKey = process.env['PAYSTACK_SECRET_KEY']
  private readonly baseUrl = 'https://api.paystack.co'

  private get headers() {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    }
  }

  async getBanks(): Promise<Bank[]> {
    try {
      const res = await fetch(`${this.baseUrl}/bank?country=nigeria`, {
        method: 'GET',
        headers: this.headers,
      })

      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`)
      }

      const data = await res.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return data.data.map((b: any) => ({
        code: b.code,
        name: b.name,
      }))
    } catch (error) {
      console.error('Paystack getBanks error:', error)
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
        throw new Error(`HTTP error ${res.status}`)
      }

      const data = await res.json()

      return {
        accountNumber: data.data.account_number,
        accountName: data.data.account_name,
        bankCode,
      }
    } catch (error) {
      console.error('Paystack verifyAccount error:', error)
      throw new Error('Invalid account details provided')
    }
  }

  async verifyTransaction(reference: string): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/transaction/verify/${reference}`, {
        method: 'GET',
        headers: this.headers,
      })

      if (!res.ok) {
        return false
      }

      const data = await res.json()

      return data.data.status === 'success'
    } catch (error) {
      console.error('Paystack verifyTransaction error:', error)
      return false
    }
  }
}
