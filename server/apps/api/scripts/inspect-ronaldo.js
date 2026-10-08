const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const prisma = new PrismaClient();

const hexKey = process.env.ENCRYPTION_KEY || 'd7f3e2a1b0c9d8e7f6a5b4c3d2e1f0a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8';
const key = Buffer.from(hexKey, 'hex');

function decrypt(encryptedText) {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return encryptedText;
  }
}

function hash(text) {
  if (!text) return text;
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}

async function main() {
  const emailHash = hash('ronaldo@gmail.com');
  const user = await prisma.upward_user.findFirst({
    where: { emailHash },
    include: {
      properties: true,
      transactions: {
        orderBy: { createdAt: 'desc' }
      },
      paymentRequests: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!user) {
    console.log('User ronaldo@gmail.com not found');
    return;
  }

  console.log('=== USER ===');
  console.log('ID:', user.id);
  console.log('Email:', decrypt(user.email));

  console.log('\n=== PROPERTIES ===');
  user.properties.forEach(p => {
    console.log(`Prop ID: ${p.id}, pmUnitId: ${p.pmUnitId}, rentAmount: ${p.rentAmount}, rentStartDate: ${p.rentStartDate}, rentEndDate: ${p.rentEndDate}`);
  });

  console.log('\n=== PAYMENT REQUESTS ===');
  user.paymentRequests.forEach(pr => {
    console.log(`PR ID: ${pr.id}, UUID: ${pr.uuid}, amount: ${pr.amount}, rentStartDate: ${pr.rentStartDate}, rentEndDate: ${pr.rentEndDate}, status: ${pr.status}`);
  });

  console.log('\n=== TRANSACTIONS ===');
  user.transactions.forEach(t => {
    console.log(`Tx ID: ${t.id}, reference: ${t.reference}, amount: ${t.amount}, status: ${t.status}, paymentRequestId: ${t.paymentRequestId}`);
  });

  // PM unit rent payments
  for (const p of user.properties) {
    if (p.pmUnitId) {
      const pmPayments = await prisma.upward_pm_rent_payment.findMany({
        where: { unitId: p.pmUnitId },
        orderBy: { paymentDate: 'desc' }
      });
      console.log(`\n=== PM RENT PAYMENTS for unit ${p.pmUnitId} ===`);
      pmPayments.forEach(pmPay => {
        console.log(`Payment ID: ${pmPay.id}, amount: ${pmPay.amount}, periodStart: ${pmPay.periodStart}, periodEnd: ${pmPay.periodEnd}, status: ${pmPay.status}, paymentDate: ${pmPay.paymentDate}`);
      });
    }
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
