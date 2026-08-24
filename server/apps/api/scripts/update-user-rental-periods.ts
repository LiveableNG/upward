import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../server/apps/api/.env') });

const prisma = new PrismaClient();

function hash(text: string): string {
  if (!text) return text;
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}

const targets = [
  { name: 'Esther Awulika Chukwudi', email: 'emenikeesther22@gmail.com', newStart: new Date('2026-09-18T00:00:00.000Z'), newEnd: new Date('2027-09-18T00:00:00.000Z') },
  { name: 'Ozioma Oluebube', email: 'ojimaduebube@gmail.com', newStart: new Date('2026-08-01T00:00:00.000Z'), newEnd: new Date('2027-08-01T00:00:00.000Z') },
  { name: 'Olanrewaju Shobande', email: 'smartchoice14@yahoo.com', newStart: new Date('2026-10-01T00:00:00.000Z'), newEnd: new Date('2027-09-30T00:00:00.000Z') },
  { name: 'Delight Nwaejike', email: 'delightnwaejike@gmail.com', newStart: new Date('2026-07-17T00:00:00.000Z'), newEnd: new Date('2027-07-17T00:00:00.000Z') },
  { name: 'Oluwaseun', email: 'oluwaseunisaacs@gmail.com', newStart: new Date('2026-07-01T00:00:00.000Z'), newEnd: new Date('2027-07-01T00:00:00.000Z') },
  { name: 'Stephanie Nwannukwu', email: 'nwannukwus@gmail.com', newStart: new Date('2026-07-01T00:00:00.000Z'), newEnd: new Date('2027-07-01T00:00:00.000Z') },
];

async function updateRecords() {
  console.log('\n--- UPDATING USER RENTAL PERIODS & RECEIPTS IN DB ---\n');

  for (const t of targets) {
    const emailH = hash(t.email);
    const user = await prisma.upward_user.findUnique({
      where: { emailHash: emailH },
      include: {
        properties: true,
        paymentRequests: true,
      },
    });

    console.log(`Target: ${t.name} <${t.email}>`);

    if (!user) {
      console.log(`❌ User not found.\n-----------------------------------`);
      continue;
    }

    // 1. Update User Properties
    for (const prop of user.properties) {
      await prisma.upward_user_property.update({
        where: { id: prop.id },
        data: {
          rentStartDate: t.newStart,
          rentEndDate: t.newEnd,
        },
      });
      console.log(`  ✅ Updated Property ID #${prop.id} rentStartDate -> ${t.newStart.toISOString().split('T')[0]}, rentEndDate -> ${t.newEnd.toISOString().split('T')[0]}`);

      // If tied to PM unit, update pm_rent_payment period
      if (prop.pmUnitId) {
        const updatedPmPayments = await prisma.upward_pm_rent_payment.updateMany({
          where: { unitId: prop.pmUnitId },
          data: {
            periodStart: t.newStart,
            periodEnd: t.newEnd,
          },
        });
        if (updatedPmPayments.count > 0) {
          console.log(`  ✅ Updated ${updatedPmPayments.count} PM Rent Payment(s) periodStart -> ${t.newStart.toISOString().split('T')[0]}, periodEnd -> ${t.newEnd.toISOString().split('T')[0]}`);
        }
      }
    }

    // 2. Update Payment Requests
    const updatedPRs = await prisma.upward_payment_request.updateMany({
      where: { userId: user.id },
      data: {
        rentStartDate: t.newStart,
        rentEndDate: t.newEnd,
      },
    });
    console.log(`  ✅ Updated ${updatedPRs.count} Payment Request record(s) rentStartDate & rentEndDate.`);

    console.log('-----------------------------------\n');
  }
}

updateRecords()
  .catch((err) => {
    console.error('Error executing update script:', err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
