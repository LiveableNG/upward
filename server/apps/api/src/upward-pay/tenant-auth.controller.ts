import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  ConflictException,
  UseGuards,
} from '@nestjs/common'
import { SqliteService } from './sqlite.service'
import { JwtService } from '@nestjs/jwt'
import * as crypto from 'crypto'

interface TenantRow {
  id: number
  uuid: string
  email: string
  email_hash: string
  full_name: string
  signup_status: string
  password_hash: string | null
  phone: string
  created_at: string
}

// Lightweight guard — reuses the existing JWT infra but typed for tenants
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'

@Injectable()
export class TenantJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest()
    const authHeader = req.headers?.['authorization'] || req.headers?.['Authorization']
    if (!authHeader) throw new UnauthorizedException('Missing token')
    const token = authHeader.replace('Bearer ', '')
    try {
      const payload = this.jwtService.verify(token)
      if (payload.type !== 'tenant') throw new Error()
      req.tenantPayload = payload
      return true
    } catch {
      throw new UnauthorizedException('Invalid or expired token')
    }
  }
}

@Controller('tenant-auth')
export class TenantAuthController {
  constructor(
    private readonly sqlite: SqliteService,
    private readonly jwtService: JwtService,
  ) {}

  @Post('signup')
  @HttpCode(HttpStatus.CREATED)
  signup(@Body() body: { email: string; password: string; fullName: string; phone?: string }) {
    const db = this.sqlite.getDb()
    const emailHash = this.hashEmail(body.email)

    const existing = db.prepare('SELECT id FROM tenants WHERE email_hash = ?').get(emailHash)
    if (existing) {
      // If tenant exists but hasn't signed up, upgrade them
      const tenant = db
        .prepare('SELECT * FROM tenants WHERE email_hash = ?')
        .get(emailHash) as TenantRow
      if (tenant.signup_status !== 'not_signed_up' && tenant.password_hash) {
        throw new ConflictException('An account with this email already exists')
      }

      // Upgrade existing pre-created tenant
      db.prepare(
        `UPDATE tenants SET full_name = ?, password_hash = ?, phone = ?, signup_status = 'web_only', updated_at = datetime('now')
         WHERE email_hash = ?`,
      ).run(body.fullName, this.hashPassword(body.password), body.phone || null, emailHash)

      const updated = db
        .prepare('SELECT * FROM tenants WHERE email_hash = ?')
        .get(emailHash) as TenantRow
      const token = this.generateToken(updated)
      return { accessToken: token, tenant: this.formatTenant(updated) }
    }

    // New tenant entirely
    const uuid = crypto.randomUUID()
    db.prepare(
      `INSERT INTO tenants (uuid, email, email_hash, phone, full_name, signup_status, password_hash)
       VALUES (?, ?, ?, ?, ?, 'web_only', ?)`,
    ).run(
      uuid,
      body.email,
      emailHash,
      body.phone || null,
      body.fullName,
      this.hashPassword(body.password),
    )

    const tenant = db.prepare('SELECT * FROM tenants WHERE uuid = ?').get(uuid) as TenantRow
    const token = this.generateToken(tenant)
    return { accessToken: token, tenant: this.formatTenant(tenant) }
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() body: { email: string; password: string }) {
    const db = this.sqlite.getDb()
    const emailHash = this.hashEmail(body.email)

    const tenant = db.prepare('SELECT * FROM tenants WHERE email_hash = ?').get(emailHash) as
      | TenantRow
      | undefined
    if (!tenant || !tenant.password_hash) {
      throw new UnauthorizedException('Invalid credentials')
    }

    const passwordHash = this.hashPassword(body.password)
    if (tenant.password_hash !== passwordHash) {
      throw new UnauthorizedException('Invalid credentials')
    }

    // Update last login
    db.prepare(`UPDATE tenants SET updated_at = datetime('now') WHERE id = ?`).run(tenant.id)

    const token = this.generateToken(tenant)
    return { accessToken: token, tenant: this.formatTenant(tenant) }
  }

  @Get('me')
  @UseGuards(TenantJwtGuard)
  getMe(@Req() req: { tenantPayload: { sub: number } }) {
    const db = this.sqlite.getDb()
    const tenant = db.prepare('SELECT * FROM tenants WHERE id = ?').get(req.tenantPayload.sub) as
      | TenantRow
      | undefined
    if (!tenant) throw new UnauthorizedException('Tenant not found')

    // Also grab their pending payment requests
    const pendingPayments = db
      .prepare(
        `SELECT pr.uuid, pr.total_amount, pr.currency, pr.status, pr.payment_link_token, pr.invoice_number, pr.notes,
              c.name as company_name, c.logo_url as company_logo
       FROM payment_requests pr
       JOIN companies c ON c.id = pr.company_id
       WHERE pr.tenant_id = ? AND pr.status IN ('pending', 'partially_paid')`,
      )
      .all(tenant.id)

    // Grab completed payments
    const completedPayments = db
      .prepare(
        `SELECT pt.uuid, pt.amount, pt.currency, pt.status, pt.channel, pt.paid_at, pt.paystack_reference,
              c.name as company_name
       FROM payment_transactions pt
       JOIN companies c ON c.id = pt.company_id
       WHERE pt.tenant_id = ?
       ORDER BY pt.created_at DESC`,
      )
      .all(tenant.id)

    return {
      tenant: this.formatTenant(tenant),
      pendingPayments,
      completedPayments,
    }
  }

  /* ─── helpers ─── */
  private hashEmail(email: string): string {
    return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
  }

  private hashPassword(pw: string): string {
    return crypto.createHash('sha256').update(pw).digest('hex')
  }

  private generateToken(tenant: TenantRow): string {
    return this.jwtService.sign({
      sub: tenant.id,
      uuid: tenant.uuid,
      email: tenant.email,
      type: 'tenant',
    })
  }

  private formatTenant(t: TenantRow) {
    return {
      uuid: t.uuid,
      email: t.email,
      fullName: t.full_name,
      phone: t.phone,
      signupStatus: t.signup_status,
      createdAt: t.created_at,
    }
  }
}
