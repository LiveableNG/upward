import { Controller, Get, Param, NotFoundException, UseGuards, Req } from '@nestjs/common'
import { SqliteService } from './sqlite.service'
import { TenantJwtGuard } from './tenant-auth.controller'

interface DocumentRow {
  uuid: string
  type: string
  title: string
  file_name: string
  receipt_number: string
  amount: number
  currency: string
  line_items: string
  tenant_name: string
  company_name: string
  company_logo: string
  property_name: string
  property_address: string
  paid_at: string
  channel: string
  paystack_reference: string
  lease_start: string
  lease_end: string
  contract_type: string
  generated_at: string
  created_at: string
}

@Controller('documents')
export class DocumentsController {
  constructor(private readonly sqlite: SqliteService) {}

  /**
   * GET /documents/mine
   * Get all documents (receipts + contracts) for the authenticated tenant
   */
  @Get('mine')
  @UseGuards(TenantJwtGuard)
  getMyDocuments(@Req() req: { tenantPayload: { sub: number } }) {
    const db = this.sqlite.getDb()
    const tenantId = req.tenantPayload.sub

    const docs = db
      .prepare(`SELECT * FROM documents WHERE tenant_id = ? ORDER BY created_at DESC`)
      .all(tenantId) as DocumentRow[]

    const receipts = docs
      .filter((d) => d.type === 'receipt')
      .map((d) => ({
        uuid: d.uuid,
        title: d.title,
        receiptNumber: d.receipt_number,
        amount: d.amount,
        currency: d.currency,
        lineItems: JSON.parse(d.line_items || '[]'),
        tenantName: d.tenant_name,
        companyName: d.company_name,
        companyLogo: d.company_logo,
        propertyName: d.property_name,
        propertyAddress: d.property_address,
        paidAt: d.paid_at,
        channel: d.channel,
        paystackReference: d.paystack_reference,
        generatedAt: d.generated_at,
      }))

    const contracts = docs
      .filter((d) => d.type === 'contract')
      .map((d) => ({
        uuid: d.uuid,
        title: d.title,
        fileName: d.file_name,
        companyName: d.company_name,
        companyLogo: d.company_logo,
        propertyName: d.property_name,
        propertyAddress: d.property_address,
        leaseStart: d.lease_start,
        leaseEnd: d.lease_end,
        contractType: d.contract_type,
        createdAt: d.created_at,
      }))

    // Rent credit score — calculated from payment history
    const paymentCount = db
      .prepare(
        `SELECT COUNT(*) as c FROM payment_transactions WHERE tenant_id = ? AND status = 'success'`,
      )
      .get(tenantId) as { c: number }

    const totalPaid = db
      .prepare(
        `SELECT COALESCE(SUM(amount), 0) as total FROM payment_transactions WHERE tenant_id = ? AND status = 'success'`,
      )
      .get(tenantId) as { total: number }

    const firstPayment = db
      .prepare(
        `SELECT MIN(paid_at) as first FROM payment_transactions WHERE tenant_id = ? AND status = 'success'`,
      )
      .get(tenantId) as { first: string | null }

    // Simple credit score: base 300 + 50 per on-time payment, max 850
    const baseScore = 300
    const score = Math.min(850, baseScore + paymentCount.c * 120)
    const monthsTracked = firstPayment.first
      ? Math.max(
          1,
          Math.floor(
            (Date.now() - new Date(firstPayment.first).getTime()) / (30 * 24 * 60 * 60 * 1000),
          ),
        )
      : 0

    return {
      receipts,
      contracts,
      rentCredit: {
        score,
        maxScore: 850,
        grade:
          score >= 750 ? 'Excellent' : score >= 600 ? 'Good' : score >= 450 ? 'Fair' : 'Building',
        totalPayments: paymentCount.c,
        totalAmountPaid: totalPaid.total,
        monthsTracked,
        onTimeRate: 100, // mock: all payments on time
        streak: paymentCount.c, // consecutive on-time payments
      },
    }
  }

  /**
   * GET /documents/receipt/:uuid
   * Get a single receipt by UUID (for PDF rendering)
   */
  @Get('receipt/:uuid')
  @UseGuards(TenantJwtGuard)
  getReceipt(@Param('uuid') uuid: string, @Req() req: { tenantPayload: { sub: number } }) {
    const db = this.sqlite.getDb()

    const doc = db
      .prepare(`SELECT * FROM documents WHERE uuid = ? AND tenant_id = ? AND type = 'receipt'`)
      .get(uuid, req.tenantPayload.sub) as DocumentRow | undefined

    if (!doc) throw new NotFoundException('Receipt not found')

    return {
      uuid: doc.uuid,
      title: doc.title,
      receiptNumber: doc.receipt_number,
      amount: doc.amount,
      currency: doc.currency,
      lineItems: JSON.parse(doc.line_items || '[]'),
      tenantName: doc.tenant_name,
      companyName: doc.company_name,
      companyLogo: doc.company_logo,
      propertyName: doc.property_name,
      propertyAddress: doc.property_address,
      paidAt: doc.paid_at,
      channel: doc.channel,
      paystackReference: doc.paystack_reference,
      generatedAt: doc.generated_at,
    }
  }
}
