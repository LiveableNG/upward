import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import { ConfigService } from '@nestjs/config'
import { ArmConnectInvestmentProvider } from '../src/infrastructure/providers/asset-management/arm-connect-investment.provider'

// Load server/apps/api/.env manually so ConfigService & ENCRYPTION_KEY match runtime
function loadEnvFile(): Record<string, string> {
  const envMap: Record<string, string> = {}
  const envPath = path.resolve(__dirname, '../.env')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/)
    for (const rawLine of lines) {
      const line = rawLine.trim()
      if (!line || line.startsWith('#')) continue
      const eqIdx = line.indexOf('=')
      if (eqIdx === -1) continue
      const k = line.slice(0, eqIdx).trim()
      const v = line
        .slice(eqIdx + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '')
      envMap[k] = v
      if (!process.env[k]) process.env[k] = v
    }
  }
  return envMap
}

const envVars = loadEnvFile()
const prisma = new PrismaClient()
const configService = new ConfigService(envVars)
const armProvider = new ArmConnectInvestmentProvider(configService)

// Encryption key matching server/apps/api/.env or default fallback
const hexKey =
  process.env.ENCRYPTION_KEY ||
  'd7f3e2a1b0c9d8e7f6a5b4c3d2e1f0a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8'
const key = Buffer.from(hexKey, 'hex')

