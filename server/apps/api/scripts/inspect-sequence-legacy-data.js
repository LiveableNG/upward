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

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || ''
const ENCRYPTION_IV_LENGTH = parseInt(process.env.ENCRYPTION_IV_LENGTH || '16', 10)
const STATUS_PRIORITY = {
  SENT: 3,
  FAILED: 2,
  PENDING: 1,
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

function parseArgs() {
  const args = process.argv.slice(2)
  return {
    commit: args.includes('--commit'),
  }
}

function statusPriority(status) {
  return STATUS_PRIORITY[status] || 0
}

function chooseRowToKeep(rows) {
  return rows
    .slice()
    .sort((a, b) => {
      const statusDiff = statusPriority(b.status) - statusPriority(a.status)
      if (statusDiff !== 0) return statusDiff
      const createdAtA = new Date(a.createdAt).getTime()
      const createdAtB = new Date(b.createdAt).getTime()
      if (createdAtA !== createdAtB) return createdAtA - createdAtB
      return a.id - b.id
    })[0]
}

function formatDate(value) {
  if (!value) return null
  return new Date(value).toISOString()
}

async function findDuplicateGroups(tableName) {
  const query = `
    SELECT "userId", "stage", COUNT(*) AS count
    FROM ${tableName}
    GROUP BY "userId", "stage"
    HAVING COUNT(*) > 1
    ORDER BY COUNT(*) DESC, "userId", "stage"
  `
  return await prisma.$queryRawUnsafe(query)
}

async function getEmailSequenceRowsForDuplicate(group) {
  return prisma.upward_email_sequence_log.findMany({
    where: {
      userId: group.userId,
      stage: group.stage,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
}

async function getWhatsappSequenceRowsForDuplicate(group) {
  return prisma.upward_whatsapp_sequence_log.findMany({
    where: {
      userId: group.userId,
      stage: group.stage,
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
}

async function findInvalidEmailSequenceRows() {
  return prisma.upward_email_sequence_log.findMany({
    where: {
      OR: [
        { user: { isInternal: true } },
        { email: { endsWith: '@upward.com' } },
        { user: { phone: { not: null } } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          isInternal: true,
        },
      },
    },
    orderBy: [{ userId: 'asc' }, { stage: 'asc' }, { createdAt: 'asc' }],
  })
}

async function findInvalidWhatsappSequenceRows() {
  return prisma.upward_whatsapp_sequence_log.findMany({
    where: {
      OR: [
        { user: { isInternal: true } },
        { user: { phone: null } },
      ],
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          phone: true,
          isInternal: true,
        },
      },
    },
    orderBy: [{ userId: 'asc' }, { stage: 'asc' }, { createdAt: 'asc' }],
  })
}

function buildInvalidRowReason(row, channel) {
  const parts = []
  if (row.user?.isInternal) {
    parts.push('user is internal')
  }
  if (channel === 'EMAIL') {
    if ((row.email || '').toLowerCase().endsWith('@upward.com')) {
      parts.push('upward.com email')
    }
    if (row.user?.phone) {
      parts.push('user has phone')
    }
  }
  if (channel === 'WHATSAPP') {
    if (!row.user?.phone) {
      parts.push('user has no phone')
    }
  }
  if (parts.length === 0) {
    parts.push('legacy sequence eligibility mismatch')
  }
  return `Legacy sequence cleanup: ${parts.join(', ')}`
}

async function main() {
  const { commit } = parseArgs()
  console.log('=== Sequence legacy data inspector ===')
  console.log(commit ? 'COMMIT mode: changes will be applied.' : 'DRY RUN mode: no changes will be written.')
  console.log('Run with --commit to apply deletions and updates.\n')

  try {
    const [emailDuplicateGroups, whatsappDuplicateGroups] = await Promise.all([
      findDuplicateGroups('upward_email_sequence_log'),
      findDuplicateGroups('upward_whatsapp_sequence_log'),
    ])

    const emailInvalidRows = await findInvalidEmailSequenceRows()
    const whatsappInvalidRows = await findInvalidWhatsappSequenceRows()

    console.log('Summary:')
    console.log(`  email sequence rows with duplicate userId+stage groups: ${emailDuplicateGroups.length}`)
    console.log(`  whatsapp sequence rows with duplicate userId+stage groups: ${whatsappDuplicateGroups.length}`)
    console.log(`  invalid email sequence rows (internal/@upward.com/has-phone): ${emailInvalidRows.length}`)
    console.log(`  invalid whatsapp sequence rows (internal/no-phone): ${whatsappInvalidRows.length}`)

    const emailDuplicateRows = []
    for (const group of emailDuplicateGroups) {
      const rows = await getEmailSequenceRowsForDuplicate(group)
      const keep = chooseRowToKeep(rows)
      const remove = rows.filter(row => row.id !== keep.id)
      emailDuplicateRows.push({ group, keep, remove })
    }

    const whatsappDuplicateRows = []
    for (const group of whatsappDuplicateGroups) {
      const rows = await getWhatsappSequenceRowsForDuplicate(group)
      const keep = chooseRowToKeep(rows)
      const remove = rows.filter(row => row.id !== keep.id)
      whatsappDuplicateRows.push({ group, keep, remove })
    }

    const emailDuplicateCount = emailDuplicateRows.reduce((sum, item) => sum + item.remove.length, 0)
    const whatsappDuplicateCount = whatsappDuplicateRows.reduce((sum, item) => sum + item.remove.length, 0)

    console.log(`  email duplicate rows to remove: ${emailDuplicateCount}`)
    console.log(`  whatsapp duplicate rows to remove: ${whatsappDuplicateCount}\n`)

    if (emailDuplicateRows.length > 0) {
      console.log('Sample email duplicate groups:')
      emailDuplicateRows.slice(0, 10).forEach(item => {
        console.log(`  userId=${item.group.userId} stage=${item.group.stage} total=${item.group.count}`)
      })
      console.log('')
    }
    if (whatsappDuplicateRows.length > 0) {
      console.log('Sample whatsapp duplicate groups:')
      whatsappDuplicateRows.slice(0, 10).forEach(item => {
        console.log(`  userId=${item.group.userId} stage=${item.group.stage} total=${item.group.count}`)
      })
      console.log('')
    }

    if (emailInvalidRows.length > 0) {
      console.log('Sample invalid email sequence rows:')
      emailInvalidRows.slice(0, 10).forEach(row => {
        const decryptedEmail = tryDecrypt(row.email)
        const decryptedPhone = row.user?.phone ? tryDecrypt(row.user.phone) : null
        console.log(`  id=${row.id} userId=${row.userId} stage=${row.stage} status=${row.status} email=${decryptedEmail} internal=${row.user?.isInternal} phone=${decryptedPhone || '[set]'} createdAt=${formatDate(row.createdAt)}`)
      })
      console.log('')
    }
    if (whatsappInvalidRows.length > 0) {
      console.log('Sample invalid whatsapp sequence rows:')
      whatsappInvalidRows.slice(0, 10).forEach(row => {
        const decryptedPhone = row.user?.phone ? tryDecrypt(row.user.phone) : null
        console.log(`  id=${row.id} userId=${row.userId} stage=${row.stage} status=${row.status} internal=${row.user?.isInternal} phone=${decryptedPhone || '[set]'} createdAt=${formatDate(row.createdAt)}`)
      })
      console.log('')
    }

    if (!commit) {
      console.log('No database changes were made. Re-run with --commit to apply cleanup actions.')
      return
    }

    console.log('Applying cleanup actions...')

    const emailDeleteIds = emailDuplicateRows.flatMap(item => item.remove.map(row => row.id))
    const whatsappDeleteIds = whatsappDuplicateRows.flatMap(item => item.remove.map(row => row.id))

    if (emailDeleteIds.length > 0) {
      await prisma.upward_email_sequence_log.deleteMany({
        where: { id: { in: emailDeleteIds } },
      })
      console.log(`Deleted ${emailDeleteIds.length} duplicate email sequence rows.`)
    }

    if (whatsappDeleteIds.length > 0) {
      await prisma.upward_whatsapp_sequence_log.deleteMany({
        where: { id: { in: whatsappDeleteIds } },
      })
      console.log(`Deleted ${whatsappDeleteIds.length} duplicate whatsapp sequence rows.`)
    }

    const emailUpdates = []
    for (const row of emailInvalidRows) {
      if (row.status === 'SENT') continue
      const reason = buildInvalidRowReason(row, 'EMAIL')
      const update = prisma.upward_email_sequence_log.update({
        where: { id: row.id },
        data: {
          status: 'FAILED',
          errorReason: reason,
        },
      })
      emailUpdates.push(update)
    }

    const whatsappUpdates = []
    for (const row of whatsappInvalidRows) {
      if (row.status === 'SENT') continue
      const reason = buildInvalidRowReason(row, 'WHATSAPP')
      const update = prisma.upward_whatsapp_sequence_log.update({
        where: { id: row.id },
        data: {
          status: 'FAILED',
          errorReason: reason,
        },
      })
      whatsappUpdates.push(update)
    }

    if (emailUpdates.length > 0) {
      await prisma.$transaction(emailUpdates)
      console.log(`Updated ${emailUpdates.length} invalid email sequence rows to FAILED.`)
    }

    if (whatsappUpdates.length > 0) {
      await prisma.$transaction(whatsappUpdates)
      console.log(`Updated ${whatsappUpdates.length} invalid whatsapp sequence rows to FAILED.`)
    }

    console.log('Cleanup complete.')
  } catch (error) {
    console.error('Error running sequence legacy inspector:', error)
    process.exitCode = 1
  } finally {
    await prisma.$disconnect()
  }
}

main()
