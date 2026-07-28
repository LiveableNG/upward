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
  } catch (e2) {
    // ignore if .env cannot be loaded
  }
}

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const EMAIL_SEQUENCE_SCHEDULE = [
  { stage: 'DAY_2', daysOffset: 2, templateName: 'DAY_2_EMAIL' },
  { stage: 'DAY_5', daysOffset: 5, templateName: 'DAY_5_EMAIL' },
  { stage: 'DAY_9', daysOffset: 9, templateName: 'DAY_9_EMAIL' },
  { stage: 'DAY_14', daysOffset: 14, templateName: 'DAY_14_EMAIL' },
]

function parseArgs() {
  const args = process.argv.slice(2)
  const flags = {}

  args.forEach((arg) => {
    if (arg.startsWith('--')) {
      const [key, value] = arg.split('=')
      flags[key.replace('--', '')] = typeof value === 'undefined' ? true : value
    }
  })

  if (!flags.createdAfter && !flags.userIds) {
    throw new Error('Must provide either --createdAfter=YYYY-MM-DD or --userIds=1,2,3')
  }

  const userIds = flags.userIds ? flags.userIds.split(',').map((id) => parseInt(id, 10)).filter(Boolean) : []
  const createdAfter = flags.createdAfter ? new Date(flags.createdAfter) : null
  const createdBefore = flags.createdBefore ? new Date(flags.createdBefore) : null
  const preserveSent = flags.preserveSent === 'true' || flags.preserveSent === true
  const fresh = flags.fresh === 'true' || flags.fresh === true
  const commit = flags.commit === 'true' || flags.commit === true

  return {
    userIds,
    createdAfter,
    createdBefore,
    preserveSent,
    fresh,
    commit,
  }
}

function log(...parts) {
  console.log(...parts)
}

