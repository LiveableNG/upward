import { PrismaClient } from '@prisma/client'
import { faker } from '@faker-js/faker'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

// Deterministic hash helper for searching/indexing (matching EncryptionService)
function hash(text: string): string {
  if (!text) return '';
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}

// AES-256-GCM encryption helper (matching EncryptionService)
function encrypt(text: string): string {
  if (!text) return '';
  const hexKey = process.env.ENCRYPTION_KEY || 'd7f3e2a1b0c9d8e7f6a5b4c3d2e1f0a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8';
  const key = Buffer.from(hexKey, 'hex');
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

async function main() {
  console.log('🗑️ Clearing database in reverse dependency order...')

  // 1. WhatsApp logs and sessions
  await prisma.upward_whatsapp_rent_reminder_log.deleteMany({})
  await prisma.upward_whatsapp_transaction_pins.deleteMany({})
  await prisma.upward_whatsapp_sessions.deleteMany({})

  // 2. PM collaboration & docs
  await prisma.upward_pm_team_collaboration.deleteMany({})
  await prisma.upward_pm_property_collaboration.deleteMany({})
  await prisma.upward_pm_activity_log.deleteMany({})
  await prisma.upward_pm_sent_document.deleteMany({})
  await prisma.upward_pm_document_template.deleteMany({})

  // 3. PM landlord logs & sessions
  await prisma.upward_pm_landlord_auth_session.deleteMany({})
  await prisma.upward_pm_landlord.deleteMany({})

  // 4. Payment transactions, overpayments, and logs
  await prisma.upward_refund_log.deleteMany({})
  await prisma.upward_overpayment.deleteMany({})
  await prisma.upward_transaction.deleteMany({})
  await prisma.upward_settlement_batch.deleteMany({})
  await prisma.upward_pm_rent_payment.deleteMany({})
  await prisma.upward_pm_payment_request.deleteMany({})
  await prisma.upward_payment_line_item.deleteMany({})
  await prisma.upward_payment_request.deleteMany({})
  await prisma.upward_rent_cycle.deleteMany({})
  await prisma.upward_saved_landlord.deleteMany({})

  // 5. User Property and dedicated accounts
  await prisma.upward_dedicated_virtual_account.deleteMany({})
  await prisma.upward_user_bank_details.deleteMany({})
  await prisma.upward_paystack_subaccount.deleteMany({})
  await prisma.upward_fee_override.deleteMany({})
  await prisma.upward_property_inspection.deleteMany({})
  await prisma.upward_property_infraction.deleteMany({})
  await prisma.upward_user_contract.deleteMany({})
  await prisma.upward_user_property.deleteMany({})
  await prisma.upward_location.deleteMany({})

  // 6. Company context
  await prisma.upward_manager.deleteMany({})
  await prisma.upward_company_user.deleteMany({})
  await prisma.upward_company.deleteMany({})

  // 7. System metadata and interaction logs
  await prisma.upward_user_announcement_state.deleteMany({})
  await prisma.upward_announcement.deleteMany({})
  await prisma.upward_notification.deleteMany({})
  await prisma.upward_webhook_log.deleteMany({})
  await prisma.upward_platform.deleteMany({})
  await prisma.upward_credibility_request.deleteMany({})
  await prisma.upward_support_ticket.deleteMany({})
  await prisma.upward_feedback.deleteMany({})
  await prisma.upward_app_activity_log.deleteMany({})
  await prisma.upward_dev_email_preview.deleteMany({})
  await prisma.upward_attendance.deleteMany({})
  await prisma.upward_email_log.deleteMany({})
  await prisma.upward_session.deleteMany({})
  await prisma.upward_waitlist.deleteMany({})
  await prisma.upward_interaction.deleteMany({})
  await prisma.upward_error_log.deleteMany({})
  await prisma.upward_email_campaign.deleteMany({})
  await prisma.upward_system_email.deleteMany({})
  await prisma.upward_fairness_story.deleteMany({})

  // 8. Remaining PM entities
  await prisma.upward_pm_bulk_invite_item.deleteMany({})
  await prisma.upward_pm_bulk_invite.deleteMany({})
  await prisma.upward_pm_landlord_report.deleteMany({})
  await prisma.upward_pm_verification.deleteMany({})
  await prisma.upward_pm_email_setting.deleteMany({})
  await prisma.upward_pm_signature.deleteMany({})
  await prisma.upward_pm_notification.deleteMany({})
  await prisma.upward_pm_letterhead.deleteMany({})
  await prisma.upward_pm_auth_session.deleteMany({})
  await prisma.upward_pm_unit.deleteMany({})
  await prisma.upward_pm_property.deleteMany({})
  await prisma.upward_pm_tenant.deleteMany({})
  await prisma.upward_property_manager.deleteMany({})

  // 9. Remaining user / admin tables
  await prisma.upward_auth_session.deleteMany({})
  await prisma.upward_device_token.deleteMany({})
  await prisma.upward_verification_token.deleteMany({})
  await prisma.upward_admin_log.deleteMany({})
  await prisma.upward_admin.deleteMany({})
  await prisma.upward_user.deleteMany({})

  console.log('✅ Clearing completed successfully.')

  // ----------------------------------------------------
  // Core Passwords & Configuration
  // ----------------------------------------------------
  const defaultPassword = 'Password123'
  const passwordHash = await bcrypt.hash(defaultPassword, 10)
  const defaultUserUUID = crypto.randomUUID()
  const defaultPmUUID = crypto.randomUUID()

  // ----------------------------------------------------
  // 1. Seed Global Independent Tables
  // ----------------------------------------------------
  console.log('🌱 Seeding Global Systems and Configurations...')
  
  // Admins & Logs
  const superAdmin = await prisma.upward_admin.create({
    data: {
      email: 'admin.support@goodtenants.africa',
      passwordHash,
      role: 'SUPERADMIN',
      mustChangePassword: false,
    }
  })

  await prisma.upward_admin_log.create({
    data: {
      adminId: superAdmin.id,
      action: 'SYSTEM_STARTUP_SEED',
      details: 'Populated all initial application domain testing scenarios.',
      ipAddress: '127.0.0.1',
      userAgent: 'Postman/11.0.0',
    }
  })

  // Locations
  const lagosLocation = await prisma.upward_location.create({
    data: {
      country: 'Nigeria',
      state: 'Lagos',
      area: 'Lekki Phase 1',
      subarea: 'Oniru',
      address: 'Block 20, plot 15, Admiralty Way',
    }
  })

  // Paystack Subaccounts
  const paystackSubaccount1 = await prisma.upward_paystack_subaccount.create({
    data: {
      accountNumber: '0123456789',
      bankCode: '058',
      subaccountCode: 'ACCT_xyz123456',
      businessName: 'Akin Properties Escrow Account',
    }
  })

  // Platform (For Corporate scenario)
  const corpPlatform = await prisma.upward_platform.create({
    data: {
      name: 'Upward Corporate Solutions',
      apiKey: 'upward_ent_key_corp_998877',
      webhookUrl: 'https://api.nexus.io/v1/upward-webhook',
      email: 'engineering@nexus.io',
      emailHash: hash('engineering@nexus.io'),
      nameHash: hash('Upward Corporate Solutions'),
    }
  })

  // Announcements
  const systemAnnouncement = await prisma.upward_announcement.create({
    data: {
      title: 'New Feature Alert: Automated Invoicing',
      message: 'Property Managers can now toggle weekly/monthly recurrence directly when drafting tenant invoices!',
      iconType: 'sparkles',
      isActive: true,
      url: 'https://goodtenants.africa/features/invoices',
    }
  })

  // Masterclass Sessions (For Waitlist transitions)
  const masterclassSession = await prisma.upward_session.create({
    data: {
      name: 'Tenant Rights and Rental Credibility Workshop',
      googleMeetLink: 'https://meet.google.com/xyz-qprs-tuv',
      startTime: faker.date.soon({ days: 10 }),
      endTime: faker.date.soon({ days: 11 }),
    }
  })

  // Waitlist
  const waitlistUser = await prisma.upward_waitlist.create({
    data: {
      email: 'halima.bello@gmail.com',
      firstName: 'Halima',
      lastName: 'Bello',
      phone: '+2348099887766',
      role: 'Tenant',
      benefits: ['Early access', 'Rental credit boost'],
      acceptTerms: true,
      country: 'Nigeria',
      city: 'Lagos',
      selectedSession: masterclassSession.id,
      confirmationSent: true,
      confirmationEmailStatus: 'SENT',
    }
  })

  // Session Attendance
  await prisma.upward_attendance.create({
    data: {
      sessionId: masterclassSession.id,
      userId: waitlistUser.id,
      attended: true,
    }
  })

  // Interaction logs (for A/B testing insights)
  await prisma.upward_interaction.create({
    data: {
      visitorId: crypto.randomUUID(),
      type: 'CLICK_RENT_FLOW',
      target: 'cta_pay_now',
      abVariant: 'variant_b_glassmorphic',
      ipAddress: '197.210.64.12',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X)',
    }
  })

  // Error Log
  await prisma.upward_error_log.create({
    data: {
      message: 'Failed to dispatch webhook to Nexus Platform due to connection timeout',
      stack: 'Error: Connection Timeout\n    at Socket.timeoutHandler (server/apps/api/src/webhook.service.ts:45:12)',
      context: 'WebhookService',
      severity: 'WARNING',
    }
  })

  // Onboarding Campaigns
  await prisma.upward_email_campaign.create({
    data: {
      weekNumber: 1,
      subject: 'Welcome to Upward! Let\'s setup your rental profile.',
      htmlContent: '<h1>Boost your Credit Score</h1><p>Learn how keeping rent payments prompt helps build financial history.</p>',
    }
  })

  // Global System Emails
  await prisma.upward_system_email.create({
    data: {
      slug: 'welcome-tenant',
      subject: 'Your Upward Account is Ready!',
      htmlContent: '<div>Welcome to your premium rent portal dashboard!</div>',
    }
  })

  // Fairness Stories
  await prisma.upward_fairness_story.create({
    data: {
      name: 'Akin Court Resolved Dispute',
      categories: ['Property Management', 'Dispute Resolution'],
      story: 'Bolu and Segun resolved their bathroom plumbing maintenance request efficiently within 24 hours using Upward dispute vaults.',
    }
  })

  // WhatsApp Session
  await prisma.upward_whatsapp_sessions.create({
    data: {
      uuid: crypto.randomUUID(),
      phone: '+2348037654321',
      phoneHash: hash('+2348037654321'),
      state: 'AWAITING_PIN',
      sessionData: {
        userId: 1,
        step: 'auth',
      },
      lastMessageAt: new Date(),
    }
  })

  // WhatsApp Pin log
  await prisma.upward_whatsapp_transaction_pins.create({
    data: {
      uuid: crypto.randomUUID(),
      upwardUserUuid: defaultUserUUID,
      pinHash: await bcrypt.hash('1234', 4),
    }
  })

  // ----------------------------------------------------
  // 2. Seed Property Managers (PM)
  // ----------------------------------------------------
  console.log('🌱 Seeding Property Managers & Collaboration circles...')
  
  // Segun Akin (Individual PM)
  const pm1 = await prisma.upward_property_manager.create({
    data: {
      uuid: defaultPmUUID,
      email: 'segun.akin@goodtenants.africa',
      emailHash: hash('segun.akin@goodtenants.africa'),
      passwordHash,
      firstName: 'Segun',
      firstNameHash: encrypt('Segun'),
      lastName: 'Akin',
      lastNameHash: encrypt('Akin'),
      businessName: 'Akin & Partners Agency',
      pmType: 'INDIVIDUAL',
      phone: '+2348031234567',
      phoneHash: encrypt('+2348031234567'),
      isVerified: true,
      country: 'Nigeria',
    }
  })

  // Yemi Ade (Collaborator PM)
  const pm2 = await prisma.upward_property_manager.create({
    data: {
      email: 'yemi.ade@goodtenants.africa',
      emailHash: hash('yemi.ade@goodtenants.africa'),
      passwordHash,
      firstName: 'Yemi',
      firstNameHash: encrypt('Yemi'),
      lastName: 'Ade',
      lastNameHash: encrypt('Ade'),
      businessName: 'Ade Corporate Estates Ltd',
      pmType: 'COMPANY',
      phone: '+2348031122334',
      phoneHash: encrypt('+2348031122334'),
      isVerified: true,
      country: 'Nigeria',
    }
  })

  // PM Verification details
  await prisma.upward_pm_verification.create({
    data: {
      pmId: pm1.id,
      idType: 'CAC',
      idNumber: 'RC-998877',
      status: 'APPROVED',
    }
  })

  // PM Custom Email setting
  await prisma.upward_pm_email_setting.create({
    data: {
      pmId: pm1.id,
      senderName: 'Segun Akin via Upward',
      senderEmail: 'segun.akin@goodtenants.africa',
      logoUrl: 'https://upward.cdn/assets/akin-logo.png',
      closingStatement: 'Best regards, the management team.',
    }
  })

  // PM Signature upload
  await prisma.upward_pm_signature.create({
    data: {
      pmId: pm1.id,
      name: 'Segun Digital Sign',
      type: 'digital',
      content: 'Segun Akin, Esq.',
      isDefault: true,
    }
  })

  // PM Letterhead template
  await prisma.upward_pm_letterhead.create({
    data: {
      pmId: pm1.id,
      isDefault: true,
      pageCount: 1,
      templateConfig: {
        themeColor: '#clay',
        footerText: 'Licensed under Lagos Property Laws 2026',
      }
    }
  })

  // Document templates
  const leaseTemplate = await prisma.upward_pm_document_template.create({
    data: {
      pmId: pm1.id,
      name: 'Residential Tenancy Agreement V2',
      content: 'This Lease Agreement is made between the Tenant and Akin & Partners Agency...',
      type: 'RENT_RENEWAL',
    }
  })

  // PM Notifications
  await prisma.upward_pm_notification.create({
    data: {
      pmId: pm1.id,
      title: 'Settlement Dispatched',
      message: 'Settlement Batch #101 worth NGN 250,000 has been paid to Akin Properties Escrow.',
      type: 'PAYMENT_COMPLETED',
      isRead: false,
    }
  })

  // ----------------------------------------------------
  // 3. Seed Landlord and Collaborative Properties
  // ----------------------------------------------------
  console.log('🌱 Seeding Landlord Accounts & Collaborative Properties...')

  const landlord1 = await prisma.upward_pm_landlord.create({
    data: {
      email: 'chinedu.obi@landlords.africa',
      emailHash: hash('chinedu.obi@landlords.africa'),
      passwordHash,
      firstName: encrypt('Chinedu'),
      lastName: encrypt('Obi'),
      phone: encrypt('+2348055555555'),
      phoneHash: hash('+2348055555555'),
      mustChangePassword: false,
    }
  })

  // Landlord session
  await prisma.upward_pm_landlord_auth_session.create({
    data: {
      landlordId: landlord1.id,
      refreshTokenHash: hash('mock-refresh-token-landlord'),
      userAgent: 'Chrome/125.0',
      expiresAt: faker.date.future(),
    }
  })

  // Properties managed by PMs
  const propertyAkinCourt = await prisma.upward_pm_property.create({
    data: {
      pmId: pm1.id,
      name: 'Akin Court',
      address: 'Plot 12, Lekki Phase 1, Lagos',
      totalUnits: 5,
      propertyType: 'Residential',
      country: 'Nigeria',
      state: 'Lagos',
      area: 'Lekki',
      landlordEmailEncrypted: encrypt('chinedu.obi@landlords.africa'),
      landlordEmailHash: hash('chinedu.obi@landlords.africa'),
      landlordNameEncrypted: encrypt('Chinedu Obi'),
      landlordNameSearch: 'Chinedu Obi',
    }
  })

  // Collaborative property (shared with PM Yemi Ade)
  const propertyCollaborative = await prisma.upward_pm_property.create({
    data: {
      pmId: pm1.id,
      name: 'Akin Heights Joint Block',
      address: 'Plot 4, Chevron Drive, Lagos',
      totalUnits: 10,
      propertyType: 'Commercial',
      country: 'Nigeria',
      state: 'Lagos',
      area: 'Chevron',
    }
  })

  // PM Team Collaboration Record
  await prisma.upward_pm_team_collaboration.create({
    data: {
      ownerPmId: pm1.id,
      collaboratorPmId: pm2.id,
      accessLevel: 'CUSTOM',
      status: 'ACCEPTED',
    }
  })

  // PM Property Access Record
  await prisma.upward_pm_property_collaboration.create({
    data: {
      propertyId: propertyCollaborative.id,
      collaboratorPmId: pm2.id,
      ownerPmId: pm1.id,
    }
  })

  // Landlord Reports
  await prisma.upward_pm_landlord_report.create({
    data: {
      pmId: pm1.id,
      landlordEmail: 'chinedu.obi@landlords.africa',
      reportType: 'MONTHLY_PAYMENT_SUMMARY',
      reportData: {
        collectedAmount: 250000,
        pendingAmount: 300000,
        reconciledUnits: ['Apartment 4B'],
      }
    }
  })

  // Activity log tracking
  await prisma.upward_pm_activity_log.create({
    data: {
      pmId: pm2.id, // performed by collaborator
      ownerPmId: pm1.id,
      action: 'UPDATE_RENT',
      entityType: 'UNIT',
      description: 'Yemi Ade updated rent amount on Akin Heights unit 2A.',
    }
  })

  // Bulk Invites
  const bulkInvite1 = await prisma.upward_pm_bulk_invite.create({
    data: {
      pmId: pm1.id,
      status: 'COMPLETED',
      totalTenants: 2,
      sentCount: 2,
    }
  })

  await prisma.upward_pm_bulk_invite_item.create({
    data: {
      bulkInviteId: bulkInvite1.id,
      tenantUuid: crypto.randomUUID(),
      status: 'SENT',
    }
  })

  // ----------------------------------------------------
  // 4. Seed PM Tenants & Units
  // ----------------------------------------------------
  console.log('🌱 Seeding PM tenant references and Units...')

  // Bolu Adebayo reference
  const pmTenantBolu = await prisma.upward_pm_tenant.create({
    data: {
      pmId: pm1.id,
      firstNameEncrypted: encrypt('Bolu'),
      firstNameSearch: 'Bolu',
      lastNameEncrypted: encrypt('Adebayo'),
      lastNameSearch: 'Adebayo',
      emailEncrypted: encrypt('bolu@goodtenants.africa'),
      emailHash: hash('bolu@goodtenants.africa'),
      phoneEncrypted: encrypt('+2348037654321'),
      phoneHash: hash('+2348037654321'),
      inviteStatus: 'ACCEPTED',
    }
  })

  // Amanda Cole reference
  const pmTenantAmanda = await prisma.upward_pm_tenant.create({
    data: {
      pmId: pm1.id,
      firstNameEncrypted: encrypt('Amanda'),
      firstNameSearch: 'Amanda',
      lastNameEncrypted: encrypt('Cole'),
      lastNameSearch: 'Cole',
      emailEncrypted: encrypt('amanda@nexus.io'),
      emailHash: hash('amanda@nexus.io'),
      phoneEncrypted: encrypt('+2348123456789'),
      phoneHash: hash('+2348123456789'),
      inviteStatus: 'ACCEPTED',
    }
  })

  // Halima Bello reference
  const pmTenantHalima = await prisma.upward_pm_tenant.create({
    data: {
      pmId: pm1.id,
      firstNameEncrypted: encrypt('Halima'),
      firstNameSearch: 'Halima',
      lastNameEncrypted: encrypt('Bello'),
      lastNameSearch: 'Bello',
      emailEncrypted: encrypt('halima.bello@gmail.com'),
      emailHash: hash('halima.bello@gmail.com'),
      phoneEncrypted: encrypt('+2348099887766'),
      phoneHash: hash('+2348099887766'),
      inviteStatus: 'ACCEPTED',
    }
  })

  // Standard Unit (Bolu)
  const unit4B = await prisma.upward_pm_unit.create({
    data: {
      propertyId: propertyAkinCourt.id,
      unitName: 'Apartment 4B',
      rentAmount: 250000,
      rentStartDate: faker.date.past({ years: 1 }),
      rentDueDate: faker.date.soon({ days: 15 }),
      currency: 'NGN',
      status: 'OCCUPIED',
      tenantId: pmTenantBolu.id,
      rentType: 'Monthly',
      rentReminderEnabled: true,
      rentReminderDaysBefore: 3,
      unitType: 'Apartment',
    }
  })

  // Corporate Unit (Amanda)
  const unit101 = await prisma.upward_pm_unit.create({
    data: {
      propertyId: propertyCollaborative.id,
      unitName: 'Suite 101',
      rentAmount: 500000,
      rentStartDate: faker.date.past({ years: 1 }),
      rentDueDate: faker.date.soon({ days: 5 }),
      currency: 'NGN',
      status: 'OCCUPIED',
      tenantId: pmTenantAmanda.id,
      rentType: 'Annually',
      rentReminderEnabled: true,
      rentReminderDaysBefore: 7,
      unitType: 'Office Space',
    }
  })

  // Empty/Vacant Unit
  const unitVacant = await prisma.upward_pm_unit.create({
    data: {
      propertyId: propertyAkinCourt.id,
      unitName: 'Apartment 5A',
      rentAmount: 270000,
      currency: 'NGN',
      status: 'VACANT',
      rentType: 'Monthly',
      unitType: 'Penthouse',
    }
  })

  // ----------------------------------------------------
  // 5. Seed Users (Tenants)
  // ----------------------------------------------------
  console.log('🌱 Seeding Unique Tenant Users...')

  // User 1: Bolu Adebayo (Standard Tenant)
  const userBolu = await prisma.upward_user.create({
    data: {
      uuid: defaultUserUUID,
      email: 'bolu@goodtenants.africa',
      emailHash: hash('bolu@goodtenants.africa'),
      passwordHash,
      firstName: 'Bolu',
      firstNameHash: encrypt('Bolu'),
      lastName: 'Adebayo',
      lastNameHash: encrypt('Adebayo'),
      phone: '+2348037654321',
      phoneHash: encrypt('+2348037654321'),
      profileSlug: 'bolu-adebayo',
      isIdentityVerified: true,
    }
  })

  // User 2: Amanda Cole (Corporate tenant with issues)
  const userAmanda = await prisma.upward_user.create({
    data: {
      email: 'amanda@nexus.io',
      emailHash: hash('amanda@nexus.io'),
      passwordHash,
      firstName: 'Amanda',
      firstNameHash: encrypt('Amanda'),
      lastName: 'Cole',
      lastNameHash: encrypt('Cole'),
      phone: '+2348123456789',
      phoneHash: encrypt('+2348123456789'),
      profileSlug: 'amanda-cole',
      isIdentityVerified: true,
    }
  })

  // User 3: Chinedu Obi (Also registered as tenant for self-rent payments)
  const userChinedu = await prisma.upward_user.create({
    data: {
      email: 'chinedu.obi@landlords.africa',
      emailHash: hash('chinedu.obi@landlords.africa'),
      passwordHash,
      firstName: 'Chinedu',
      firstNameHash: encrypt('Chinedu'),
      lastName: 'Obi',
      lastNameHash: encrypt('Obi'),
      phone: '+2348055555555',
      phoneHash: encrypt('+2348055555555'),
      profileSlug: 'chinedu-obi',
      isIdentityVerified: true,
    }
  })

  // User 4: Halima Bello (Waitlist to Tenant transition)
  const userHalima = await prisma.upward_user.create({
    data: {
      email: 'halima.bello@gmail.com',
      emailHash: hash('halima.bello@gmail.com'),
      passwordHash,
      firstName: 'Halima',
      firstNameHash: encrypt('Halima'),
      lastName: 'Bello',
      lastNameHash: encrypt('Bello'),
      phone: '+2348099887766',
      phoneHash: encrypt('+2348099887766'),
      profileSlug: 'halima-bello',
      isIdentityVerified: true,
      isFromWaitlist: true,
    }
  })

  // User Auth Sessions, Device tokens
  await prisma.upward_auth_session.create({
    data: {
      userId: userBolu.id,
      refreshTokenHash: hash('bolu-refresh-token'),
      userAgent: 'Chrome on Mac OS',
      ipAddress: '197.210.64.44',
      expiresAt: faker.date.future(),
    }
  })

  await prisma.upward_device_token.create({
    data: {
      userId: userBolu.id,
      token: 'FCM_TOKEN_BOLU_9988',
      platform: 'iOS',
    }
  })

  await prisma.upward_verification_token.create({
    data: {
      context: 'email_verification',
      identifier: 'bolu@goodtenants.africa',
      token: 'VERIFY_TOKEN_BOLU_1122',
      otp: '4829',
      expiresAt: faker.date.soon(),
    }
  })

  // ----------------------------------------------------
  // 6. Connect Users to Properties & Companies
  // ----------------------------------------------------
  console.log('🌱 Linking Tenants to properties & registering contracts...')

  // UserProperty 1: Bolu (Standard tenant)
  const userPropertyBolu = await prisma.upward_user_property.create({
    data: {
      userId: userBolu.id,
      rentAmount: 250000,
      currency: 'NGN',
      rentStartDate: new Date('2026-01-01'),
      rentEndDate: new Date('2026-12-31'),
      isVerified: true,
      pmId: pm1.id,
      pmUnitId: unit4B.id,
      verificationStatus: 'VERIFIED',
    }
  })

  // UserProperty 2: Amanda (Corporate tenant)
  const userPropertyAmanda = await prisma.upward_user_property.create({
    data: {
      userId: userAmanda.id,
      rentAmount: 500000,
      currency: 'NGN',
      rentStartDate: new Date('2026-03-01'),
      rentEndDate: new Date('2027-02-28'),
      isVerified: true,
      pmId: pm1.id,
      pmUnitId: unit101.id,
      verificationStatus: 'VERIFIED',
    }
  })

  // User Contracts (Leases)
  await prisma.upward_user_contract.create({
    data: {
      userId: userBolu.id,
      userPropertyId: userPropertyBolu.id,
      fileName: 'Signed_Lease_Apartment_4B.pdf',
      fileUrl: 'https://upward-vault.s3.amazonaws.com/contracts/signed_lease_4b.pdf',
      fileType: 'pdf',
      fileSize: 1048576, // 1MB
      source: 'PM',
    }
  })

  // ----------------------------------------------------
  // 7. Seed Companies and Corporate Roles
  // ----------------------------------------------------
  console.log('🌱 Seeding Corporate Workspace context...')

  const nexusCompany = await prisma.upward_company.create({
    data: {
      name: 'Nexus Tech Hub',
      address: 'Plot 3A, Lekki-Epe Expressway, Lagos',
      email: 'workspace@nexus.io',
      phone: '+2348022222222',
      emailHash: hash('workspace@nexus.io'),
      platformId: corpPlatform.id,
    }
  })

  // Company User link
  await prisma.upward_company_user.create({
    data: {
      companyId: nexusCompany.id,
      userId: userAmanda.id,
      acceptedAt: new Date(),
    }
  })

  // Manager representing company
  const compManager = await prisma.upward_manager.create({
    data: {
      companyId: nexusCompany.id,
      firstName: encrypt('Tunde'),
      lastName: encrypt('Bakare'),
      phone: encrypt('+2348022222222'),
      email: encrypt('tunde.bakare@nexus.io'),
      emailHash: hash('tunde.bakare@nexus.io'),
      phoneHash: hash('+2348022222222'),
      firstNameHash: encrypt('Tunde'),
      lastNameHash: encrypt('Bakare'),
    }
  })

  // Connect Amanda's Property manager / Company details
  await prisma.upward_user_property.update({
    where: { id: userPropertyAmanda.id },
    data: {
      companyId: nexusCompany.id,
      managerId: compManager.id,
    }
  })

  // Inspections and Infractions on Amanda's property
  await prisma.upward_property_inspection.create({
    data: {
      userPropertyId: userPropertyAmanda.id,
      inspectorName: 'Segun Akin',
      score: 65,
      notes: 'Plumbing needs minor repairs. Air Conditioner filters require replacement.',
    }
  })

  await prisma.upward_property_infraction.create({
    data: {
      userPropertyId: userPropertyAmanda.id,
      description: 'Quiet Hours violation - Noise complaints reported on June 18th by neighbors.',
      amountOwed: 25000,
      isResolved: false,
    }
  })

  // Fee override for Amanda
  await prisma.upward_fee_override.create({
    data: {
      targetType: 'USER',
      targetId: userAmanda.uuid,
      fee: 2500, // Custom discounted checkout platform fee
    }
  })

  // ----------------------------------------------------
  // 8. Seed Invoicing, Rent Cycles and Transactions
  // ----------------------------------------------------
  console.log('🌱 Seeding Payment Invoices and Settlement Cycles...')

  // Payment Requests (Global invoices)
  const prBolu = await prisma.upward_payment_request.create({
    data: {
      userId: userBolu.id,
      userPropertyId: userPropertyBolu.id,
      amount: 250000,
      currency: 'NGN',
      description: 'Rent Invoice for July 2026',
      dueDate: new Date('2026-07-31'),
      status: 'PENDING',
      allowPartial: true,
      minAmount: 50000,
      rentStartDate: new Date('2026-07-01'),
      rentEndDate: new Date('2026-07-31'),
      rentType: 'Monthly',
    }
  })

  // Line items
  await prisma.upward_payment_line_item.create({
    data: {
      paymentRequestId: prBolu.id,
      name: 'Base Apartment Rent',
      totalAmount: 230000,
      status: 'PENDING',
    }
  })
  await prisma.upward_payment_line_item.create({
    data: {
      paymentRequestId: prBolu.id,
      name: 'Service Charge & Security',
      totalAmount: 20000,
      status: 'PENDING',
    }
  })

  // PM Payment Request link
  await prisma.upward_pm_payment_request.create({
    data: {
      pmId: pm1.id,
      unitId: unit4B.id,
      tenantId: pmTenantBolu.id,
      paymentRequestId: prBolu.id,
      amount: 250000,
      dueDate: new Date('2026-07-31'),
      status: 'PENDING',
      description: 'Akin Court Apartment 4B - Rent July 2026',
    }
  })

  // Rent Cycles
  await prisma.upward_rent_cycle.create({
    data: {
      userId: userBolu.id,
      userPropertyId: userPropertyBolu.id,
      paymentRequestId: prBolu.id,
      amountOwed: 250000,
      dueDate: new Date('2026-07-31'),
      status: 'PENDING',
      description: 'Monthly Rent Cycle - July 2026',
    }
  })

  // Virtual account assigned
  await prisma.upward_dedicated_virtual_account.create({
    data: {
      accountNumber: '9988776655',
      accountName: 'BOLU ADEBAYO - UPWARD ESCROW',
      bankName: 'Wema Bank',
      bankCode: '035',
      accountCode: 'DVA_CODE_9988',
      paystackCustomerId: 'CUST_887766',
      userPropertyId: userPropertyBolu.id,
    }
  })

  // Bank Details for Bolu
  await prisma.upward_user_bank_details.create({
    data: {
      userId: userBolu.id,
      accountNumber: '1122334455',
      accountName: 'Bolu Adebayo',
      bankCode: '011',
      bankName: 'First Bank of Nigeria',
    }
  })

  // Completed Transaction (Last Month's rent)
  const prBoluPast = await prisma.upward_payment_request.create({
    data: {
      userId: userBolu.id,
      userPropertyId: userPropertyBolu.id,
      amount: 250000,
      currency: 'NGN',
      description: 'Rent Invoice for June 2026',
      dueDate: new Date('2026-06-30'),
      status: 'PAID',
      paidAt: new Date('2026-06-28'),
      amountPaid: 250000,
    }
  })

  const settlementBatch1 = await prisma.upward_settlement_batch.create({
    data: {
      landlordId: paystackSubaccount1.subaccountCode,
      totalAmount: 242500, // less processing fees
      status: 'COMPLETED',
      transferReference: 'TRSF_SETTLED_098901',
    }
  })

  const paidTransaction = await prisma.upward_transaction.create({
    data: {
      userId: userBolu.id,
      amount: 250000,
      currency: 'NGN',
      status: 'SUCCESS',
      type: 'RENT',
      reference: 'TX_REF_00998877',
      narration: 'Rent Payment - June 2026 (Apartment 4B)',
      paymentRequestId: prBoluPast.id,
      settlementStatus: 'SETTLED',
      settlementBatchId: settlementBatch1.id,
    }
  })

  // PM's record of this rent payment
  await prisma.upward_pm_rent_payment.create({
    data: {
      unitId: unit4B.id,
      amount: 250000,
      paymentDate: new Date('2026-06-28'),
      periodStart: new Date('2026-06-01'),
      periodEnd: new Date('2026-06-30'),
      method: 'Dedicated Virtual Account',
      reference: 'TX_REF_00998877',
      status: 'SUCCESS',
      tenantId: pmTenantBolu.id,
    }
  })

  // Saved landlord account
  await prisma.upward_saved_landlord.create({
    data: {
      userId: userBolu.id,
      name: 'Segun Akin Escrow',
      accountName: 'Akin & Partners Escrow Account',
      accountNumber: '0123456789',
      bankName: 'Guaranty Trust Bank',
      bankCode: '058',
      lastAmount: 250000,
      lastPaid: new Date('2026-06-28'),
      subaccountId: paystackSubaccount1.id,
    }
  })

  // Overpayment scenario for Amanda Cole
  const prAmanda = await prisma.upward_payment_request.create({
    data: {
      userId: userAmanda.id,
      userPropertyId: userPropertyAmanda.id,
      amount: 500000,
      currency: 'NGN',
      description: 'Office Suite 101 - July 2026 Billing',
      dueDate: new Date('2026-07-25'),
      status: 'PARTIALLY_PAID',
      amountPaid: 300000,
    }
  })

  const txAmandaPartial = await prisma.upward_transaction.create({
    data: {
      userId: userAmanda.id,
      amount: 320000, // overpaid partial rent amount
      currency: 'NGN',
      status: 'SUCCESS',
      reference: 'TX_AMANDA_PARTIAL_998',
      paymentRequestId: prAmanda.id,
      settlementStatus: 'PENDING',
    }
  })

  await prisma.upward_overpayment.create({
    data: {
      userId: userAmanda.id,
      amount: 20000, // Excess balance available
      currency: 'NGN',
      transactionId: txAmandaPartial.id,
      paymentRequestId: prAmanda.id,
      status: 'AVAILABLE',
    }
  })

  // Refund Log scenario
  const txFailedDuplicate = await prisma.upward_transaction.create({
    data: {
      userId: userAmanda.id,
      amount: 320000,
      currency: 'NGN',
      status: 'FAILED',
      reference: 'TX_AMANDA_DUP_FAILED_777',
      narration: 'Failed Duplicate Rent Dispatch',
    }
  })

  await prisma.upward_refund_log.create({
    data: {
      transactionId: txFailedDuplicate.id,
      userId: userAmanda.id,
      amount: 320000,
      reason: 'DUPLICATE_PAYMENT',
      status: 'FLAGGED',
      actionBy: 'SYSTEM',
    }
  })

  // ----------------------------------------------------
  // 9. Seed System Activities, Feedbacks, and Templates
  // ----------------------------------------------------
  console.log('🌱 Seeding System Notification Logs & User State trackers...')

  // Announcement viewed state
  await prisma.upward_user_announcement_state.create({
    data: {
      userId: userBolu.id,
      announcementId: systemAnnouncement.id,
      seenPopup: true,
      seenBanner: true,
      interactedBanner: true,
    }
  })

  // Support ticket
  await prisma.upward_support_ticket.create({
    data: {
      userId: userBolu.id,
      message: 'I would like to update my bank settlement details. Can someone assist?',
      status: 'OPEN',
    }
  })

  // Feedback submissions
  await prisma.upward_feedback.create({
    data: {
      userId: userHalima.id,
      email: 'halima.bello@gmail.com',
      name: 'Halima Bello',
      type: 'SUGGESTION',
      message: 'The masterclass video player was highly interactive. Adding bookmark capabilities to notes would be awesome!',
    }
  })

  // Platform Webhook Dispatching Logs
  await prisma.upward_webhook_log.create({
    data: {
      platformId: corpPlatform.id,
      event: 'payment.success',
      url: corpPlatform.webhookUrl,
      payload: {
        transactionRef: 'TX_AMANDA_PARTIAL_998',
        amount: 320000,
        email: 'amanda@nexus.io',
      },
      status: 'SUCCESS',
      responseCode: 200,
    }
  })

  // Sent documents vault
  await prisma.upward_pm_sent_document.create({
    data: {
      pmId: pm1.id,
      tenantId: pmTenantBolu.id,
      unitId: unit4B.id,
      subject: 'Updated House rules for Lekki Court Phase 1',
      content: 'Please make sure pets are kept in designated zones...',
      documentType: 'PDF',
      recipientName: 'Bolu Adebayo',
      recipientEmail: 'bolu@goodtenants.africa',
      status: 'SENT',
      isVaultDocument: true,
    }
  })

  // Credibility rating request
  await prisma.upward_credibility_request.create({
    data: {
      userId: userBolu.id,
      propertyUuid: propertyAkinCourt.uuid,
      companyName: 'Akin & Partners Agency',
      managerName: 'Segun Akin',
      email: 'segun.akin@goodtenants.africa',
      status: 'APPROVED',
    }
  })

  // Email delivery logs
  await prisma.upward_email_log.create({
    data: {
      registeredUserId: userBolu.id,
      subject: 'Your Rent Receipt - June 2026',
      status: 'DELIVERED',
      type: 'TRANSACTIONAL',
    }
  })

  // App Activity Logs
  await prisma.upward_app_activity_log.create({
    data: {
      app: 'upward-pay',
      userId: userBolu.id,
      userRole: 'TENANT',
      userEmail: 'bolu@goodtenants.africa',
      action: 'LOGIN',
      description: 'Bolu logged in using iOS mobile app.',
    }
  })

  await prisma.upward_app_activity_log.create({
    data: {
      app: 'upward-pm',
      pmId: pm1.id,
      userRole: 'PM',
      userEmail: 'segun.akin@goodtenants.africa',
      action: 'CREATE',
      entityType: 'UNIT',
      description: 'Segun Akin created vacant unit 5A in Akin Court.',
    }
  })

  // Dev email preview
  await prisma.upward_dev_email_preview.create({
    data: {
      to: 'bolu@goodtenants.africa',
      subject: 'Rent Reminder - Lekki Court',
      html: '<p>Hi Bolu, your rent is due in 3 days.</p>',
    }
  })

  // WhatsApp rent reminders dispatched
  await prisma.upward_whatsapp_rent_reminder_log.create({
    data: {
      uuid: crypto.randomUUID(),
      userPropertyId: userPropertyBolu.id,
      userId: userBolu.id,
      phone: '+2348037654321',
      daysBefore: 3,
      dueDate: new Date('2026-07-31'),
      reminderDate: new Date('2026-07-28'),
      status: 'SENT',
    }
  })

  console.log('✨ Data seeding complete successfully!')
  console.log('📝 Seeding summary:')
  console.log(` - Admins created: 1 (${superAdmin.email})`)
  console.log(` - PMs created: 2 (${pm1.email}, ${pm2.email})`)
  console.log(` - Landlords created: 1 (${landlord1.email})`)
  console.log(` - Users created: 4 (${userBolu.email}, ${userAmanda.email}, ${userChinedu.email}, ${userHalima.email})`)
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
