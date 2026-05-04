import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  
  const user = {
    email: 'baldwinjames9872@gmail.com',
    firstName: 'Baldwin',
    lastName: 'James',
    phone: '+2348035329792',
    acceptTerms: true,
  };

  try {
    console.log(`Attempting to add ${user.email} to the waitlist...`);
    
    const result = await prisma.upward_waitlist.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
      },
      create: user,
    });

    console.log('Successfully added/updated user in waitlist:');
    console.log(result);
  } catch (error) {
    console.error('Error adding user to waitlist:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
