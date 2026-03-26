import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('Usage: npx tsx scripts/create-admin-row.ts <email> <password>')
    process.exit(1)
  }

  const [email, password] = args
  const hashedPassword = await bcrypt.hash(password, 10)

  try {
    const admin = await prisma.upward_admin.upsert({
      where: { email },
      update: {
        passwordHash: hashedPassword,
        role: 'SUPERADMIN',
      },
      create: {
        email,
        passwordHash: hashedPassword,
        role: 'SUPERADMIN',
      },
    })

    console.log('--- Admin User Upserted Successfully ---')
    console.log(`Email: ${admin.email}`)
    console.log(`Role: ${admin.role}`)
    console.log('---------------------------------------')
  } catch (error) {
    console.error('Failed to create admin:', error)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
