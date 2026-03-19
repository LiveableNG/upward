/**
 * Reset confirmationSent to false for all upward_waitlist users
 * Used for email testing.
 */

const { PrismaClient } = require('@prisma/client')
const fs = require('fs')
const path = require('path')

if (!process.env.DATABASE_URL) {
  const envPath = path.resolve(__dirname, '.env')

  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8')

    envContent.split(/\r?\n/).forEach((line) => {
      const [key, ...valueParts] = line.split('=')

      if (key && valueParts.length > 0) {
        const value = valueParts
          .join('=')
          .trim()
          .replace(/^["'](.*)["']$/, '$1')

        process.env[key.trim()] = value
      }
    })
  }
}

async function resetConfirmationFlags() {
  console.log('\nStarting confirmationSent reset...\n')

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('DATABASE_URL not defined.')
    process.exit(1)
  }

  const prisma = new PrismaClient({
    datasources: {
      db: { url: databaseUrl },
    },
  })

  try {
    await prisma.$connect()
    console.log('Database connected.')

    const totalUsers = await prisma.upward_waitlist.count()
    console.log(`Total users in waitlist: ${totalUsers}`)

    const result = await prisma.upward_waitlist.updateMany({
      data: {
        confirmationSent: false,
      },
    })

    console.log(`Records updated: ${result.count}`)
    console.log('\nAll users confirmationSent reset to false.\n')
  } catch (error) {
    console.error('\nReset failed')
    console.error(error.message)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

resetConfirmationFlags()
