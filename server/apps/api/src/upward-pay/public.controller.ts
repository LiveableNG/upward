import { Controller, Get, Param, NotFoundException, GoneException } from '@nestjs/common'
import * as crypto from 'crypto'
import { SqliteService } from './sqlite.service'

interface CompanyRow {
  id: number
  uuid: string
  name: string
  logo_url: string
  email: string
  phone: string
}
interface PropertyRow {
  id: number
  uuid: string
  name: string
  address: string
}
interface TenantRow {
  id: number
  uuid: string
  email: string
  full_name: string
  signup_status: string
}
interface PaymentRequestRow {
  id: number
  uuid: string
  company_id: number
  property_id: number
  tenant_id: number
  total_amount: number
  currency: string
  status: string
  payment_link_token: string
  invoice_number: string
  notes: string
  created_at: string
}
interface LineItemRow {
  uuid: string
  label: string
  category: string
  amount: number
}
interface InvitationRow {
  id: number
  uuid: string
  company_id: number
  property_id: number
  tenant_email: string
  tenant_name: string
  invitation_token: string
  status: string
  created_at: string
}

@Controller('public')
export class PublicController {
  constructor(private readonly sqlite: SqliteService) {}

  /**
   * GET /public/payment-request/:token
   * Resolves a payment link token → returns invoice + company + tenant data
   */
  @Get('payment-request/:token')
  getPaymentRequest(@Param('token') token: string) {
    const db = this.sqlite.getDb()

    const request = db
      .prepare('SELECT * FROM payment_requests WHERE payment_link_token = ?')
      .get(token) as PaymentRequestRow | undefined

    if (!request) {
      throw new NotFoundException('Payment link not found or invalid')
    }

    if (request.status === 'expired') {
      throw new GoneException('This payment link has expired')
    }

    const company = db
      .prepare('SELECT * FROM companies WHERE id = ?')
      .get(request.company_id) as CompanyRow

    const property = request.property_id
      ? (db
          .prepare('SELECT * FROM properties WHERE id = ?')
          .get(request.property_id) as PropertyRow)
      : null

    const tenant = request.tenant_id
      ? (db.prepare('SELECT * FROM tenants WHERE id = ?').get(request.tenant_id) as TenantRow)
      : null

    const lineItems = db
      .prepare(
        'SELECT uuid, label, category, amount FROM payment_line_items WHERE payment_request_id = ?',
      )
      .all(request.id) as LineItemRow[]

    return {
      paymentRequest: {
        uuid: request.uuid,
        totalAmount: request.total_amount,
        currency: request.currency,
        status: request.status,
        invoiceNumber: request.invoice_number,
        notes: request.notes,
        createdAt: request.created_at,
      },
      company: {
        uuid: company.uuid,
        name: company.name,
        logoUrl: company.logo_url,
        email: company.email,
      },
      property: property
        ? { uuid: property.uuid, name: property.name, address: property.address }
        : null,
      tenant: tenant
        ? {
            uuid: tenant.uuid,
            fullName: tenant.full_name,
            email: tenant.email,
            signupStatus: tenant.signup_status,
          }
        : null,
      lineItems: lineItems.map((item) => ({
        uuid: item.uuid,
        label: item.label,
        category: item.category,
        amount: item.amount,
      })),
    }
  }

  /**
   * GET /public/invitation/:token
   * Resolves an invitation token → returns company info + invitation status
   */
  @Get('invitation/:token')
  getInvitation(@Param('token') token: string) {
    const db = this.sqlite.getDb()

    const invitation = db
      .prepare('SELECT * FROM invitations WHERE invitation_token = ?')
      .get(token) as InvitationRow | undefined

    if (!invitation) {
      throw new NotFoundException('Invitation not found or invalid')
    }

    const company = db
      .prepare('SELECT * FROM companies WHERE id = ?')
      .get(invitation.company_id) as CompanyRow

    const property = invitation.property_id
      ? (db
          .prepare('SELECT * FROM properties WHERE id = ?')
          .get(invitation.property_id) as PropertyRow)
      : null

    // Check if this tenant email is already registered
    const emailHash = crypto
      .createHash('sha256')
      .update(invitation.tenant_email.toLowerCase().trim())
      .digest('hex')

    const existingTenant = db
      .prepare('SELECT signup_status FROM tenants WHERE email_hash = ?')
      .get(emailHash) as { signup_status: string } | undefined

    return {
      invitation: {
        uuid: invitation.uuid,
        tenantName: invitation.tenant_name,
        tenantEmail: invitation.tenant_email,
        status: invitation.status,
        createdAt: invitation.created_at,
      },
      company: {
        uuid: company.uuid,
        name: company.name,
        logoUrl: company.logo_url,
      },
      property: property
        ? { uuid: property.uuid, name: property.name, address: property.address }
        : null,
      tenantSignupStatus: existingTenant?.signup_status || 'not_found',
    }
  }
}