function encrypt(text: string): string {
  if (!text) return text
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
  let encrypted = cipher.update(text, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

function hash(text: string): string {
  if (!text) return text
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex')
}

async function main() {
  console.log('🚀 Seeding ARM Subscription & Redemption Demo Users via LIVE ARM Sandbox API...')

  // Authenticate & inspect live ARM Sandbox state
  const overview = await armProvider.getMerchantOverview(true)
  const omnibusMembershipId = overview.merchantMembershipId || '3005679'
  const activeArmCustomers = overview.customers.filter(
    (c) => c.customerMembershipId && c.status !== 'Failed',
  )
  const primaryCustomerMembershipId =
    activeArmCustomers[0]?.customerMembershipId || omnibusMembershipId
  const secondaryCustomerMembershipId =
    activeArmCustomers[1]?.customerMembershipId || omnibusMembershipId

  console.log(
    `🔗 Connected to ARM Sandbox (${overview.baseUrl}) | Merchant: ${overview.merchantId} (${omnibusMembershipId}) | Live ARMMMF Yield: ${(overview.yieldMetrics.annualNetYieldRate * 100).toFixed(2)}% p.a.`,
  )

  const defaultPassword = 'Password123'
  const passwordHash = await bcrypt.hash(defaultPassword, 10)

  // 0a. Ensure platform rate config is set to 16.0% p.a.
  await prisma.upward_platform_rate_config.upsert({
    where: { key: 'GLOBAL' },
    create: {
      key: 'GLOBAL',
      savingsEnabled: true,
      savingsAnnualRatePct: 16.0,
      rentProtecRatePct: 10.0,
      insurancePremiumPct: 2.0,
      rentProtecMinMonths: 6,
      maxSavingsMonths: 11,
    },
    update: {
      savingsAnnualRatePct: 16.0,
      savingsEnabled: true,
    },
  })

  // 0b. Ensure shared Demo Location exists
  let location = await prisma.upward_location.findFirst({
    where: { address: 'Plot 14, Admiralty Way', area: 'Lekki Phase 1' },
  })
  if (!location) {
    location = await prisma.upward_location.create({
      data: {
        address: 'Plot 14, Admiralty Way',
        area: 'Lekki Phase 1',
        state: 'Lagos',
        country: 'Nigeria',
      },
    })
  }

  // 0c. Ensure shared Demo Landlord Manual Settlement Account exists
  let manualAccount = await prisma.upward_manual_account.findFirst({
    where: { accountNumber: '0123456789', bankCode: '058' },
  })
  if (!manualAccount) {
    manualAccount = await prisma.upward_manual_account.create({
      data: {
        accountNumber: '0123456789',
        accountName: 'GoodTenants Inflow / Chief Adewale Adeyemi',
        bankName: 'Guaranty Trust Bank',
        bankCode: '058',
        title: 'Landlord Settlement Account',
        isPrimary: true,
      },
    })
  }

  async function setupDemoUser(data: {
    email: string
    firstName: string
    lastName: string
    phone: string
    gender: 'Male' | 'Female'
    dateOfBirth: string
    isIdentityVerified: boolean
    savingsWalletEnabled: boolean
    profileSlug: string
  }) {
    const emailHash = hash(data.email)
    const existing = await prisma.upward_user.findUnique({
      where: { emailHash },
    })

    if (existing) {
      await prisma.upward_rent_settlement.deleteMany({ where: { userId: existing.id } })
      await prisma.upward_rent_savings_score.deleteMany({ where: { userId: existing.id } })
      await prisma.upward_rent_vault_transaction.deleteMany({ where: { userId: existing.id } })
      await prisma.upward_rent_advance.deleteMany({ where: { userId: existing.id } })
      await prisma.upward_savings_consent.deleteMany({ where: { userId: existing.id } })
      await prisma.upward_rent_vault.deleteMany({ where: { userId: existing.id } })
      await prisma.upward_kyc_verification.deleteMany({ where: { userId: existing.id } })
      await prisma.upward_user_property.deleteMany({ where: { userId: existing.id } })
      await prisma.upward_auth_session.deleteMany({ where: { userId: existing.id } })

      return prisma.upward_user.update({
        where: { id: existing.id },
        data: {
          email: encrypt(data.email),
          emailHash,
          passwordHash,
          firstName: encrypt(data.firstName),
          firstNameHash: encrypt(data.firstName),
          lastName: encrypt(data.lastName),
          lastNameHash: encrypt(data.lastName),
          phone: encrypt(data.phone),
          phoneHash: hash(data.phone),
          gender: data.gender,
          dateOfBirth: data.dateOfBirth,
          isIdentityVerified: data.isIdentityVerified,
          savingsWalletEnabled: data.savingsWalletEnabled,
          termsAcceptedAt: new Date(),
          termsVersion: '2026-08-24',
        },
      })
    }

    return prisma.upward_user.create({
      data: {
        email: encrypt(data.email),
        emailHash,
        passwordHash,
        firstName: encrypt(data.firstName),
        firstNameHash: encrypt(data.firstName),
        lastName: encrypt(data.lastName),
        lastNameHash: encrypt(data.lastName),
        phone: encrypt(data.phone),
        phoneHash: hash(data.phone),
        gender: data.gender,
        dateOfBirth: data.dateOfBirth,
        profileSlug: data.profileSlug,
        isIdentityVerified: data.isIdentityVerified,
        savingsWalletEnabled: data.savingsWalletEnabled,
        termsAcceptedAt: new Date(),
        termsVersion: '2026-08-24',
      },
    })
  }

  // =========================================================================
  // USER 1: Fresh Onboarding & Subscription Demo
  // Email: arm-onboard@goodtenants.africa
  // =========================================================================
  const user1 = await setupDemoUser({
    email: 'arm-onboard@goodtenants.africa',
    firstName: 'Chidi',
    lastName: 'Eze',
    phone: '+2348031112233',
    gender: 'Male',
    dateOfBirth: '1994-06-12',
    isIdentityVerified: false,
    savingsWalletEnabled: false,
    profileSlug: 'chidi-eze-arm-demo',
  })

  const user1DueDate = new Date(Date.now() + 240 * 24 * 60 * 60 * 1000)
  await prisma.upward_user_property.create({
    data: {
      userId: user1.id,
      locationId: location.id,
      manualAccountId: manualAccount.id,
      rentAmount: 2400000,
      rentStartDate: new Date(Date.now() - 125 * 24 * 60 * 60 * 1000),
      rentEndDate: user1DueDate,
      isVerified: true,
      verificationStatus: 'VERIFIED',
    },
  })
  console.log(`✅ [User 1] Fresh Onboarding ready: arm-onboard@goodtenants.africa`)

  // =========================================================================
  // USER 2: Active Subscriptions & Daily Yield Compounding (Live ARM Purchases)
  // Email: arm-subscriber@goodtenants.africa
  // =========================================================================
  const user2 = await setupDemoUser({
    email: 'arm-subscriber@goodtenants.africa',
    firstName: 'Funke',
    lastName: 'Akindele',
    phone: '+2348032223344',
    gender: 'Female',
    dateOfBirth: '1991-09-24',
    isIdentityVerified: true,
    savingsWalletEnabled: true,
    profileSlug: 'funke-akindele-arm-demo',
  })

  const user2DueDate = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000)
  await prisma.upward_user_property.create({
    data: {
      userId: user2.id,
      locationId: location.id,
      manualAccountId: manualAccount.id,
      rentAmount: 3600000,
      rentStartDate: new Date(Date.now() - 245 * 24 * 60 * 60 * 1000),
      rentEndDate: user2DueDate,
      isVerified: true,
      verificationStatus: 'VERIFIED',
    },
  })

  // Execute 3 real live subscriptions on ARM Sandbox for User 2
  const depRef2A = `UPW-SUB-U2A-${Date.now()}`
  const depRef2B = `UPW-SUB-U2B-${Date.now() + 1}`
  const depRef2C = `UPW-SUB-U2C-${Date.now() + 2}`

  const [pur2A, pur2B, pur2C] = await Promise.all([
    armProvider.subscribe({
      membershipId: primaryCustomerMembershipId,
      productCode: 'ARMMMF',
      amountKobo: 60000000n,
      reference: depRef2A,
    }),
    armProvider.subscribe({
      membershipId: primaryCustomerMembershipId,
      productCode: 'ARMMMF',
      amountKobo: 60000000n,
      reference: depRef2B,
    }),
    armProvider.subscribe({
      membershipId: primaryCustomerMembershipId,
      productCode: 'ARMMMF',
      amountKobo: 60000000n,
      reference: depRef2C,
    }),
  ])

  const bvn2 = '22233344455'
  const nin2 = '11133344455'
  await prisma.upward_kyc_verification.create({
    data: {
      userId: user2.id,
      idType: 'BVN',
      idNumberHash: hash(bvn2),
      idNumberMasked: '*******4455',
      idNumberEncrypted: encrypt(bvn2),
      ninHash: hash(nin2),
      ninMasked: '*******4455',
      ninEncrypted: encrypt(nin2),
      ninVerifiedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      meansOfIdType: 'NIN',
      meansOfIdNumberEnc: encrypt(nin2),
      meansOfIdNumberMasked: '*******4455',
      meansOfIdFileName: 'funke-nin-slip.jpg',
      residentialAddressNumber: 'Plot 14',
      residentialStreet: 'Admiralty Way, Lekki Phase 1',
      residentialTown: 'Lekki',
      residentialState: 'Lagos',
      utilityBillFileName: 'funke-ekedc-bill.pdf',
      addressVerificationStatus: 'VERIFIED',
      provider: 'PREMBLY',
      status: 'VERIFIED',
      mothersMaidenNameEnc: encrypt('Balogun'),
      occupation: 'Lead Product Manager',
      sourceOfFunds: 'Salary',
      incomeRange: '1M-5M',
      riskAppetite: 'Conservative',
      nextOfKinName: 'Jide Akindele',
      nextOfKinRelationship: 'Spouse',
      nextOfKinPhone: '+2348039991122',
      nextOfKinEmail: 'jide@akindele.com',
      nextOfKinAddress: 'Plot 14, Admiralty Way, Lekki Phase 1, Lagos',
      armCustomerMembershipId: primaryCustomerMembershipId,
      armCrmAccountNumber: `${primaryCustomerMembershipId}-ARMMMF-01`,
      armSyncStatus: 'Submitted',
      armCompletedSections: 63,
      verifiedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    },
  })

  const user2UnlockDate = new Date(user2DueDate.getTime() - 30 * 24 * 60 * 60 * 1000)
  const vault2 = await prisma.upward_rent_vault.create({
    data: {
      userId: user2.id,
      targetAmountKobo: 360000000n,
      currentPrincipalKobo: 180000000n,
      accruedYieldKobo: 6485000n,
      cadence: 'MONTHLY',
      productOption: 'SAVE_AND_EARN',
      planPattern: 'EQUAL',
      appliedAnnualRatePct: 16.0,
      contractualDueDate: user2DueDate,
      unlockDate: user2UnlockDate,
      lockStatus: 'LOCKED',
      preferredFundingMethod: 'DVA',
      dvaBankName: 'Wema Bank',
      dvaAccountNumber: '9928374102',
      dvaAccountName: 'Upward / Funke Akindele',
      dvaAssignmentStatus: 'ACTIVE',
      dvaCustomerCode: 'CUS_arm_sub_02',
      autoBypassPmApproval: true,
      investmentProvider: 'ARM',
      providerMembershipId: primaryCustomerMembershipId,
      providerAccountNumber: `${primaryCustomerMembershipId}-ARMMMF-01`,
      providerCrmStatus: 'Submitted',
      armPurchaseId: pur2C.purchaseId || null,
      lastYieldSyncAt: new Date(),
    },
  })

  await prisma.upward_savings_consent.create({
    data: {
      userId: user2.id,
      vaultId: vault2.id,
      termsVersion: '2026-11-v1-draft',
      consentDocVersion: 'ARM-B2B2C-2026-v1-draft',
      fundCode: 'ARMMMF',
      fundName: 'ARM Money Market Fund',
      acceptedTerms: true,
      acceptedArmMandate: true,
      acceptedLockPolicy: true,
      acceptedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      ipAddress: '102.89.32.14',
      userAgent: 'UpwardPay/1.0 (iOS)',
      consentSnapshot: {
        customerFullName: 'Funke Akindele',
        customerEmail: 'arm-subscriber@goodtenants.africa',
        customerPhone: '+2348032223344',
        maskedBvn: '*******4455',
        maskedNin: '*******4455',
        residentialAddress: 'Plot 14, Admiralty Way, Lekki Phase 1, Lekki, Lagos',
      },
    },
  })

  await prisma.upward_rent_vault_transaction.createMany({
    data: [
      {
        vaultId: vault2.id,
        userId: user2.id,
        type: 'DEPOSIT',
        amountKobo: 60000000n,
        principalDeltaKobo: 60000000n,
        yieldDeltaKobo: 0n,
        balanceAfterKobo: 60000000n,
        reference: depRef2A,
        channel: 'DVA_NIP',
        narration: `Rent savings deposit swept to ARM MMF (PurchaseId: ${pur2A.purchaseId})`,
        metadata: { armPurchaseId: pur2A.purchaseId, armTransactionId: pur2A.transactionId },
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      },
      {
        vaultId: vault2.id,
        userId: user2.id,
        type: 'YIELD_ACCRUAL',
        amountKobo: 2380000n,
        principalDeltaKobo: 0n,
        yieldDeltaKobo: 2380000n,
        balanceAfterKobo: 62380000n,
        reference: `UPW-YLD-U2A-${vault2.id}`,
        channel: 'SYSTEM_YIELD',
        narration: 'ARM MMF Daily Compounding Yield (16.0% p.a.)',
        createdAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
      },
      {
        vaultId: vault2.id,
        userId: user2.id,
        type: 'DEPOSIT',
        amountKobo: 60000000n,
        principalDeltaKobo: 60000000n,
        yieldDeltaKobo: 0n,
        balanceAfterKobo: 122380000n,
        reference: depRef2B,
        channel: 'DVA_NIP',
        narration: `Rent savings deposit swept to ARM MMF (PurchaseId: ${pur2B.purchaseId})`,
        metadata: { armPurchaseId: pur2B.purchaseId, armTransactionId: pur2B.transactionId },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        vaultId: vault2.id,
        userId: user2.id,
        type: 'DEPOSIT',
        amountKobo: 60000000n,
        principalDeltaKobo: 60000000n,
        yieldDeltaKobo: 0n,
        balanceAfterKobo: 182380000n,
        reference: depRef2C,
        channel: 'DVA_NIP',
        narration: `Rent savings deposit swept to ARM MMF (PurchaseId: ${pur2C.purchaseId})`,
        metadata: { armPurchaseId: pur2C.purchaseId, armTransactionId: pur2C.transactionId },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        vaultId: vault2.id,
        userId: user2.id,
        type: 'YIELD_ACCRUAL',
        amountKobo: 4105000n,
        principalDeltaKobo: 0n,
        yieldDeltaKobo: 4105000n,
        balanceAfterKobo: 186485000n,
        reference: `UPW-YLD-U2B-${vault2.id}`,
        channel: 'SYSTEM_YIELD',
        narration: 'ARM MMF Daily Compounding Yield (16.0% p.a.)',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ],
  })

  await prisma.upward_rent_savings_score.create({
    data: {
      vaultId: vault2.id,
      userId: user2.id,
      cadencePoints: 32,
      velocityPoints: 26,
      loanDisciplinePoints: 20,
      totalScore: 78,
      historyLog: [
        { reason: 'Timely recurring deposit +10', delta: 10, timestamp: new Date().toISOString() },
      ],
    },
  })
  console.log(
    `✅ [User 2] Active Subscriptions seeded with real ARM PurchaseIds: ${pur2A.purchaseId}, ${pur2B.purchaseId}, ${pur2C.purchaseId}`,
  )

  // =========================================================================
  // USER 3: Settlement Ready / Redemption Demo (Live ARM Purchases)
  // Email: arm-redeem@goodtenants.africa
  // =========================================================================
  const user3 = await setupDemoUser({
    email: 'arm-redeem@goodtenants.africa',
    firstName: 'Babatunde',
    lastName: 'Fashola',
    phone: '+2348033334455',
    gender: 'Male',
    dateOfBirth: '1988-03-10',
    isIdentityVerified: true,
    savingsWalletEnabled: true,
    profileSlug: 'babatunde-fashola-arm-demo',
  })

  const user3DueDate = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000)
  const user3UnlockDate = new Date(user3DueDate.getTime() - 30 * 24 * 60 * 60 * 1000)

  await prisma.upward_user_property.create({
    data: {
      userId: user3.id,
      locationId: location.id,
      manualAccountId: manualAccount.id,
      rentAmount: 2400000,
      rentStartDate: new Date(Date.now() - 353 * 24 * 60 * 60 * 1000),
      rentEndDate: user3DueDate,
      isVerified: true,
      verificationStatus: 'VERIFIED',
    },
  })

  const depRef3A = `UPW-SUB-U3A-${Date.now()}`
  const depRef3B = `UPW-SUB-U3B-${Date.now() + 1}`
  const [pur3A, pur3B] = await Promise.all([
    armProvider.subscribe({
      membershipId: secondaryCustomerMembershipId,
      productCode: 'ARMMMF',
      amountKobo: 120000000n,
      reference: depRef3A,
    }),
    armProvider.subscribe({
      membershipId: secondaryCustomerMembershipId,
      productCode: 'ARMMMF',
      amountKobo: 120000000n,
      reference: depRef3B,
    }),
  ])

  const bvn3 = '22244455566'
  const nin3 = '11144455566'
  await prisma.upward_kyc_verification.create({
    data: {
      userId: user3.id,
      idType: 'BVN',
      idNumberHash: hash(bvn3),
      idNumberMasked: '*******5566',
      idNumberEncrypted: encrypt(bvn3),
      ninHash: hash(nin3),
      ninMasked: '*******5566',
      ninEncrypted: encrypt(nin3),
      ninVerifiedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      meansOfIdType: 'INTERNATIONAL_PASSPORT',
      meansOfIdNumberEnc: encrypt('A09876543'),
      meansOfIdNumberMasked: '*****6543',
      meansOfIdFileName: 'babatunde-passport-bio.jpg',
      residentialAddressNumber: 'Plot 14',
      residentialStreet: 'Admiralty Way, Lekki Phase 1',
      residentialTown: 'Lekki',
      residentialState: 'Lagos',
      utilityBillFileName: 'babatunde-lawma-waste-bill.pdf',
      addressVerificationStatus: 'VERIFIED',
      provider: 'PREMBLY',
      status: 'VERIFIED',
      mothersMaidenNameEnc: encrypt('Adeleke'),
      occupation: 'Managing Director',
      sourceOfFunds: 'Business',
      incomeRange: '5M-10M',
      riskAppetite: 'Conservative',
      nextOfKinName: 'Abimbola Fashola',
      nextOfKinRelationship: 'Spouse',
      nextOfKinPhone: '+2348038887766',
      nextOfKinEmail: 'abimbola@fashola.com',
      nextOfKinAddress: 'Plot 14, Admiralty Way, Lekki Phase 1, Lagos',
      armCustomerMembershipId: secondaryCustomerMembershipId,
      armCrmAccountNumber: `${secondaryCustomerMembershipId}-ARMMMF-01`,
      armSyncStatus: 'Submitted',
      armCompletedSections: 63,
      verifiedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    },
  })

  const vault3 = await prisma.upward_rent_vault.create({
    data: {
      userId: user3.id,
      targetAmountKobo: 240000000n,
      currentPrincipalKobo: 240000000n,
      accruedYieldKobo: 9840000n,
      cadence: 'MONTHLY',
      productOption: 'SAVE_AND_EARN',
      planPattern: 'EQUAL',
      appliedAnnualRatePct: 16.0,
      contractualDueDate: user3DueDate,
      unlockDate: user3UnlockDate,
      lockStatus: 'SETTLEMENT_READY',
      preferredFundingMethod: 'DVA',
      dvaBankName: 'Wema Bank',
      dvaAccountNumber: '9928374103',
      dvaAccountName: 'Upward / Babatunde Fashola',
      dvaAssignmentStatus: 'ACTIVE',
      dvaCustomerCode: 'CUS_arm_red_03',
      autoBypassPmApproval: true,
      investmentProvider: 'ARM',
      providerMembershipId: secondaryCustomerMembershipId,
      providerAccountNumber: `${secondaryCustomerMembershipId}-ARMMMF-01`,
      providerCrmStatus: 'Submitted',
      armPurchaseId: pur3B.purchaseId || null,
      lastYieldSyncAt: new Date(),
    },
  })

  await prisma.upward_savings_consent.create({
    data: {
      userId: user3.id,
      vaultId: vault3.id,
      termsVersion: '2026-11-v1-draft',
      consentDocVersion: 'ARM-B2B2C-2026-v1-draft',
      fundCode: 'ARMMMF',
      fundName: 'ARM Money Market Fund',
      acceptedTerms: true,
      acceptedArmMandate: true,
      acceptedLockPolicy: true,
      acceptedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      ipAddress: '102.89.44.21',
      userAgent: 'UpwardPay/1.0 (Android)',
      consentSnapshot: {
        customerFullName: 'Babatunde Fashola',
        customerEmail: 'arm-redemption@goodtenants.africa',
        customerPhone: '+2348033334455',
        maskedBvn: '*******5566',
        maskedNin: '*******5566',
        residentialAddress: 'Plot 14, Admiralty Way, Lekki Phase 1, Lekki, Lagos',
      },
    },
  })

  await prisma.upward_rent_vault_transaction.createMany({
    data: [
      {
        vaultId: vault3.id,
        userId: user3.id,
        type: 'DEPOSIT',
        amountKobo: 120000000n,
        principalDeltaKobo: 120000000n,
        yieldDeltaKobo: 0n,
        balanceAfterKobo: 120000000n,
        reference: depRef3A,
        channel: 'DVA_NIP',
        narration: `Rent savings deposit swept to ARM MMF (PurchaseId: ${pur3A.purchaseId})`,
        metadata: { armPurchaseId: pur3A.purchaseId, armTransactionId: pur3A.transactionId },
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      },
      {
        vaultId: vault3.id,
        userId: user3.id,
        type: 'DEPOSIT',
        amountKobo: 120000000n,
        principalDeltaKobo: 120000000n,
        yieldDeltaKobo: 0n,
        balanceAfterKobo: 240000000n,
        reference: depRef3B,
        channel: 'DVA_NIP',
        narration: `Rent savings deposit swept to ARM MMF (PurchaseId: ${pur3B.purchaseId})`,
        metadata: { armPurchaseId: pur3B.purchaseId, armTransactionId: pur3B.transactionId },
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
      {
        vaultId: vault3.id,
        userId: user3.id,
        type: 'YIELD_ACCRUAL',
        amountKobo: 9840000n,
        principalDeltaKobo: 0n,
        yieldDeltaKobo: 9840000n,
        balanceAfterKobo: 249840000n,
        reference: `UPW-YLD-U3A-${vault3.id}`,
        channel: 'SYSTEM_YIELD',
        narration: 'Accumulated ARM MMF Compounding Returns (16.0% p.a.)',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      },
    ],
  })

  await prisma.upward_rent_savings_score.create({
    data: {
      vaultId: vault3.id,
      userId: user3.id,
      cadencePoints: 40,
      velocityPoints: 32,
      loanDisciplinePoints: 20,
      totalScore: 92,
    },
  })
  console.log(
    `✅ [User 3] Settlement Ready seeded with real ARM PurchaseIds: ${pur3A.purchaseId}, ${pur3B.purchaseId}`,
  )

  // =========================================================================
  // USER 4: Early Breakout Demo (Live ARM Purchase)
  // Email: arm-breakout@goodtenants.africa
  // =========================================================================
  const user4 = await setupDemoUser({
    email: 'arm-breakout@goodtenants.africa',
    firstName: 'Ngozi',
    lastName: 'Okonjo',
    phone: '+2348034445566',
    gender: 'Female',
    dateOfBirth: '1987-11-05',
    isIdentityVerified: true,
    savingsWalletEnabled: true,
    profileSlug: 'ngozi-okonjo-arm-demo',
  })

  const user4DueDate = new Date(Date.now() + 150 * 24 * 60 * 60 * 1000)
  await prisma.upward_user_property.create({
    data: {
      userId: user4.id,
      locationId: location.id,
      manualAccountId: manualAccount.id,
      rentAmount: 3000000,
      rentStartDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      rentEndDate: user4DueDate,
      isVerified: true,
      verificationStatus: 'VERIFIED',
    },
  })

  const depRef4 = `UPW-SUB-U4-${Date.now()}`
  const pur4 = await armProvider.subscribe({
    membershipId: omnibusMembershipId,
    productCode: 'ARMMMF',
    amountKobo: 150000000n,
    reference: depRef4,
  })

  const bvn4 = '22255566677'
  const nin4 = '11155566677'
  await prisma.upward_kyc_verification.create({
    data: {
      userId: user4.id,
      idType: 'BVN',
      idNumberHash: hash(bvn4),
      idNumberMasked: '*******6677',
      idNumberEncrypted: encrypt(bvn4),
      ninHash: hash(nin4),
      ninMasked: '*******6677',
      ninEncrypted: encrypt(nin4),
      ninVerifiedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      meansOfIdType: 'DRIVERS_LICENSE',
      meansOfIdNumberEnc: encrypt('LAG8821990'),
      meansOfIdNumberMasked: '******1990',
      meansOfIdFileName: 'ngozi-drivers-license.jpg',
      residentialAddressNumber: '12B',
      residentialStreet: 'Bourdillon Road, Ikoyi',
      residentialTown: 'Ikoyi',
      residentialState: 'Lagos',
      utilityBillFileName: 'ngozi-bank-statement-address.pdf',
      addressVerificationStatus: 'VERIFIED',
      provider: 'PREMBLY',
      status: 'VERIFIED',
      occupation: 'Chief Economist',
      sourceOfFunds: 'Salary',
      incomeRange: '5M-10M',
      riskAppetite: 'Conservative',
      nextOfKinName: 'Ifeanyi Okonjo',
      nextOfKinRelationship: 'Spouse',
      nextOfKinPhone: '+2348037776655',
      armCustomerMembershipId: omnibusMembershipId,
      armCrmAccountNumber: `${omnibusMembershipId}-ARMMMF-01`,
      armSyncStatus: 'Approved',
      armCompletedSections: 63,
    },
  })

  const vault4 = await prisma.upward_rent_vault.create({
    data: {
      userId: user4.id,
      targetAmountKobo: 300000000n,
      currentPrincipalKobo: 150000000n,
      accruedYieldKobo: 3850000n,
      cadence: 'MONTHLY',
      productOption: 'SAVE_AND_EARN',
      planPattern: 'EQUAL',
      appliedAnnualRatePct: 16.0,
      contractualDueDate: user4DueDate,
      unlockDate: new Date(user4DueDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      lockStatus: 'LOCKED',
      preferredFundingMethod: 'DVA',
      dvaBankName: 'Wema Bank',
      dvaAccountNumber: '9928374104',
      dvaAccountName: 'Upward / Ngozi Okonjo',
      dvaAssignmentStatus: 'ACTIVE',
      investmentProvider: 'ARM',
      providerMembershipId: omnibusMembershipId,
      providerAccountNumber: `${omnibusMembershipId}-ARMMMF-01`,
      providerCrmStatus: 'Approved',
      armPurchaseId: pur4.purchaseId || null,
    },
  })

  await prisma.upward_savings_consent.create({
    data: {
      userId: user4.id,
      vaultId: vault4.id,
      termsVersion: '2026-11-v1-draft',
      consentDocVersion: 'ARM-B2B2C-2026-v1-draft',
      fundCode: 'ARMMMF',
      fundName: 'ARM Money Market Fund',
      acceptedTerms: true,
      acceptedArmMandate: true,
      acceptedLockPolicy: true,
      acceptedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      ipAddress: '102.89.18.92',
      userAgent: 'UpwardPay/1.0 (Web)',
      consentSnapshot: {
        customerFullName: 'Ngozi Okonjo',
        customerEmail: 'arm-breakout@goodtenants.africa',
        customerPhone: '+2348034445566',
        maskedBvn: '*******6677',
        maskedNin: '*******6677',
        residentialAddress: '12B, Bourdillon Road, Ikoyi, Ikoyi, Lagos',
      },
    },
  })

  await prisma.upward_rent_vault_transaction.create({
    data: {
      vaultId: vault4.id,
      userId: user4.id,
      type: 'DEPOSIT',
      amountKobo: 150000000n,
      principalDeltaKobo: 150000000n,
      yieldDeltaKobo: 0n,
      balanceAfterKobo: 150000000n,
      reference: depRef4,
      channel: 'DVA_NIP',
      narration: `Rent savings deposit swept to ARM MMF (PurchaseId: ${pur4.purchaseId})`,
      metadata: { armPurchaseId: pur4.purchaseId, armTransactionId: pur4.transactionId },
    },
  })
  console.log(`✅ [User 4] Early Breakout seeded with real ARM PurchaseId: ${pur4.purchaseId}`)

  // =========================================================================
  // USER 5: Completed Settlement / Redemption Record (Live ARM Purchase + Redeem)
  // Email: arm-settled@goodtenants.africa
  // =========================================================================
  const user5 = await setupDemoUser({
    email: 'arm-settled@goodtenants.africa',
    firstName: 'Emeka',
    lastName: 'Nwosu',
    phone: '+2348035556677',
    gender: 'Male',
    dateOfBirth: '1989-12-18',
    isIdentityVerified: true,
    savingsWalletEnabled: true,
    profileSlug: 'emeka-nwosu-arm-demo',
  })

  const user5DueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
  await prisma.upward_user_property.create({
    data: {
      userId: user5.id,
      locationId: location.id,
      manualAccountId: manualAccount.id,
      rentAmount: 2500000,
      rentStartDate: new Date(Date.now() - 370 * 24 * 60 * 60 * 1000),
      rentEndDate: user5DueDate,
      isVerified: true,
      verificationStatus: 'VERIFIED',
    },
  })

  const depRef5 = `UPW-SUB-U5-${Date.now()}`
  const settleRef = `UPW-SETTLE-U5-${Date.now()}`

  const pur5 = await armProvider.subscribe({
    membershipId: omnibusMembershipId,
    productCode: 'ARMMMF',
    amountKobo: 250000000n,
    reference: depRef5,
  })

  const red5 = await armProvider.redeem({
    membershipId: omnibusMembershipId,
    productCode: 'ARMMMF',
    productAccountNumber: `${omnibusMembershipId}-ARMMMF-01`,
    amountKobo: 250000000n,
    reference: settleRef,
  })

  const bvn5 = '22266677788'
  const nin5 = '11166677788'
  await prisma.upward_kyc_verification.create({
    data: {
      userId: user5.id,
      idType: 'BVN',
      idNumberHash: hash(bvn5),
      idNumberMasked: '*******7788',
      idNumberEncrypted: encrypt(bvn5),
      ninHash: hash(nin5),
      ninMasked: '*******7788',
      ninEncrypted: encrypt(nin5),
      ninVerifiedAt: new Date(Date.now() - 370 * 24 * 60 * 60 * 1000),
      meansOfIdType: 'NIN',
      meansOfIdNumberEnc: encrypt(nin5),
      meansOfIdNumberMasked: '*******7788',
      meansOfIdFileName: 'emeka-nin-card.png',
      residentialAddressNumber: '8',
      residentialStreet: 'Adeola Odeku Street, Victoria Island',
      residentialTown: 'Victoria Island',
      residentialState: 'Lagos',
      utilityBillFileName: 'emeka-ikedc-bill.pdf',
      addressVerificationStatus: 'VERIFIED',
      provider: 'PREMBLY',
      status: 'VERIFIED',
      occupation: 'Tech Executive',
      sourceOfFunds: 'Salary',
      incomeRange: '5M-10M',
      riskAppetite: 'Conservative',
      nextOfKinName: 'Chiamaka Nwosu',
      nextOfKinRelationship: 'Spouse',
      nextOfKinPhone: '+2348036665544',
      armCustomerMembershipId: omnibusMembershipId,
      armCrmAccountNumber: `${omnibusMembershipId}-ARMMMF-01`,
      armSyncStatus: 'Approved',
      armCompletedSections: 63,
    },
  })

  const vault5 = await prisma.upward_rent_vault.create({
    data: {
      userId: user5.id,
      targetAmountKobo: 250000000n,
      currentPrincipalKobo: 0n,
      accruedYieldKobo: 0n,
      cadence: 'MONTHLY',
      productOption: 'SAVE_AND_EARN',
      planPattern: 'EQUAL',
      appliedAnnualRatePct: 16.0,
      contractualDueDate: user5DueDate,
      unlockDate: new Date(user5DueDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      lockStatus: 'SETTLED',
      preferredFundingMethod: 'DVA',
      dvaBankName: 'Wema Bank',
      dvaAccountNumber: '9928374105',
      dvaAccountName: 'Upward / Emeka Nwosu',
      dvaAssignmentStatus: 'ACTIVE',
      investmentProvider: 'ARM',
      providerMembershipId: omnibusMembershipId,
      providerAccountNumber: `${omnibusMembershipId}-ARMMMF-01`,
      providerCrmStatus: 'Approved',
      armPurchaseId: pur5.purchaseId || null,
      armWithdrawalId: red5.withdrawalId || null,
    },
  })

  await prisma.upward_savings_consent.create({
    data: {
      userId: user5.id,
      vaultId: vault5.id,
      termsVersion: '2026-11-v1-draft',
      consentDocVersion: 'ARM-B2B2C-2026-v1-draft',
      fundCode: 'ARMMMF',
      fundName: 'ARM Money Market Fund',
      acceptedTerms: true,
      acceptedArmMandate: true,
      acceptedLockPolicy: true,
      acceptedAt: new Date(Date.now() - 370 * 24 * 60 * 60 * 1000),
      ipAddress: '102.89.51.40',
      userAgent: 'UpwardPay/1.0 (iOS)',
      consentSnapshot: {
        customerFullName: 'Emeka Nwosu',
        customerEmail: 'arm-settled@goodtenants.africa',
        customerPhone: '+2348035556677',
        maskedBvn: '*******7788',
        maskedNin: '*******7788',
        residentialAddress: '8, Adeola Odeku Street, Victoria Island, Lagos',
      },
    },
  })

  await prisma.upward_rent_settlement.create({
    data: {
      vaultId: vault5.id,
      userId: user5.id,
      landlordBankCode: '058',
      landlordAccountNumber: '0123456789',
      landlordName: 'Chief Adewale Adeyemi',
      propertyAddress: 'Plot 14, Admiralty Way, Lekki Phase 1, Lagos',
      amountPaidToLandlordKobo: 250000000n,
      cashbackCreditedKobo: 1500000n,
      earlyBirdMultiplierApplied: true,
      nipSessionId: '999058172900018274619',
      settlementReference: settleRef,
      receiptPdfUrl: `/api/v1/rent-vaults/${vault5.uuid}/receipt.pdf`,
      settlementStatus: 'PAID',
      smsAlertDispatched: true,
    },
  })

  await prisma.upward_rent_vault_transaction.createMany({
    data: [
      {
        vaultId: vault5.id,
        userId: user5.id,
        type: 'DEPOSIT',
        amountKobo: 250000000n,
        principalDeltaKobo: 250000000n,
        yieldDeltaKobo: 0n,
        balanceAfterKobo: 250000000n,
        reference: depRef5,
        channel: 'DVA_NIP',
        narration: `Rent savings deposit swept to ARM MMF (PurchaseId: ${pur5.purchaseId})`,
        metadata: { armPurchaseId: pur5.purchaseId, armTransactionId: pur5.transactionId },
        createdAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
      },
      {
        vaultId: vault5.id,
        userId: user5.id,
        type: 'SETTLEMENT_DISBURSEMENT',
        amountKobo: 250000000n,
        principalDeltaKobo: -250000000n,
        yieldDeltaKobo: 0n,
        balanceAfterKobo: 0n,
        reference: settleRef,
        channel: 'NIP_TRANSFER',
        narration: `Rent disbursed to landlord: Chief Adewale Adeyemi (ARM WithdrawalId: ${red5.withdrawalId})`,
        metadata: { armWithdrawalId: red5.withdrawalId, armTransactionId: red5.transactionId },
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        vaultId: vault5.id,
        userId: user5.id,
        type: 'CASHBACK',
        amountKobo: 1500000n,
        principalDeltaKobo: 0n,
        yieldDeltaKobo: 0n,
        balanceAfterKobo: 0n,
        reference: `CB-${settleRef}`,
        channel: 'SYSTEM_YIELD',
        narration: 'Gamified Cashback Credited (1.2x early-bird bonus applied)',
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      },
    ],
  })

  await prisma.upward_rent_savings_score.create({
    data: {
      vaultId: vault5.id,
      userId: user5.id,
      cadencePoints: 40,
      velocityPoints: 40,
      loanDisciplinePoints: 20,
      totalScore: 100,
    },
  })
  console.log(
    `✅ [User 5] Completed Settlement seeded with real ARM PurchaseId (${pur5.purchaseId}) & WithdrawalId (${red5.withdrawalId})`,
  )

  console.log('\n🎉 ALL ARM DEMO USERS SEEDED WITH LIVE ARM SANDBOX TRANSACTIONS!')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding ARM demo users:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
