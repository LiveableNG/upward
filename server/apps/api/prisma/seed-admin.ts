import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'
// import { AdminRole } from '../common/shared-types/src/admin.types';

const prisma = new PrismaClient()

async function main() {
  const email = 'abdulsalam.ayeleru@goodtenants.africa'
  const password = 'Oluwaseun123'
  const hashedPassword = await bcrypt.hash(password, 10)

  const admin = await prisma.upward_admin.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash: hashedPassword,
      role: 'SUPERADMIN',
    },
  })

  console.log('--- Initial Superadmin Created ---')
  console.log(`Email: ${admin.email}`)
  console.log(`Password: ${password}`)
  console.log('---------------------------------')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
