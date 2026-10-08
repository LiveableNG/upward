const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

async function main() {
  const email = 'nwannukwus@gmail.com';
  const emailHash = crypto.createHash('sha256').update(email).digest('hex');
  
  const user = await prisma.upward_user.findFirst({
    where: {
      OR: [
        { emailHash },
        { email }
      ]
    },
    include: {
      paymentRequests: {
        orderBy: {
          createdAt: 'desc'
        }
      }
    }
  });

  if (!user) {
    console.log(`User not found with email: ${email} (Hash: ${emailHash})`);
    return;
  }

  console.log(`User: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
  console.log(`Total Payment Requests: ${user.paymentRequests.length}`);
  console.log(JSON.stringify(user.paymentRequests, null, 2));
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
