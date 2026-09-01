try {
  require('dotenv').config({ path: '.env' })
} catch (e) {
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
  } catch (e2) {}
}

const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY
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

async function inspectTenantAndUser() {
  try {
    console.log('=== DB Inspection for Sarah Williams & Recent Tenants ===\n')

    // 1. Search in upward_pm_tenant for "Sarah" or phone ending with "7889"
    const tenants = await prisma.upward_pm_tenant.findMany({
      orderBy: { id: 'desc' },
      take: 20,
    })

    console.log('--- Recent upward_pm_tenant Records (PM Tenant Table) ---')
    tenants.forEach(t => {
      const firstName = tryDecrypt(t.firstNameEncrypted)
      const lastName = tryDecrypt(t.lastNameEncrypted)
      const email = tryDecrypt(t.emailEncrypted)
      const phone = tryDecrypt(t.phoneEncrypted)

      if (
        (firstName && firstName.toLowerCase().includes('sarah')) ||
        (phone && phone.includes('7889'))
      ) {
        console.log(`[pm_tenant id=${t.id}] name="${firstName} ${lastName}", email="${email}", phone="${phone}", inviteStatus="${t.inviteStatus}"`)
      }
    })

    // 2. Search in upward_user for "Sarah" or phone ending with "7889"
    const users = await prisma.upward_user.findMany({
      orderBy: { id: 'desc' },
      take: 50,
    })

    console.log('\n--- Matching upward_user Records (Global User Account Table) ---')
    users.forEach(u => {
      const firstName = tryDecrypt(u.firstName)
      const lastName = tryDecrypt(u.lastName)
      const email = tryDecrypt(u.email)
      const phone = tryDecrypt(u.phone)

      if (
        (firstName && firstName.toLowerCase().includes('sarah')) ||
        (phone && phone.includes('7889')) ||
        (email && email.includes('sarah'))
      ) {
        console.log(`[upward_user id=${u.id}] name="${firstName} ${lastName}", email="${email}", phone="${phone}", pwdHash="${u.passwordHash}"`)
      }
    })

    await prisma.$disconnect()
  } catch (err) {
    console.error('Error during DB inspection:', err)
    await prisma.$disconnect()
    process.exit(1)
  }
}

inspectTenantAndUser()
