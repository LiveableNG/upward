import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

// Encryption key matching server/apps/api/.env or default fallback
const hexKey = process.env.ENCRYPTION_KEY || 'd7f3e2a1b0c9d8e7f6a5b4c3d2e1f0a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8'
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
  console.log('🚀 Seeding ARM Subscription & Redemption Demo Users on localhost...')

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
  console.log('📈 Set platform savings rate to 16.0% p.a.')

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
    console.log(`📍 Created demo location: ID ${location.id}`)
  }

  // 0b. Ensure shared Demo Landlord Manual Settlement Account exists
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
    console.log(`🏦 Created demo landlord manual account: ID ${manualAccount.id}`)
  }

  // Helper function to clean up and upsert a demo user
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
      console.log(`🔄 Cleaning existing data for demo user ${data.email}...`)
      // Clean up child records to ensure fresh state
      await prisma.upward_rent_settlement.deleteMany({ where: { userId: existing.id } })
      await prisma.upward_rent_savings_score.deleteMany({ where: { userId: existing.id } })
      await prisma.upward_rent_vault_transaction.deleteMany({ where: { userId: existing.id } })
      await prisma.upward_rent_advance.deleteMany({ where: { userId: existing.id } })
      await prisma.upward_rent_vault.deleteMany({ where: { userId: existing.id } })
      await prisma.upward_kyc_verification.deleteMany({ where: { userId: existing.id } })
      await prisma.upward_user_property.deleteMany({ where: { userId: existing.id } })
      await prisma.upward_auth_session.deleteMany({ where: { userId: existing.id } })

      const updated = await prisma.upward_user.update({
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
      return updated
    }

    const created = await prisma.upward_user.create({
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
    return created
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

  // User 1 has a tenancy property attached, but NO vault and NO KYC yet
  const user1DueDate = new Date(Date.now() + 240 * 24 * 60 * 60 * 1000) // 8 months ahead
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
  console.log(`✅ [User 1] Fresh Onboarding created: ${'arm-onboard@goodtenants.africa'}`)

  // =========================================================================
  // USER 2: Active Subscriptions & Daily Yield Compounding
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

  const user2DueDate = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000) // 4 months ahead
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

  // KYC Verification record (ARM approved member)
  const bvn2 = '22233344455'
  await prisma.upward_kyc_verification.create({
    data: {
      userId: user2.id,
      idType: 'BVN',
      idNumberHash: hash(bvn2),
      idNumberMasked: '*******4455',
      idNumberEncrypted: encrypt(bvn2),
      provider: 'ARM',
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
      armCustomerMembershipId: 'ARM-GT-884920',
      armCrmAccountNumber: 'CRM-003948271',
      armSyncStatus: 'APPROVED',
      armCompletedSections: 63,
      verifiedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
    },
  })

  // Active Rent Vault with ₦1.8M principal + ₦64.8K accrued yield
  const user2UnlockDate = new Date(user2DueDate.getTime() - 30 * 24 * 60 * 60 * 1000)
  const vault2 = await prisma.upward_rent_vault.create({
    data: {
      userId: user2.id,
      targetAmountKobo: 360000000n, // ₦3,600,000
      currentPrincipalKobo: 180000000n, // ₦1,800,000
      accruedYieldKobo: 6485000n, // ₦64,850
      cadence: 'MONTHLY',
      productOption: 'SAVE_AND_EARN',
      planPattern: 'EQUAL',
      appliedAnnualRatePct: 16.0,
      contractualDueDate: user2DueDate,
      unlockDate: user2UnlockDate,
      lockStatus: 'LOCKED',
      preferredFundingMethod: 'DVA',
      dvaBankName: 'Providus Bank',
      dvaAccountNumber: '9928374102',
      dvaAccountName: 'GTN/Funke Akindele',
      dvaAssignmentStatus: 'ACTIVE',
      dvaCustomerCode: 'CUS_arm_sub_02',
      autoBypassPmApproval: true,
      investmentProvider: 'ARM',
      providerMembershipId: 'ARM-GT-884920',
      providerAccountNumber: 'ARM-MMF-003948271',
      providerCrmStatus: 'Approved',
      armPurchaseId: 'ARM_PUR_992810',
      lastYieldSyncAt: new Date(),
    },
  })

  // Past subscription transactions (Schedule of units)
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
        reference: `ARM_DEP_01_${vault2.id}`,
        channel: 'DVA_NIP',
        narration: 'Rent savings deposit via Paystack DVA (Inflow to ARM Virtual Account)',
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
        reference: `ARM_YIELD_01_${vault2.id}`,
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
        reference: `ARM_DEP_02_${vault2.id}`,
        channel: 'DVA_NIP',
        narration: 'Rent savings deposit via Paystack DVA (Inflow to ARM Virtual Account)',
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
        reference: `ARM_DEP_03_${vault2.id}`,
        channel: 'DVA_NIP',
        narration: 'Rent savings deposit via Paystack DVA (Inflow to ARM Virtual Account)',
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
        reference: `ARM_YIELD_02_${vault2.id}`,
        channel: 'SYSTEM_YIELD',
        narration: 'ARM MMF Daily Compounding Yield (16.0% p.a.)',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      },
    ],
  })

  // Savings score
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
  console.log(`✅ [User 2] Active Subscriptions & Yield created: ${'arm-subscriber@goodtenants.africa'}`)

  // =========================================================================
  // USER 3: Settlement Ready / Redemption Demo
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

  // Contractual due date in 12 days (within T-30 unlock window!)
  const user3DueDate = new Date(Date.now() + 12 * 24 * 60 * 60 * 1000)
  const user3UnlockDate = new Date(user3DueDate.getTime() - 30 * 24 * 60 * 60 * 1000) // 18 days ago

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

  // KYC Verification record (ARM approved member with auto-signed consent on file)
  const bvn3 = '22244455566'
  await prisma.upward_kyc_verification.create({
    data: {
      userId: user3.id,
      idType: 'BVN',
      idNumberHash: hash(bvn3),
      idNumberMasked: '*******5566',
      idNumberEncrypted: encrypt(bvn3),
      provider: 'ARM',
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
      armCustomerMembershipId: 'ARM-GT-772019',
      armCrmAccountNumber: 'CRM-001829440',
      armSyncStatus: 'APPROVED',
      armCompletedSections: 63,
      verifiedAt: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000),
    },
  })

  // Vault in SETTLEMENT_READY state with 100% saved (₦2.4M target, ₦98.4K yield)
  const vault3 = await prisma.upward_rent_vault.create({
    data: {
      userId: user3.id,
      targetAmountKobo: 240000000n, // ₦2,400,000
      currentPrincipalKobo: 240000000n, // ₦2,400,000
      accruedYieldKobo: 9840000n, // ₦98,400
      cadence: 'MONTHLY',
      productOption: 'SAVE_AND_EARN',
      planPattern: 'EQUAL',
      appliedAnnualRatePct: 16.0,
      contractualDueDate: user3DueDate,
      unlockDate: user3UnlockDate,
      lockStatus: 'SETTLEMENT_READY', // Ready for immediate redemption!
      preferredFundingMethod: 'DVA',
      dvaBankName: 'Providus Bank',
      dvaAccountNumber: '9928374103',
      dvaAccountName: 'GTN/Babatunde Fashola',
      dvaAssignmentStatus: 'ACTIVE',
      dvaCustomerCode: 'CUS_arm_red_03',
      autoBypassPmApproval: true,
      investmentProvider: 'ARM',
      providerMembershipId: 'ARM-GT-772019',
      providerAccountNumber: 'ARM-MMF-001829440',
      providerCrmStatus: 'Approved',
      armPurchaseId: 'ARM_PUR_772019',
      lastYieldSyncAt: new Date(),
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
        reference: `ARM_DEP_01_${vault3.id}`,
        channel: 'DVA_NIP',
        narration: 'Rent savings deposit via Paystack DVA (Inflow to ARM Virtual Account)',
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
        reference: `ARM_DEP_02_${vault3.id}`,
        channel: 'DVA_NIP',
        narration: 'Rent savings deposit via Paystack DVA (Inflow to ARM Virtual Account)',
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
        reference: `ARM_YIELD_01_${vault3.id}`,
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
  console.log(`✅ [User 3] Settlement Ready / Redemption created: ${'arm-redeem@goodtenants.africa'}`)

  // =========================================================================
  // USER 4: Early Breakout Demo
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

  const bvn4 = '22255566677'
  await prisma.upward_kyc_verification.create({
    data: {
      userId: user4.id,
      idType: 'BVN',
      idNumberHash: hash(bvn4),
      idNumberMasked: '*******6677',
      idNumberEncrypted: encrypt(bvn4),
      provider: 'ARM',
      status: 'VERIFIED',
      occupation: 'Chief Economist',
      sourceOfFunds: 'Salary',
      incomeRange: '5M-10M',
      riskAppetite: 'Conservative',
      nextOfKinName: 'Ifeanyi Okonjo',
      nextOfKinRelationship: 'Spouse',
      nextOfKinPhone: '+2348037776655',
      armCustomerMembershipId: 'ARM-GT-663918',
      armCrmAccountNumber: 'CRM-002948119',
      armSyncStatus: 'APPROVED',
      armCompletedSections: 63,
    },
  })

  const vault4 = await prisma.upward_rent_vault.create({
    data: {
      userId: user4.id,
      targetAmountKobo: 300000000n,
      currentPrincipalKobo: 150000000n, // ₦1,500,000
      accruedYieldKobo: 3850000n, // ₦38,500
      cadence: 'MONTHLY',
      productOption: 'SAVE_AND_EARN',
      planPattern: 'EQUAL',
      appliedAnnualRatePct: 16.0,
      contractualDueDate: user4DueDate,
      unlockDate: new Date(user4DueDate.getTime() - 30 * 24 * 60 * 60 * 1000),
      lockStatus: 'LOCKED',
      preferredFundingMethod: 'DVA',
      dvaBankName: 'Providus Bank',
      dvaAccountNumber: '9928374104',
      dvaAccountName: 'GTN/Ngozi Okonjo',
      dvaAssignmentStatus: 'ACTIVE',
      investmentProvider: 'ARM',
      providerMembershipId: 'ARM-GT-663918',
      providerAccountNumber: 'ARM-MMF-002948119',
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
      reference: `ARM_DEP_01_${vault4.id}`,
      channel: 'DVA_NIP',
      narration: 'Rent savings deposit via Paystack DVA',
    },
  })
  console.log(`✅ [User 4] Early Breakout Demo created: ${'arm-breakout@goodtenants.africa'}`)

  // =========================================================================
  // USER 5: Completed Settlement / Historical Record Demo
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

  const user5DueDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago (settled!)
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

  const bvn5 = '22266677788'
  await prisma.upward_kyc_verification.create({
    data: {
      userId: user5.id,
      idType: 'BVN',
      idNumberHash: hash(bvn5),
      idNumberMasked: '*******7788',
      idNumberEncrypted: encrypt(bvn5),
      provider: 'ARM',
      status: 'VERIFIED',
      occupation: 'Tech Executive',
      sourceOfFunds: 'Salary',
      incomeRange: '5M-10M',
      riskAppetite: 'Conservative',
      nextOfKinName: 'Chiamaka Nwosu',
      nextOfKinRelationship: 'Spouse',
      nextOfKinPhone: '+2348036665544',
      armCustomerMembershipId: 'ARM-GT-551029',
      armCrmAccountNumber: 'CRM-001928472',
      armSyncStatus: 'APPROVED',
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
      dvaBankName: 'Providus Bank',
      dvaAccountNumber: '9928374105',
      dvaAccountName: 'GTN/Emeka Nwosu',
      dvaAssignmentStatus: 'ACTIVE',
      investmentProvider: 'ARM',
      providerMembershipId: 'ARM-GT-551029',
      providerAccountNumber: 'ARM-MMF-001928472',
      armWithdrawalId: 'ARM_WDL_551029',
    },
  })

  // Full settlement record
  const settleRef = `UPW_SETTLE_ARM_DEMO_${Date.now()}`
  await prisma.upward_rent_settlement.create({
    data: {
      vaultId: vault5.id,
      userId: user5.id,
      landlordBankCode: '058',
      landlordAccountNumber: '0123456789',
      landlordName: 'Chief Adewale Adeyemi',
      propertyAddress: 'Plot 14, Admiralty Way, Lekki Phase 1, Lagos',
      amountPaidToLandlordKobo: 250000000n, // ₦2,500,000 disbursed
      cashbackCreditedKobo: 1500000n, // ₦15,000 cashback
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
        type: 'SETTLEMENT_DISBURSEMENT',
        amountKobo: 250000000n,
        principalDeltaKobo: -250000000n,
        yieldDeltaKobo: 0n,
        balanceAfterKobo: 0n,
        reference: settleRef,
        channel: 'NIP_TRANSFER',
        narration: 'Rent disbursed to landlord: Chief Adewale Adeyemi (ARM Redemption Executed)',
      },
      {
        vaultId: vault5.id,
        userId: user5.id,
        type: 'CASHBACK',
        amountKobo: 1500000n,
        principalDeltaKobo: 0n,
        yieldDeltaKobo: 0n,
        balanceAfterKobo: 0n,
        reference: `CB_${settleRef}`,
        channel: 'SYSTEM_YIELD',
        narration: 'Gamified Cashback Credited (1.2x early-bird bonus applied)',
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
  console.log(`✅ [User 5] Completed Settlement / Historical Record created: ${'arm-settled@goodtenants.africa'}`)

  console.log('\n🎉 ALL ARM DEMO USERS SEEDED SUCCESSFULLY!')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log('ALL USERS PASSWORD: Password123\n')
  console.log('1. Onboarding Demo:     arm-onboard@goodtenants.africa')
  console.log('2. Active Subscriptions: arm-subscriber@goodtenants.africa')
  console.log('3. Redemption Demo:      arm-redeem@goodtenants.africa')
  console.log('4. Early Breakout Demo:  arm-breakout@goodtenants.africa')
  console.log('5. Completed Settlement: arm-settled@goodtenants.africa')
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
}

main()
  .catch((e) => {
    console.error('❌ Error seeding ARM demo users:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