function buildUserWhereClause({ userIds, createdAfter, createdBefore }) {
  const where = {}
  if (userIds.length > 0) {
    where.id = { in: userIds }
  }
  if (createdAfter) {
    where.createdAt = { gt: createdAfter }
  }
  if (createdBefore) {
    where.createdAt = { ...(where.createdAt || {}), lt: createdBefore }
  }
  return where
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ''

function getFutureDate(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  if (days > 0) {
    date.setHours(8, 0, 0, 0)
  }
  return date
}

function tryDecrypt(value) {
  if (!value || typeof value !== 'string' || !value.includes(':')) return value
  if (!ENCRYPTION_KEY) return value
  try {
    const parts = value.split(':')
    if (parts.length !== 3) return value
    const [ivHex, authTagHex, encryptedHex] = parts
    const iv = Buffer.from(ivHex, 'hex')
    const authTag = Buffer.from(authTagHex, 'hex')
    const key = Buffer.from(ENCRYPTION_KEY, 'hex')
    const decipher = require('crypto').createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(authTag)
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    return decrypted
  } catch (err) {
    return value
  }
}

async function fetchTargetUsers(where) {
  return prisma.upward_user.findMany({
    where,
    select: {
      id: true,
      uuid: true,
      email: true,
      phone: true,
      isInternal: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'asc' },
  })
}

async function fetchSequenceCounts(userIds) {
  const emailCount = await prisma.upward_email_sequence_log.count({
    where: { userId: { in: userIds } },
  })
  const whatsappCount = await prisma.upward_whatsapp_sequence_log.count({
    where: { userId: { in: userIds } },
  })
  return { emailCount, whatsappCount }
}

async function fetchSequenceBreakdown(userIds) {
  const emailGroups = await prisma.upward_email_sequence_log.groupBy({
    by: ['stage', 'status'],
    where: { userId: { in: userIds } },
    _count: { id: true },
  })
  const whatsappGroups = await prisma.upward_whatsapp_sequence_log.groupBy({
    by: ['stage', 'status'],
    where: { userId: { in: userIds } },
    _count: { id: true },
  })

  const emailStageCounts = {}
  const emailStatusCounts = {}
  for (const item of emailGroups) {
    emailStageCounts[item.stage] = (emailStageCounts[item.stage] || 0) + item._count.id
    emailStatusCounts[item.status] = (emailStatusCounts[item.status] || 0) + item._count.id
  }

  const whatsappStageCounts = {}
  const whatsappStatusCounts = {}
  for (const item of whatsappGroups) {
    whatsappStageCounts[item.stage] = (whatsappStageCounts[item.stage] || 0) + item._count.id
    whatsappStatusCounts[item.status] = (whatsappStatusCounts[item.status] || 0) + item._count.id
  }

  return { emailStageCounts, emailStatusCounts, whatsappStageCounts, whatsappStatusCounts }
}

function isPhoneOnlyEmail(email) {
  return typeof email === 'string' && email.toLowerCase().endsWith('@upward.com')
}

async function deleteSequenceLogs(userIds, preserveSent) {
  const emailWhere = { userId: { in: userIds } }
  const whatsappWhere = { userId: { in: userIds } }

  if (preserveSent) {
    emailWhere.status = { not: 'SENT' }
    whatsappWhere.status = { not: 'SENT' }
  }

  const deletedEmail = await prisma.upward_email_sequence_log.deleteMany({ where: emailWhere })
  const deletedWhatsapp = await prisma.upward_whatsapp_sequence_log.deleteMany({ where: whatsappWhere })

  return { deletedEmail: deletedEmail.count, deletedWhatsapp: deletedWhatsapp.count }
}

async function createEmailSequencesForUser(user) {
  const now = new Date()
  const userEmail = user.email || ''
  if (!userEmail || isPhoneOnlyEmail(userEmail)) return []
  if (!!user.phone) return []

  return EMAIL_SEQUENCE_SCHEDULE.map((item) => ({
    userId: user.id,
    email: userEmail,
    stage: item.stage,
    status: 'PENDING',
    scheduledFor: getFutureDate(item.daysOffset),
    templateName: item.templateName,
    templateData: {},
  }))
}

async function createWhatsappSequencesForUser(user) {
  if (user.isInternal) return []
  if (!user.phone) return []

  const firstName = ''
  return [
    { stage: 'DAY_2', templateName: 'upward_seq_day2_v2', scheduledFor: getFutureDate(2), templateData: { body_text: [[firstName]] }},
    { stage: 'DAY_5', templateName: 'upward_seq_day5_v2', scheduledFor: getFutureDate(5), templateData: { body_text: [[firstName]] }},
    { stage: 'DAY_9', templateName: 'upward_seq_day9_v2', scheduledFor: getFutureDate(9), templateData: { body_text: [[firstName]] }},
    { stage: 'DAY_14', templateName: 'upward_seq_day14_v2', scheduledFor: getFutureDate(14), templateData: { body_text: [[firstName]] }},
  ].map((item) => ({
    userId: user.id,
    phoneEncrypted: user.phone,
    phoneHash: null,
    stage: item.stage,
    status: 'PENDING',
    scheduledFor: item.scheduledFor,
    templateName: item.templateName,
    templateData: item.templateData,
  }))
}

async function main() {
  try {
    const { userIds, createdAfter, createdBefore, preserveSent, fresh, commit } = parseArgs()
    const where = buildUserWhereClause({ userIds, createdAfter, createdBefore })
    const users = await fetchTargetUsers(where)

    if (users.length === 0) {
      log('No users found for the provided filter. Exiting.')
      process.exit(0)
    }

    const selectedUserIds = users.map((user) => user.id)
    const counts = await fetchSequenceCounts(selectedUserIds)
    const breakdown = await fetchSequenceBreakdown(selectedUserIds)

    log('=== Reset New Signup Sequence Script ===')
    log(`Target users: ${users.length}`)
    log(`Existing email sequence rows: ${counts.emailCount}`)
    log(`Existing whatsapp sequence rows: ${counts.whatsappCount}`)
    log('Email stage breakdown:', JSON.stringify(breakdown.emailStageCounts, null, 2))
    log('Email status breakdown:', JSON.stringify(breakdown.emailStatusCounts, null, 2))
    log('WhatsApp stage breakdown:', JSON.stringify(breakdown.whatsappStageCounts, null, 2))
    log('WhatsApp status breakdown:', JSON.stringify(breakdown.whatsappStatusCounts, null, 2))
    log(`Options: commit=${commit}, fresh=${fresh}, preserveSent=${preserveSent}`)
    log('')

    users.slice(0, 20).forEach((user) => {
      const decryptedEmail = tryDecrypt(user.email)
      const decryptedPhone = user.phone && user.phone.includes(':') ? tryDecrypt(user.phone) : user.phone
      log(`  id=${user.id} createdAt=${user.createdAt.toISOString()} email=${decryptedEmail} phone=${decryptedPhone ? '[set]' : 'null'} internal=${user.isInternal}`)
    })
    if (users.length > 20) {
      log(`  ...and ${users.length - 20} more users`)
    }

    if (!commit) {
      log('\nDry run only. No changes made. Rerun with --commit to apply cleanup/rebuild.')
      return
    }

    const deleted = await deleteSequenceLogs(selectedUserIds, preserveSent)
    log(`\nDeleted ${deleted.deletedEmail} email sequence rows and ${deleted.deletedWhatsapp} whatsapp sequence rows.`)

    if (fresh) {
      const emailCreateData = []
      const whatsappCreateData = []

      for (const user of users) {
        if (user.isInternal) continue
        if (user.phone) {
          whatsappCreateData.push(...await createWhatsappSequencesForUser(user))
        } else {
          emailCreateData.push(...await createEmailSequencesForUser(user))
        }
      }

      if (emailCreateData.length > 0) {
        await prisma.upward_email_sequence_log.createMany({ data: emailCreateData })
      }
      if (whatsappCreateData.length > 0) {
        await prisma.upward_whatsapp_sequence_log.createMany({ data: whatsappCreateData })
      }

      log(`Created ${emailCreateData.length} fresh email sequence rows and ${whatsappCreateData.length} fresh whatsapp sequence rows.`)
    }

    log('Done.')
    log('Manual sends can still be performed through UnifiedCommunicationService without sequence enrollment.')
  } catch (error) {
    console.error('Error:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
