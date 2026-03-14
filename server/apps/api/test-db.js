const { PrismaClient } = require('@prisma/client')

/**
 * Script to test the database connection using Prisma and the DATABASE_URL
 * from the environment variables.
 *
 * Usage: node --env-file=.env test-db.js
 */
async function testConnection() {
  console.log('\n🚀 Starting Database Connection Test...')

  const databaseUrl = process.env.DATABASE_URL

  if (!databaseUrl) {
    console.error('❌ Error: DATABASE_URL is not defined in the environment.')
    console.log('Make sure you run this script with: node --env-file=.env test-db.js\n')
    process.exit(1)
  }

  // Mask credentials for security in logs
  const maskedUrl = databaseUrl.replace(/:([^:@]+)@/, ':****@')
  console.log(`📍 Target URL: ${maskedUrl}`)

  // Determine host and port from URL
  const urlParams = new URL(databaseUrl)
  const host = urlParams.hostname
  const port = parseInt(urlParams.port || '5432')

  console.log(`📡 Checking network connectivity to ${host}:${port}...`)

  const netCheck = await new Promise((resolve) => {
    const socket = require('net').createConnection(port, host, () => {
      socket.end()
      resolve({ success: true })
    })
    socket.setTimeout(5000)
    socket.on('timeout', () => {
      socket.destroy()
      resolve({ success: false, error: 'Connection timed out (Check Firewall/Security Groups)' })
    })
    socket.on('error', (err) => {
      resolve({ success: false, error: err.message })
    })
  })

  if (!netCheck.success) {
    console.error(`❌ Network level check failed: ${netCheck.error}`)
    console.error(
      '💡 This usually means the host is unreachable, the port is closed, or a firewall is blocking access.',
    )
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    process.exit(1)
  }

  console.log('✅ Network connectivity confirmed.')

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })

  try {
    console.log('⏳ Attempting to connect to the database...')
    await prisma.$connect()
    console.log('✅ Connection established successfully.')

    console.log('🔍 Executing test query (SELECT NOW())...')
    const result = await prisma.$queryRaw`SELECT NOW() as "currentTime"`

    console.log('✅ Test query executed successfully.')
    console.log(`⏱️  Database Current Time: ${result[0].currentTime}`)

    console.log('\n🔍 Fetching data from "upward_waitlist" table...')
    try {
      const waitlistData = await prisma.$queryRaw`SELECT * FROM "upward_waitlist" LIMIT 5`
      console.log(`✅ Successfully fetched ${waitlistData.length} records.`)
      if (waitlistData.length > 0) {
        console.table(waitlistData)
      } else {
        console.log('ℹ️  The table is currently empty.')
      }
    } catch (e) {
      console.warn('⚠️  Could not fetch from "upward_waitlist". It might not exist yet.')
      console.error(e.message)
    }

    console.log('\n✨ Database connection is healthy!\n')
  } catch (error) {
    console.error('\n❌ Connection Failed!')
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.error(`Error Code: ${error.code || 'N/A'}`)
    console.error(`Message: ${error.message}`)

    if (error.code === 'P1001') {
      console.error("\n💡 Tip: Can't reach database server. This often happens if:")
      console.error('  1. The DB server is down.')
      console.error('  2. The URL/Host is incorrect.')
      console.error('  3. A firewall or Security Group is blocking the connection (RDS).')
    } else if (error.code === 'P1000') {
      console.error('\n💡 Tip: Authentication failed. Check your database username and password.')
    }
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
