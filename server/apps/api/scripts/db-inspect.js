try {
  require('dotenv').config({ path: '.env' })
} catch (e) {
  // fallback: parse .env manually if dotenv is not installed
  const fs = require('fs')
  try {
    const envRaw = fs.readFileSync('.env', 'utf8')
    envRaw.split(/\r?\n/).forEach(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const idx = trimmed.indexOf('=')
      if (idx === -1) return
      const key = trimmed.slice(0, idx)
      let val = trimmed.slice(idx + 1)
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1)
      process.env[key] = val
    })
  } catch (e2) {
    // ignore
  }
}
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

const PASS_PLACEHOLDERS = ['INVITED', 'SHADOW_USER_PENDING_ONBOARDING', 'SOCIAL_AUTH_NO_PASSWORD']
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
const IV_LENGTH = parseInt(process.env.ENCRYPTION_IV_LENGTH || '16', 10)
const ALGORITHM = 'aes-256-gcm'

function tryDecrypt(val) {
  if (!val || typeof val !== 'string' || !val.includes(':')) return val
  if (!ENCRYPTION_KEY) return val
  try {
    const parts = val.split(':')
    if (parts.length !== 3) return val
    const [ivHex, authTagHex, encryptedHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const key = Buffer.from(ENCRYPTION_KEY, 'hex')
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    return val
  }
}

async function main() {
  try {
    console.log('Connecting to DB...')

    const totalUsers = await prisma.upward_user.count()

    // count real passwords (not placeholders)
    const realPwdCount = await prisma.upward_user.count({ where: { passwordHash: { notIn: PASS_PLACEHOLDERS } } })

    const placeholderCounts = {}
    for (const ph of PASS_PLACEHOLDERS) {
      placeholderCounts[ph] = await prisma.upward_user.count({ where: { passwordHash: ph } })
    }

    // users with "real" passwords (fetch a few fields)
    const usersWithPwd = await prisma.upward_user.findMany({
      where: { passwordHash: { notIn: PASS_PLACEHOLDERS } },
      select: { id: true, uuid: true, email: true, firstName: true, lastName: true, phone: true, passwordHash: true }
    })

    // distinct userIds from sequences
    const waRows = await prisma.$queryRaw`SELECT DISTINCT "userId" FROM upward_whatsapp_sequence_log`
    const emailRows = await prisma.$queryRaw`SELECT DISTINCT "userId" FROM upward_email_sequence_log`

    const waUserIds = waRows.map(r => r.userId).filter(Boolean)
    const emailUserIds = emailRows.map(r => r.userId).filter(Boolean)

    const waUsers = await prisma.upward_user.findMany({ where: { id: { in: waUserIds } }, select: { id: true, uuid: true, email: true, firstName: true, lastName: true, phone: true, isInternal: true } })
    const emailSeqUsers = await prisma.upward_user.findMany({ where: { id: { in: emailUserIds } }, select: { id: true, uuid: true, email: true, firstName: true, lastName: true, phone: true, isInternal: true } })

    // Decrypt fields if needed
    const decryptUser = (u) => ({
      id: u.id,
      uuid: u.uuid,
      email: tryDecrypt(u.email),
      firstName: tryDecrypt(u.firstName),
      lastName: tryDecrypt(u.lastName),
      phone: tryDecrypt(u.phone),
      isInternal: u.isInternal || false,
    })

    console.log('\n=== Summary ===')
    console.log('Total users in DB:', totalUsers)
    console.log('Users with real passwordHash (not placeholders):', realPwdCount)
    console.log('Placeholder password counts:', placeholderCounts)

    console.log('\nUsers on WhatsApp sequences (distinct count):', waUserIds.length)
    console.log('Users on Email sequences (distinct count):', emailUserIds.length)

    const waUsersDecrypted = waUsers.map(decryptUser)
    const emailUsersDecrypted = emailSeqUsers.map(decryptUser)

    // Compare sets
    const usersWithPwdIds = new Set(usersWithPwd.map(u => u.id))

    const waWithPwd = waUsers.filter(u => usersWithPwdIds.has(u.id)).length
    const emailWithPwd = emailSeqUsers.filter(u => usersWithPwdIds.has(u.id)).length

    console.log('\nSequence membership vs real-password users:')
    console.log(`WhatsApp sequence users who have real passwords: ${waWithPwd} / ${waUserIds.length}`)
    console.log(`Email sequence users who have real passwords: ${emailWithPwd} / ${emailUserIds.length}`)

    console.log('\n--- Sample WhatsApp sequence users ---')
    waUsersDecrypted.slice(0, 50).forEach(u => console.log(u))

    console.log('\n--- Sample Email sequence users ---')
    emailUsersDecrypted.slice(0, 50).forEach(u => console.log(u))

    // Show users that are on sequences but do NOT have real passwords
    const waNoPwd = waUsers.filter(u => !usersWithPwdIds.has(u.id))
    const emailNoPwd = emailSeqUsers.filter(u => !usersWithPwdIds.has(u.id))

    console.log('\nUsers on WhatsApp sequences without real passwords (sample up to 20):')
    waNoPwd.slice(0,20).map(decryptUser).forEach(u => console.log(u))

    console.log('\nUsers on Email sequences without real passwords (sample up to 20):')
    emailNoPwd.slice(0,20).map(decryptUser).forEach(u => console.log(u))

    await prisma.$disconnect()
  } catch (err) {
    console.error('Error during DB inspection:', err)
    await prisma.$disconnect()
    process.exit(1)
  }
}

main()
