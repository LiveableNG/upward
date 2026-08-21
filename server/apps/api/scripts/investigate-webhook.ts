import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkExternalUnitId() {
  console.log('=== CHECKING EXTERNAL UNIT ID & PROPERTY DETAILS ===\n');

  const ref = '000023260814222612004223684880';
  
  const tx = await prisma.upward_transaction.findFirst({
    where: { reference: ref },
    include: {
      user: {
        include: {
          properties: true
        }
      },
      paymentRequest: {
        include: {
          userProperty: {
            include: {
              company: true
            }
          }
        }
      }
    }
  });

  if (!tx) {
    console.error('Transaction not found');
    return;
  }

  console.log(`Transaction ID: ${tx.id}, User ID: ${tx.userId}`);
  console.log(`User Email: ${tx.user ? tx.user.email : 'N/A'}`);
  
  if (tx.paymentRequest) {
    const pr = tx.paymentRequest;
    console.log(`\n--- Payment Request Details ---`);
    console.log(`PR ID: ${pr.id}, UUID: ${pr.uuid}`);
    console.log(`PR UserProperty ID: ${pr.userPropertyId}`);
    
    if (pr.userProperty) {
      const up = pr.userProperty;
      console.log(`\n--- User Property Details ---`);
      console.log(`Property ID: ${up.id}, UUID: ${up.uuid}`);
      console.log(`Property platformId: ${up.platformId}`);
      console.log(`Property externalUnitId: ${up.externalUnitId}`);
      console.log(`Property externalPropertyId: ${up.externalPropertyId}`);
      console.log(`Company ID: ${up.companyId}, Company platformId: ${up.company?.platformId}`);
    }
  }

  if (tx.user && tx.user.properties) {
    console.log(`\n--- All Properties for User ${tx.userId} ---`);
    tx.user.properties.forEach((p) => {
      console.log(` - Property ID: ${p.id}, platformId: ${p.platformId}, externalUnitId: '${p.externalUnitId}', externalPropertyId: '${p.externalPropertyId}'`);
    });
  }

  await prisma.$disconnect();
}

checkExternalUnitId().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
