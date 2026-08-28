import { PrismaClient } from '@prisma/client'
import { createDecipheriv } from 'crypto'

const prisma = new PrismaClient()

// Backend encryption decryption helper
function decrypt(ciphertext: string): string {
  if (!ciphertext) return ''
  if (!ciphertext.includes(':')) return ciphertext
  try {
    const keyStr = process.env.ENCRYPTION_KEY || 'default_secret_key_32_bytes_long!!'
    const key = Buffer.from(keyStr.padEnd(32, '0').slice(0, 32))
    const [ivHex, encryptedHex] = ciphertext.split(':')
    const iv = Buffer.from(ivHex, 'hex')
    const decipher = createDecipheriv('aes-256-cbc', key, iv)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch {
    return ciphertext
  }
}

function isDummyEmail(email: string): boolean {
  if (!email) return true
  const normalized = email.toLowerCase()
  return (
    normalized.includes('@upward.local') ||
    normalized.includes('@upward.com') ||
    normalized.startsWith('guest-') ||
    normalized.includes('dummy')
  )
}

async function getDashboardStats() {
  console.log('\n📊 RUNNING EXACT BACKEND + FRONTEND DASHBOARD ALGORITHM...\n')

  // 1. Fetch exactly as NestJS backend does in GetPerformanceMetricsUseCase
  const [allUsers, allWaitlistEntries, pmTenants] = await Promise.all([
    prisma.upward_user.findMany({
      where: { isInternal: false },
      select: {
        id: true,
        uuid: true,
        email: true,
        emailHash: true,
        firstName: true,
        lastName: true,
        phone: true,
        phoneHash: true,
        passwordHash: true,
        authProvider: true,
        isFromWaitlist: true,
        isFromInvite: true,
        createdAt: true,
        joinedAt: true,
        properties: { select: { id: true, rentEndDate: true } },
        transactions: { select: { amount: true, status: true } },
      },
    }),
    prisma.upward_waitlist.findMany({
      where: { isInternal: false },
    }),
    prisma.upward_pm_tenant.findMany({
      where: { isInternal: false },
      include: { pm: true, units: true },
    }),
  ])

  // Decrypt users
  const decryptedUsers = allUsers.map((u) => {
    let email = ''
    let firstName = ''
    let lastName = ''
    let phone = ''
    try {
      email = decrypt(u.email)
      firstName = decrypt(u.firstName)
      lastName = decrypt(u.lastName)
      phone = u.phone ? decrypt(u.phone) : ''
    } catch {
      email = u.email
      firstName = u.firstName
      lastName = u.lastName
      phone = u.phone || ''
    }
    return {
      ...u,
      decryptedEmail: email,
      decryptedFirstName: firstName,
      decryptedLastName: lastName,
      decryptedPhone: phone,
    }
  })

  // Deduplicate dummy guest accounts by phone match
  const realUsersByPhone = new Map<string, any>()
  decryptedUsers.forEach((u) => {
    if (u.decryptedPhone && !isDummyEmail(u.decryptedEmail)) {
      const cleanPhone = u.decryptedPhone.replace(/\D/g, '')
      if (cleanPhone) realUsersByPhone.set(cleanPhone, u)
    }
  })

  const mergedUsers: any[] = []
  decryptedUsers.forEach((u) => {
    if (isDummyEmail(u.decryptedEmail) && u.decryptedPhone) {
      const cleanPhone = u.decryptedPhone.replace(/\D/g, '')
      const realUser = realUsersByPhone.get(cleanPhone)
      if (realUser && realUser.id !== u.id) return
    }
    mergedUsers.push(u)
  })

  const waitlistEmails = new Set(allWaitlistEntries.map((w) => w.email.toLowerCase()))
  const allUserEmailHashes = new Set(mergedUsers.map((u) => u.emailHash))
  const userMap = new Map<string, any>()
  mergedUsers.forEach((u) => userMap.set(u.emailHash, u))

  // ── BACKEND DIRECTORIES COMPUTATION ────────────────────────────

  // A. Waitlist Directory (GetWaitlistMetricsUseCase)
  const finalWaitlistDirectory: any[] = []
  allWaitlistEntries.forEach((w) => {
    if (!allUserEmailHashes.has(w.emailHash)) {
      finalWaitlistDirectory.push({
        id: `wl_${w.id}`,
        uuid: w.uuid,
        firstName: w.firstName ? decrypt(w.firstName) : '',
        lastName: w.lastName ? decrypt(w.lastName) : '',
        email: w.email,
        phone: w.phone,
        createdAt: w.createdAt,
        joinedAt: null,
        origin: 'WAITLIST',
        hasPassword: false,
        isExWaitlist: false,
        rawRecord: w,
      })
    }
  })

  // B. SignedUp Directory (GetSignedUpMetricsUseCase) - filters allUsers where !u.isFromInvite
  const signedUpDirectory: any[] = mergedUsers
    .filter((u) => !u.isFromInvite)
    .map((u) => {
      const decrypted = userMap.get(u.emailHash)
      const decryptedEmail = decrypted?.decryptedEmail || ''
      const isWaitlist = u.isFromWaitlist || waitlistEmails.has(decryptedEmail.toLowerCase())
      const origin = isWaitlist ? 'WAITLIST' : 'SELF_REGISTERED'

      // Check isShadow exactly as in GetSignedUpMetricsUseCase
      const isShadow =
        !u.passwordHash ||
        u.passwordHash === 'INVITED' ||
        u.passwordHash === 'SHADOW_USER_PENDING_ONBOARDING' ||
        u.passwordHash === 'INVITED_NO_PASSWORD' ||
        u.passwordHash === 'SHADOW_GUEST' ||
        (!u.passwordHash.startsWith('$2') &&
          u.passwordHash !== 'SOCIAL_AUTH_NO_PASSWORD' &&
          u.passwordHash !== 'SOCIAL_AUTH')

      return {
        id: `su_${u.id}`,
        uuid: u.uuid,
        firstName: decrypted?.decryptedFirstName || '',
        lastName: decrypted?.decryptedLastName || '',
        email: decryptedEmail,
        phone: decrypted?.decryptedPhone || '',
        createdAt: u.createdAt,
        joinedAt: u.joinedAt || u.createdAt,
        origin,
        hasPassword: !isShadow,
        isExWaitlist: isWaitlist,
        totalPaid: 0,
        rawRecord: u,
      }
    })

  // C. Invited Directory (GetInvitedMetricsUseCase) - filters allUsers where u.isFromInvite + uncreated pmTenants
  const invitedUserEmails = new Set(allUsers.filter((u) => u.isFromInvite).map((u) => u.emailHash))
  const invitedUserPhones = new Set(allUsers.filter((u) => u.phoneHash).map((u) => u.phoneHash))

  const invitedUserDirectory: any[] = mergedUsers
    .filter((u) => u.isFromInvite)
    .map((u) => {
      const decrypted = userMap.get(u.emailHash)
      const decryptedEmail = decrypted?.decryptedEmail || ''

      const isShadow =
        !u.passwordHash ||
        u.passwordHash === 'INVITED' ||
        u.passwordHash === 'SHADOW_USER_PENDING_ONBOARDING' ||
        u.passwordHash === 'INVITED_NO_PASSWORD' ||
        u.passwordHash === 'SHADOW_GUEST' ||
        (!u.passwordHash.startsWith('$2') &&
          u.passwordHash !== 'SOCIAL_AUTH_NO_PASSWORD' &&
          u.passwordHash !== 'SOCIAL_AUTH')

      return {
        id: `inv_u_${u.id}`,
        uuid: u.uuid,
        firstName: decrypted?.decryptedFirstName || '',
        lastName: decrypted?.decryptedLastName || '',
        email: decryptedEmail,
        phone: decrypted?.decryptedPhone || '',
        createdAt: u.createdAt,
        invitedAt: u.createdAt,
        joinedAt: u.joinedAt || u.createdAt,
        origin: 'INVITED_EMAIL',
        hasPassword: !isShadow,
        isExWaitlist: false,
        totalPaid: 0,
        rawRecord: u,
      }
    })

  const uncreatedInvitedDirectory: any[] = pmTenants
    .filter((t) => {
      if (t.emailHash && invitedUserEmails.has(t.emailHash)) return false
      if (t.phoneHash && invitedUserPhones.has(t.phoneHash)) return false
      return true
    })
    .map((t) => {
      return {
        id: `inv_p_${t.id}`,
        uuid: t.uuid,
        firstName: t.firstNameEncrypted ? decrypt(t.firstNameEncrypted) : '',
        lastName: t.lastNameEncrypted ? decrypt(t.lastNameEncrypted) : '',
        email: t.emailEncrypted ? decrypt(t.emailEncrypted) : '',
        phone: t.phoneEncrypted ? decrypt(t.phoneEncrypted) : '',
        createdAt: t.createdAt,
        invitedAt: t.createdAt,
        joinedAt: null,
        origin: 'INVITED_EMAIL',
        hasPassword: false,
        isExWaitlist: false,
        totalPaid: 0,
        rawRecord: t,
      }
    })

  const finalInvitedDirectory = [...invitedUserDirectory, ...uncreatedInvitedDirectory]

  // ── FRONTEND UNIFIED USERS ASSEMBLY (Dashboard.tsx) ────────────

  // In Dashboard.tsx:
  // waitlistList.forEach -> origin = 'WAITLIST', hasPassword = false
  // signedUpList.forEach -> origin = u.origin || 'SELF_REGISTERED', hasPassword = u.hasPassword ?? true
  // invitedList.forEach  -> origin = u.origin || 'INVITED_EMAIL', hasPassword = u.hasPassword ?? false

  const unifiedUsers: any[] = []

  finalWaitlistDirectory.forEach((w) => {
    unifiedUsers.push({
      ...w,
      joinedAt: null,
      origin: 'WAITLIST',
      hasPassword: false,
    })
  })

  signedUpDirectory.forEach((u) => {
    unifiedUsers.push({
      ...u,
      origin: u.origin || 'SELF_REGISTERED',
      hasPassword: u.hasPassword ?? true,
    })
  })

  finalInvitedDirectory.forEach((i) => {
    unifiedUsers.push({
      ...i,
      origin: i.origin || 'INVITED_EMAIL',
      hasPassword: i.hasPassword ?? false,
    })
  })

  // ── FRONTEND SUBTAB FILTERING ──────────────────────────────────
  const signedUpSubtab = unifiedUsers.filter((u) => u.hasPassword)
  const guestSubtab = unifiedUsers.filter((u) => !u.hasPassword)

  // Origin breakdown for Signed Up subtab
  let waitlistCount = 0
  let selfRegisteredCount = 0
  let invitedCount = 0

  signedUpSubtab.forEach((u) => {
    if (u.origin === 'WAITLIST') waitlistCount++
    else if (u.origin === 'SELF_REGISTERED') selfRegisteredCount++
    else if (u.origin === 'INVITED_EMAIL' || u.origin === 'INVITED_PHONE') invitedCount++
  })

  // Contact Info breakdown for Signed Up subtab
  let emailOnly = 0
  let phoneOnly = 0
  let both = 0
  let neither = 0

  signedUpSubtab.forEach((u) => {
    const emailStr = u.email || ''
    const hasRealEmail = emailStr.length > 0 && !emailStr.endsWith('@upward.com')
    const hasPhone = !!u.phone

    if (hasRealEmail && !hasPhone) emailOnly++
    else if (!hasRealEmail && hasPhone) phoneOnly++
    else if (hasRealEmail && hasPhone) both++
    else neither++
  })

  console.log('====================================================')
  console.log(`📌 TOTAL UNIFIED USERS IN DASHBOARD: ${unifiedUsers.length}`)
  console.log('====================================================')
  console.log(` ├── Signed Up Subtab (hasPassword = true) : ${signedUpSubtab.length}`)
  console.log(` └── Guest Subtab / Unsynced (hasPassword = false): ${guestSubtab.length}\n`)

  console.log('====================================================')
  console.log(`🔍 SIGNED UP SUBTAB BREAKDOWN (${signedUpSubtab.length} Users)`)
  console.log('====================================================')
  console.log('📍 BY ORIGIN:')
  console.log(`   • All             : ${signedUpSubtab.length}`)
  console.log(`   • Waitlist        : ${waitlistCount}`)
  console.log(`   • Self Registered : ${selfRegisteredCount}`)
  console.log(`   • Invited         : ${invitedCount}\n`)

  console.log('📱 BY CONTACT INFO:')
  console.log(`   • All             : ${signedUpSubtab.length}`)
  console.log(`   • Email Only      : ${emailOnly}`)
  console.log(`   • Phone Only      : ${phoneOnly}`)
  console.log(`   • Both            : ${both}`)
  console.log(`   • No Contact      : ${neither}`)
  console.log('====================================================\n')
}

getDashboardStats()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
