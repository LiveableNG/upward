import {
  Controller,
  Post,
  Body,
  Param,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common'
import { SqliteService } from './sqlite.service'
import * as crypto from 'crypto'

interface PaymentRequestRow {
  id: number
  uuid: string
  company_id: number
  tenant_id: number
  total_amount: number
  currency: string
  status: string
  payment_link_token: string
  invoice_number: string
}

@Controller('pay')
export class PaymentController {
  constructor(private readonly sqlite: SqliteService) {}

  /**
   * POST /pay/initialize
   * Mock Paystack payment initialization
   */
  @Post('initialize')
  @HttpCode(HttpStatus.OK)
  initializePayment(@Body() body: { paymentToken: string; email: string; amount?: number }) {
    const db = this.sqlite.getDb()

    const request = db
      .prepare('SELECT * FROM payment_requests WHERE payment_link_token = ?')
      .get(body.paymentToken) as PaymentRequestRow | undefined

    if (!request) {
      throw new NotFoundException('Payment request not found')
    }

    if (request.status === 'paid') {
      throw new BadRequestException('This payment has already been completed')
    }

    const reference = `MOCK_PSK_${crypto.randomBytes(8).toString('hex').toUpperCase()}`
    const amount = body.amount || request.total_amount

    // Create a pending transaction
    const txUuid = crypto.randomUUID()
    db.prepare(
      `INSERT INTO payment_transactions (uuid, payment_request_id, tenant_id, company_id, amount, currency, paystack_reference, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    ).run(
      txUuid,
      request.id,
      request.tenant_id,
      request.company_id,
      amount,
      request.currency,
      reference,
    )

    return {
      status: true,
      message: 'Payment initialized',
      data: {
        reference,
        amount,
        currency: request.currency,
        // In real Paystack this would be an authorization_url
        // For mock, frontend will simulate the Paystack popup
        authorization_url: `https://checkout.paystack.com/mock/${reference}`,
        access_code: `MOCK_AC_${reference}`,
      },
    }
  }

  /**
   * POST /pay/verify/:reference
   * Mock Paystack payment verification — always succeeds
   */
  @Post('verify/:reference')
  @HttpCode(HttpStatus.OK)
  verifyPayment(@Param('reference') reference: string) {
    const db = this.sqlite.getDb()

    const tx = db
      .prepare('SELECT * FROM payment_transactions WHERE paystack_reference = ?')
      .get(reference) as
      | {
          id: number
          uuid: string
          payment_request_id: number
          tenant_id: number
          company_id: number
          amount: number
          status: string
        }
      | undefined

    if (!tx) {
      throw new NotFoundException('Transaction not found')
    }

    if (tx.status === 'success') {
      return {
        status: true,
        message: 'Payment already verified',
        data: { reference, transactionUuid: tx.uuid, status: 'success' },
      }
    }

    // Mark transaction as successful
    db.prepare(
      `UPDATE payment_transactions SET status = 'success', channel = 'card', paid_at = datetime('now') WHERE id = ?`,
    ).run(tx.id)

    // Update payment request status
    const totalPaid = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as total FROM payment_transactions WHERE payment_request_id = ? AND status = 'success'`,
      )
      .get(tx.payment_request_id) as { total: number }

    const request = db
      .prepare('SELECT total_amount FROM payment_requests WHERE id = ?')
      .get(tx.payment_request_id) as { total_amount: number }

    const newStatus = totalPaid.total >= request.total_amount ? 'paid' : 'partially_paid'

    db.prepare(
      `UPDATE payment_requests SET status = ?, updated_at = datetime('now') WHERE id = ?`,
    ).run(newStatus, tx.payment_request_id)

    return {
      status: true,
      message: 'Payment verified successfully',
      data: {
        reference,
        transactionUuid: tx.uuid,
        status: 'success',
        amount: tx.amount,
        paidAt: new Date().toISOString(),
        receipt: {
          invoiceNumber: `RCP-${Date.now()}`,
          message: 'Receipt generated',
        },
      },
    }
  }

  /**
   * GET /pay/transactions/:tenantUuid
   * Get payment history for a tenant
   */
  @Get('transactions/:tenantUuid')
  getTransactions(@Param('tenantUuid') tenantUuid: string) {
    const db = this.sqlite.getDb()

    const tenant = db.prepare('SELECT id FROM tenants WHERE uuid = ?').get(tenantUuid) as
      | { id: number }
      | undefined

    if (!tenant) {
      throw new NotFoundException('Tenant not found')
    }

    const transactions = db
      .prepare(
        `SELECT pt.uuid, pt.amount, pt.currency, pt.status, pt.channel, pt.paid_at, pt.paystack_reference,
              pr.invoice_number, pr.notes as description,
              c.name as company_name, c.logo_url as company_logo,
              p.name as property_name
       FROM payment_transactions pt
       JOIN payment_requests pr ON pr.id = pt.payment_request_id
       JOIN companies c ON c.id = pt.company_id
       LEFT JOIN properties p ON p.id = pr.property_id
       WHERE pt.tenant_id = ?
       ORDER BY pt.created_at DESC`,
      )
      .all(tenant.id)

    return { transactions }
  }
}
