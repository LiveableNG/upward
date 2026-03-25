import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import Database from 'better-sqlite3'
import * as path from 'path'
import * as crypto from 'crypto'

@Injectable()
export class SqliteService implements OnModuleInit, OnModuleDestroy {
  private db!: Database.Database

  onModuleInit() {
    const dbPath = path.join(process.cwd(), 'upward-pay-mock.db')
    this.db = new Database(dbPath)
    this.db.pragma('journal_mode = WAL')
    this.db.pragma('foreign_keys = ON')
    this.createTables()
    this.seedIfEmpty()
  }

  onModuleDestroy() {
    this.db?.close()
  }

  getDb(): Database.Database {
    return this.db
  }

  /* ─── helpers ─── */
  private uuid(): string {
    return crypto.randomUUID()
  }

  private hashPassword(pw: string): string {
    return crypto.createHash('sha256').update(pw).digest('hex')
  }

  /* ─── schema ─── */
  private createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS companies (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid        TEXT UNIQUE NOT NULL,
        name        TEXT NOT NULL,
        logo_url    TEXT,
        email       TEXT,
        phone       TEXT,
        paystack_subaccount_code TEXT,
        settings    TEXT DEFAULT '{}',
        created_at  TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS properties (
        id          INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid        TEXT UNIQUE NOT NULL,
        company_id  INTEGER NOT NULL REFERENCES companies(id),
        name        TEXT NOT NULL,
        address     TEXT,
        metadata    TEXT DEFAULT '{}',
        created_at  TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS tenants (
        id              INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid            TEXT UNIQUE NOT NULL,
        email           TEXT NOT NULL,
        email_hash      TEXT NOT NULL UNIQUE,
        phone           TEXT,
        full_name       TEXT,
        signup_status   TEXT NOT NULL DEFAULT 'not_signed_up',
        password_hash   TEXT,
        fcm_token       TEXT,
        invited_by_company_id INTEGER REFERENCES companies(id),
        preferences     TEXT DEFAULT '{}',
        metadata        TEXT DEFAULT '{}',
        created_at      TEXT DEFAULT (datetime('now')),
        updated_at      TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS payment_requests (
        id                    INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid                  TEXT UNIQUE NOT NULL,
        company_id            INTEGER NOT NULL REFERENCES companies(id),
        property_id           INTEGER REFERENCES properties(id),
        tenant_id             INTEGER REFERENCES tenants(id),
        tenant_email_hash     TEXT NOT NULL,
        total_amount          INTEGER NOT NULL,
        currency              TEXT NOT NULL DEFAULT 'NGN',
        status                TEXT NOT NULL DEFAULT 'pending',
        payment_link_token    TEXT UNIQUE NOT NULL,
        invoice_number        TEXT,
        notes                 TEXT,
        metadata              TEXT DEFAULT '{}',
        created_at            TEXT DEFAULT (datetime('now')),
        updated_at            TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS payment_line_items (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid                TEXT UNIQUE NOT NULL,
        payment_request_id  INTEGER NOT NULL REFERENCES payment_requests(id),
        company_id          INTEGER NOT NULL REFERENCES companies(id),
        tenant_id           INTEGER REFERENCES tenants(id),
        label               TEXT NOT NULL,
        category            TEXT NOT NULL,
        amount              INTEGER NOT NULL,
        created_at          TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS invitations (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid                TEXT UNIQUE NOT NULL,
        company_id          INTEGER NOT NULL REFERENCES companies(id),
        property_id         INTEGER REFERENCES properties(id),
        tenant_email        TEXT NOT NULL,
        tenant_name         TEXT,
        tenant_id           INTEGER REFERENCES tenants(id),
        invitation_token    TEXT UNIQUE NOT NULL,
        status              TEXT NOT NULL DEFAULT 'sent',
        created_at          TEXT DEFAULT (datetime('now')),
        updated_at          TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS payment_transactions (
        id                  INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid                TEXT UNIQUE NOT NULL,
        payment_request_id  INTEGER NOT NULL REFERENCES payment_requests(id),
        tenant_id           INTEGER REFERENCES tenants(id),
        company_id          INTEGER NOT NULL REFERENCES companies(id),
        amount              INTEGER NOT NULL,
        currency            TEXT NOT NULL DEFAULT 'NGN',
        paystack_reference  TEXT UNIQUE,
        channel             TEXT,
        status              TEXT NOT NULL DEFAULT 'pending',
        paid_at             TEXT,
        metadata            TEXT DEFAULT '{}',
        created_at          TEXT DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS documents (
        id                      INTEGER PRIMARY KEY AUTOINCREMENT,
        uuid                    TEXT UNIQUE NOT NULL,
        company_id              INTEGER NOT NULL REFERENCES companies(id),
        tenant_id               INTEGER REFERENCES tenants(id),
        property_id             INTEGER REFERENCES properties(id),
        payment_transaction_id  INTEGER REFERENCES payment_transactions(id),
        type                    TEXT NOT NULL,
        title                   TEXT NOT NULL,
        file_name               TEXT,
        receipt_number          TEXT,
        amount                  INTEGER,
        currency                TEXT DEFAULT 'NGN',
        line_items              TEXT DEFAULT '[]',
        tenant_name             TEXT,
        company_name            TEXT,
        company_logo            TEXT,
        property_name           TEXT,
        property_address        TEXT,
        paid_at                 TEXT,
        channel                 TEXT,
        paystack_reference      TEXT,
        lease_start             TEXT,
        lease_end               TEXT,
        contract_type           TEXT,
        generated_at            TEXT DEFAULT (datetime('now')),
        created_at              TEXT DEFAULT (datetime('now'))
      );
    `)
  }

  /* ─── seed ─── */
  private seedIfEmpty() {
    const count = this.db.prepare('SELECT COUNT(*) as c FROM companies').get() as { c: number }
    if (count.c > 0) return

    // ── Companies
    const insertCompany = this.db.prepare(
      `INSERT INTO companies (uuid, name, logo_url, email, phone, paystack_subaccount_code)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )

    insertCompany.run(
      'comp-uuid-001',
      'Greenfield Properties Ltd',
      'https://api.dicebear.com/9.x/initials/svg?seed=GP&backgroundColor=0a0a0f&textColor=d97757',
      'info@greenfieldproperties.com',
      '+2348012345678',
      'ACCT_mock_greenfield',
    )

    insertCompany.run(
      'comp-uuid-002',
      'Lekki Horizon Estates',
      'https://api.dicebear.com/9.x/initials/svg?seed=LH&backgroundColor=1a1a2e&textColor=e6a87c',
      'hello@lekkihorizon.com',
      '+2348087654321',
      'ACCT_mock_lekki',
    )

    // ── Properties
    const insertProperty = this.db.prepare(
      `INSERT INTO properties (uuid, company_id, name, address) VALUES (?, ?, ?, ?)`,
    )
    insertProperty.run(
      'prop-uuid-001',
      1,
      'Palm Court Apartments',
      '14 Palm Avenue, Lekki Phase 1, Lagos',
    )
    insertProperty.run('prop-uuid-002', 2, 'Horizon Towers', '7 Alexander Road, Ikoyi, Lagos')

    // ── Tenants — one signed up, one not
    const insertTenant = this.db.prepare(
      `INSERT INTO tenants (uuid, email, email_hash, phone, full_name, signup_status, password_hash, invited_by_company_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )

    // Tenant 1: Signed up (app_installed)
    insertTenant.run(
      'tenant-uuid-001',
      'sarah.johnson@email.com',
      this.hashEmail('sarah.johnson@email.com'),
      '+2348011111111',
      'Sarah Johnson',
      'app_installed',
      this.hashPassword('password123'),
      1,
    )

    // Tenant 2: Not signed up
    insertTenant.run(
      'tenant-uuid-002',
      'david.okafor@email.com',
      this.hashEmail('david.okafor@email.com'),
      '+2348022222222',
      'David Okafor',
      'not_signed_up',
      null,
      2,
    )

    // Tenant 3: Another signed-up user
    insertTenant.run(
      'tenant-uuid-003',
      'amara.eze@email.com',
      this.hashEmail('amara.eze@email.com'),
      '+2348033333333',
      'Amara Eze',
      'web_only',
      this.hashPassword('password123'),
      1,
    )

    // Tenant 4: Another not-signed-up user
    insertTenant.run(
      'tenant-uuid-004',
      'tunde.bakare@email.com',
      this.hashEmail('tunde.bakare@email.com'),
      '+2348044444444',
      'Tunde Bakare',
      'not_signed_up',
      null,
      2,
    )

    // ── Payment Requests
    const insertRequest = this.db.prepare(
      `INSERT INTO payment_requests (uuid, company_id, property_id, tenant_id, tenant_email_hash, total_amount, status, payment_link_token, invoice_number, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )

    // Payment for signed-up tenant (Sarah)
    insertRequest.run(
      'pr-uuid-001',
      1,
      1,
      1,
      this.hashEmail('sarah.johnson@email.com'),
      285000000, // ₦2,850,000 in kobo
      'pending',
      'pay-token-001',
      'INV-2024-0042',
      'Annual rent renewal — Palm Court Unit 4B',
    )

    // Payment for non-signed-up tenant (David)
    insertRequest.run(
      'pr-uuid-002',
      2,
      2,
      2,
      this.hashEmail('david.okafor@email.com'),
      195000000, // ₦1,950,000 in kobo
      'pending',
      'pay-token-002',
      'INV-2024-0089',
      'Initial rent payment — Horizon Tower 12A',
    )

    // ── Payment Line Items
    const insertItem = this.db.prepare(
      `INSERT INTO payment_line_items (uuid, payment_request_id, company_id, tenant_id, label, category, amount)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )

    // Sarah's invoice breakdown
    insertItem.run(this.uuid(), 1, 1, 1, 'Annual Rent', 'rent', 250000000)
    insertItem.run(this.uuid(), 1, 1, 1, 'Service Charge', 'management', 25000000)
    insertItem.run(this.uuid(), 1, 1, 1, 'Legal Fee', 'legal', 10000000)

    // David's invoice breakdown
    insertItem.run(this.uuid(), 2, 2, 2, 'Annual Rent', 'rent', 150000000)
    insertItem.run(this.uuid(), 2, 2, 2, 'Caution Deposit', 'caution', 30000000)
    insertItem.run(this.uuid(), 2, 2, 2, 'Agency Fee', 'agency', 10000000)
    insertItem.run(this.uuid(), 2, 2, 2, 'Legal Fee', 'legal', 5000000)

    // ── Invitations
    const insertInvitation = this.db.prepare(
      `INSERT INTO invitations (uuid, company_id, property_id, tenant_email, tenant_name, tenant_id, invitation_token, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )

    insertInvitation.run(
      'inv-uuid-001',
      1,
      1,
      'david.okafor@email.com',
      'David Okafor',
      null,
      'inv-token-001',
      'sent',
    )
    insertInvitation.run(
      'inv-uuid-002',
      2,
      2,
      'tunde.bakare@email.com',
      'Tunde Bakare',
      null,
      'inv-token-002',
      'sent',
    )
    // Invitation for a REGISTERED tenant (Sarah) — should redirect to login
    insertInvitation.run(
      'inv-uuid-003',
      1,
      1,
      'sarah.johnson@email.com',
      'Sarah Johnson',
      1,
      'inv-token-sarah',
      'sent',
    )

    // ── Past payment transactions for Sarah (for receipts)
    const insertTx = this.db.prepare(
      `INSERT INTO payment_transactions (uuid, payment_request_id, tenant_id, company_id, amount, currency, paystack_reference, channel, status, paid_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'success', ?, ?)`,
    )
    insertTx.run(
      'tx-uuid-hist-001',
      1,
      1,
      1,
      280000000,
      'NGN',
      'PSK_REF_20240101',
      'card',
      '2024-01-15T10:30:00Z',
      '2024-01-15T10:30:00Z',
    )
    insertTx.run(
      'tx-uuid-hist-002',
      1,
      1,
      1,
      280000000,
      'NGN',
      'PSK_REF_20240701',
      'bank_transfer',
      '2024-07-02T14:15:00Z',
      '2024-07-02T14:15:00Z',
    )
    insertTx.run(
      'tx-uuid-hist-003',
      1,
      1,
      1,
      285000000,
      'NGN',
      'PSK_REF_20250101',
      'card',
      '2025-01-10T09:45:00Z',
      '2025-01-10T09:45:00Z',
    )

    // ── Documents: Receipts
    const insertDoc = this.db.prepare(
      `INSERT INTO documents (uuid, company_id, tenant_id, property_id, payment_transaction_id, type, title, receipt_number, amount, currency, line_items, tenant_name, company_name, company_logo, property_name, property_address, paid_at, channel, paystack_reference, generated_at, created_at)
       VALUES (?, ?, ?, ?, ?, 'receipt', ?, ?, ?, 'NGN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )

    insertDoc.run(
      'doc-uuid-r001',
      1,
      1,
      1,
      null,
      'Rent Payment — Jan 2024',
      'RCP-2024-00101',
      280000000,
      JSON.stringify([
        { label: 'Annual Rent', category: 'rent', amount: 250000000 },
        { label: 'Service Charge', category: 'management', amount: 20000000 },
        { label: 'Legal Fee', category: 'legal', amount: 10000000 },
      ]),
      'Sarah Johnson',
      'Greenfield Properties Ltd',
      'https://api.dicebear.com/9.x/initials/svg?seed=GP&backgroundColor=0a0a0f&textColor=d97757',
      'Palm Court Apartments',
      '14 Palm Avenue, Lekki Phase 1, Lagos',
      '2024-01-15T10:30:00Z',
      'card',
      'PSK_REF_20240101',
      '2024-01-15T10:35:00Z',
      '2024-01-15T10:35:00Z',
    )

    insertDoc.run(
      'doc-uuid-r002',
      1,
      1,
      1,
      null,
      'Rent Payment — Jul 2024',
      'RCP-2024-00245',
      280000000,
      JSON.stringify([
        { label: 'Annual Rent', category: 'rent', amount: 250000000 },
        { label: 'Service Charge', category: 'management', amount: 20000000 },
        { label: 'Legal Fee', category: 'legal', amount: 10000000 },
      ]),
      'Sarah Johnson',
      'Greenfield Properties Ltd',
      'https://api.dicebear.com/9.x/initials/svg?seed=GP&backgroundColor=0a0a0f&textColor=d97757',
      'Palm Court Apartments',
      '14 Palm Avenue, Lekki Phase 1, Lagos',
      '2024-07-02T14:15:00Z',
      'bank_transfer',
      'PSK_REF_20240701',
      '2024-07-02T14:20:00Z',
      '2024-07-02T14:20:00Z',
    )

    insertDoc.run(
      'doc-uuid-r003',
      1,
      1,
      1,
      null,
      'Rent Payment — Jan 2025',
      'RCP-2025-00012',
      285000000,
      JSON.stringify([
        { label: 'Annual Rent', category: 'rent', amount: 250000000 },
        { label: 'Service Charge', category: 'management', amount: 25000000 },
        { label: 'Legal Fee', category: 'legal', amount: 10000000 },
      ]),
      'Sarah Johnson',
      'Greenfield Properties Ltd',
      'https://api.dicebear.com/9.x/initials/svg?seed=GP&backgroundColor=0a0a0f&textColor=d97757',
      'Palm Court Apartments',
      '14 Palm Avenue, Lekki Phase 1, Lagos',
      '2025-01-10T09:45:00Z',
      'card',
      'PSK_REF_20250101',
      '2025-01-10T09:50:00Z',
      '2025-01-10T09:50:00Z',
    )

    // ── Documents: Contracts
    const insertContract = this.db.prepare(
      `INSERT INTO documents (uuid, company_id, tenant_id, property_id, type, title, file_name, tenant_name, company_name, company_logo, property_name, property_address, lease_start, lease_end, contract_type, generated_at, created_at)
       VALUES (?, ?, ?, ?, 'contract', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )

    insertContract.run(
      'doc-uuid-c001',
      1,
      1,
      1,
      'Tenancy Agreement — 2024',
      'Tenancy_Agreement_Palm_Court_2024.pdf',
      'Sarah Johnson',
      'Greenfield Properties Ltd',
      'https://api.dicebear.com/9.x/initials/svg?seed=GP&backgroundColor=0a0a0f&textColor=d97757',
      'Palm Court Apartments',
      '14 Palm Avenue, Lekki Phase 1, Lagos',
      '2024-01-01',
      '2024-12-31',
      'tenancy_agreement',
      '2024-01-01T00:00:00Z',
      '2024-01-01T00:00:00Z',
    )

    insertContract.run(
      'doc-uuid-c002',
      1,
      1,
      1,
      'Tenancy Agreement — 2025',
      'Tenancy_Agreement_Palm_Court_2025.pdf',
      'Sarah Johnson',
      'Greenfield Properties Ltd',
      'https://api.dicebear.com/9.x/initials/svg?seed=GP&backgroundColor=0a0a0f&textColor=d97757',
      'Palm Court Apartments',
      '14 Palm Avenue, Lekki Phase 1, Lagos',
      '2025-01-01',
      '2025-12-31',
      'tenancy_agreement',
      '2025-01-01T00:00:00Z',
      '2025-01-01T00:00:00Z',
    )
  }

  private hashEmail(email: string): string {
    return crypto.createHash('sha256').update(email.toLowerCase().trim()).digest('hex')
  }
}
