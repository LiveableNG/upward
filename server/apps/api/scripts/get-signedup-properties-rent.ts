import { PrismaClient } from '@prisma/client'
import { createDecipheriv } from 'crypto'

const prisma = new PrismaClient()

function decrypt(ciphertext: string): string {
  if (!ciphertext) return ''
  if (!ciphertext.includes(':')) return ciphertext
  try {
    const hexKey = process.env.ENCRYPTION_KEY || '4a8fb008ac99a75788a473c7029bdf5b5b2a198c8dbc873b3efa637d08abfca8'
    const key = Buffer.from(hexKey, 'hex')
    const parts = ciphertext.split(':')
    if (parts.length !== 3) return ciphertext
    const [ivHex, authTagHex, encryptedHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const decipher = createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
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

async function getSignedUpPropertyStats() {
  console.log('\n📊 FETCHING SIGNED UP USERS (hasPassword = true) & PROPERTY RENT DETAILS...\n')

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
        properties: {
          select: {
            id: true,
            uuid: true,
            rentAmount: true,
            currency: true,
            rentType: true,
            rentStartDate: true,
            rentEndDate: true,
            isVerified: true,
            location: {
              select: {
                address: true,
                area: true,
                state: true,
              },
            },
          },
        },
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

  // SignedUp Directory
  const signedUpDirectory: any[] = mergedUsers
    .filter((u) => !u.isFromInvite)
    .map((u) => {
      const decrypted = userMap.get(u.emailHash)
      const decryptedEmail = decrypted?.decryptedEmail || ''
      const isWaitlist = u.isFromWaitlist || waitlistEmails.has(decryptedEmail.toLowerCase())
      const origin = isWaitlist ? 'WAITLIST' : 'SELF_REGISTERED'

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
        userId: u.id,
        uuid: u.uuid,
        firstName: decrypted?.decryptedFirstName || '',
        lastName: decrypted?.decryptedLastName || '',
        email: decryptedEmail,
        phone: decrypted?.decryptedPhone || '',
        createdAt: u.createdAt,
        joinedAt: u.joinedAt || u.createdAt,
        origin,
        hasPassword: !isShadow,
        properties: u.properties,
      }
    })

  // Invited Directory
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
        userId: u.id,
        uuid: u.uuid,
        firstName: decrypted?.decryptedFirstName || '',
        lastName: decrypted?.decryptedLastName || '',
        email: decryptedEmail,
        phone: decrypted?.decryptedPhone || '',
        createdAt: u.createdAt,
        joinedAt: u.joinedAt || u.createdAt,
        origin: 'INVITED_EMAIL',
        hasPassword: !isShadow,
        properties: u.properties,
      }
    })

  const unifiedUsers: any[] = []

  allWaitlistEntries.forEach((w) => {
    if (!allUserEmailHashes.has(w.emailHash)) {
      unifiedUsers.push({
        id: `wl_${w.id}`,
        userId: null,
        email: w.email,
        firstName: w.firstName ? decrypt(w.firstName) : '',
        lastName: w.lastName ? decrypt(w.lastName) : '',
        hasPassword: false,
        properties: [],
      })
    }
  })

  signedUpDirectory.forEach((u) => {
    unifiedUsers.push(u)
  })

  invitedUserDirectory.forEach((i) => {
    unifiedUsers.push(i)
  })

  const signedUpSubtabUsers = unifiedUsers.filter((u) => u.hasPassword)

  console.log(`FOUND ${signedUpSubtabUsers.length} USERS IN "Signed Up Subtab (hasPassword = true)"\n`)

  let cumulativeRentTotal = 0
  let usersWithPropertiesCount = 0
  let totalPropertiesCount = 0

  const userRentDetails: any[] = []

  signedUpSubtabUsers.forEach((u, idx) => {
    const userProperties = u.properties || []
    let userTotalRent = 0

    if (userProperties.length > 0) {
      usersWithPropertiesCount++
      totalPropertiesCount += userProperties.length
    }

    const propDetails = userProperties.map((p: any) => {
      userTotalRent += p.rentAmount
      cumulativeRentTotal += p.rentAmount
      return {
        propertyId: p.id,
        propertyUuid: p.uuid,
        rentAmount: p.rentAmount,
        currency: p.currency,
        rentType: p.rentType,
        isVerified: p.isVerified,
        address: p.location ? `${p.location.address || ''}, ${p.location.area || ''}, ${p.location.state || ''}`.replace(/^, |, $/g, '') : 'N/A',
      }
    })

    userRentDetails.push({
      index: idx + 1,
      userId: u.userId,
      name: `${u.firstName} ${u.lastName}`.trim() || 'N/A',
      email: u.email,
      phone: u.phone,
      origin: u.origin,
      propertiesCount: userProperties.length,
      userTotalRent,
      properties: propDetails,
    })
  })

  console.log('====================================================================================================')
  console.log('LIST OF ALL 96 SIGNED UP SUBTAB USERS WITH THEIR LINKED PROPERTIES & RENT AMOUNTS:')
  console.log('====================================================================================================')

  userRentDetails.forEach((u) => {
    console.log(`#${u.index} | User ID: ${u.userId} | Name: ${u.name} | Email: ${u.email} | Origin: ${u.origin}`)
    if (u.propertiesCount === 0) {
      console.log('   └── ❌ No linked user_property records')
    } else {
      console.log(`   ├── 🏠 Properties Linked (${u.propertiesCount}):`)
      u.properties.forEach((p: any, i: number) => {
        console.log(`       [Property ${i + 1}] ID: ${p.propertyId} | Rent: ₦${p.rentAmount.toLocaleString()} (${p.rentType}) | Verified: ${p.isVerified} | Address: ${p.address}`)
      })
      console.log(`   └── 💰 Total Rent for User: ₦${u.userTotalRent.toLocaleString()}`)
    }
    console.log('----------------------------------------------------------------------------------------------------')
  })

  console.log('\n====================================================================================================')
  console.log('📊 SUMMARY STATS FOR SIGNED UP SUBTAB (hasPassword = true):')
  console.log('====================================================================================================')
  console.log(` • Total Users in Signed Up Subtab : ${signedUpSubtabUsers.length}`)
  console.log(` • Users with Linked Property      : ${usersWithPropertiesCount}`)
  console.log(` • Users without Linked Property   : ${signedUpSubtabUsers.length - usersWithPropertiesCount}`)
  console.log(` • Total Linked Properties Count   : ${totalPropertiesCount}`)
  console.log(` • Cumulative Total Rent Amount    : ₦${cumulativeRentTotal.toLocaleString()} (${cumulativeRentTotal})`)
  console.log('====================================================================================================\n')
}

getSignedUpPropertyStats()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
