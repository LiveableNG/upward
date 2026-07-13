import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = 'ayeleru1234@gmail.com'
  
  try {
    const updated = await prisma.upward_admin.update({
      where: { email },
      data: { role: 'DEVELOPER' },
    })
    
    console.log('Successfully updated admin role to DEVELOPER:')
    console.log(updated)
  } catch (error) {
    console.error('Error updating admin:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
