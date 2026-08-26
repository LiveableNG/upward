import { PrismaClient } from '@prisma/client';
import * as crypto from 'crypto';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../server/apps/api/.env') });

const prisma = new PrismaClient();

const algorithm = 'aes-256-gcm';
const hexKey = process.env.ENCRYPTION_KEY || '4a8fb008ac99a75788a473c7029bdf5b5b2a198c8dbc873b3efa637d08abfca8';
const key = Buffer.from(hexKey, 'hex');

function decrypt(encryptedText: string | null | undefined): string {
  if (!encryptedText || !encryptedText.includes(':')) return encryptedText || '';
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    const [ivHex, authTagHex, encrypted] = parts;
    if (!ivHex || !authTagHex || !encrypted) return encryptedText;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch {
    return encryptedText || '';
  }
}

function hash(text: string): string {
  if (!text) return text;
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}

function formatDate(date: Date | null | undefined): string {
  if (!date) return 'NULL';
  return date.toISOString().split('T')[0];
}

const targets = [
  { name: 'Esther Awulika Chukwudi', email: 'emenikeesther22@gmail.com', expectedStart: '2026-09-18', expectedEnd: '2027-09-18' },
  { name: 'Ozioma Oluebube', email: 'ojimaduebube@gmail.com', expectedStart: '2026-08-01', expectedEnd: '2027-08-01' },
  { name: 'Olanrewaju Shobande', email: 'smartchoice14@yahoo.com', expectedStart: '2026-10-01', expectedEnd: '2027-09-30' },
  { name: 'Delight Nwaejike', email: 'delightnwaejike@gmail.com', expectedStart: '2026-07-17', expectedEnd: '2027-07-17' },
  { name: 'Oluwaseun', email: 'oluwaseunisaacs@gmail.com', expectedStart: '2026-07-01', expectedEnd: '2027-07-01' },
  { name: 'Stephanie Nwannukwu', email: 'nwannukwus@gmail.com', expectedStart: '2026-07-01', expectedEnd: '2027-07-01' },
];

async function runDetailedCheck() {
  console.log('\n====================================================================');
  console.log('      DETAILED RENTAL PERIOD & RECEIPT DB AUDIT REPORT              ');
  console.log('====================================================================\n');

  for (const t of targets) {
    const emailH = hash(t.email);
    const user = await prisma.upward_user.findUnique({
      where: { emailHash: emailH },
      include: {
        properties: {
          include: {
            pmUnit: {
              include: {
                rentPayments: { orderBy: { createdAt: 'desc' } }
              }
            },
            company: true
          }
        },
        paymentRequests: {
          orderBy: { createdAt: 'desc' },
          include: {
            transactions: { orderBy: { createdAt: 'desc' } }
          }
        }
      }
    });

    console.log(`👤 USER: ${t.name} <${t.email}>`);
    console.log(`📌 EXPECTED INPUT PERIOD: ${t.expectedStart} to ${t.expectedEnd}`);

    if (!user) {
      console.log(`❌ User record not found in upward_user table.`);
      console.log(`--------------------------------------------------------------------\n`);
      continue;
    }

    console.log(`✅ DB User Found: ID #${user.id}`);

    // 1. Check User Properties (Used for Profile & App Display)
    console.log(`\n  🏠 USER PROPERTIES (Determines profile & user dashboard dates):`);
    if (user.properties.length === 0) {
      console.log(`     ⚠️ No upward_user_property records found.`);
    } else {
      user.properties.forEach(p => {
        const pStart = formatDate(p.rentStartDate);
        const pEnd = formatDate(p.rentEndDate);
        const pMatch = pStart === t.expectedStart && pEnd === t.expectedEnd;
        console.log(`     - Property ID #${p.id} (Company: ${p.company?.name || 'N/A'}, platformId: ${p.platformId || 'N/A'}, externalUnitId: ${p.externalUnitId || 'N/A'}):`);
        console.log(`       Current DB Dates : rentStartDate = ${pStart} | rentEndDate = ${pEnd}`);
        console.log(`       Profile Status   : ${pMatch ? '✅ MATCHES EXPECTED' : '❌ MISMATCH (Needs DB update)'}`);
      });
    }

    // 2. Check PM Rent Payments (if unit is managed)
    console.log(`\n  🏢 PM RENT PAYMENTS (Determines period for managed PM units):`);
    let pmPaymentsFound = 0;
    user.properties.forEach(p => {
      if (p.pmUnit?.rentPayments && p.pmUnit.rentPayments.length > 0) {
        p.pmUnit.rentPayments.forEach(rp => {
          pmPaymentsFound++;
          const pStart = formatDate(rp.periodStart);
          const pEnd = formatDate(rp.periodEnd);
          const rpMatch = pStart === t.expectedStart && pEnd === t.expectedEnd;
          console.log(`     - PM Rent Payment ID #${rp.id} (Unit ID #${rp.unitId}):`);
          console.log(`       Current DB Dates : periodStart = ${pStart} | periodEnd = ${pEnd}`);
          console.log(`       PM Rent Status   : ${rpMatch ? '✅ MATCHES EXPECTED' : '❌ MISMATCH (Needs DB update)'}`);
        });
      }
    });
    if (pmPaymentsFound === 0) console.log(`     ℹ️ No pm_rent_payment records found for this user.`);

    // 3. Check Payment Requests & Transactions (Direct source for Downloadable PDF Receipts)
    console.log(`\n  📄 PAYMENT REQUESTS & TRANSACTIONS (Source for Downloadable PDF Receipts):`);
    if (user.paymentRequests.length === 0) {
      console.log(`     ⚠️ No upward_payment_request records found.`);
    } else {
      user.paymentRequests.forEach(pr => {
        const prStart = formatDate(pr.rentStartDate);
        const prEnd = formatDate(pr.rentEndDate);
        const prMatch = prStart === t.expectedStart && prEnd === t.expectedEnd;
        
        console.log(`     - Payment Request ID #${pr.id} (Status: ${pr.status}, Reference: ${pr.reference || 'N/A'}):`);
        console.log(`       Current DB Dates : rentStartDate = ${prStart} | rentEndDate = ${prEnd}`);
        console.log(`       Receipt Status   : ${prMatch ? '✅ MATCHES EXPECTED' : '❌ MISMATCH (Needs DB update for receipt)'}`);

        if (pr.transactions.length > 0) {
          pr.transactions.forEach(tx => {
            console.log(`       ↳ Transaction ID #${tx.id} (Ref: ${tx.reference}, Status: ${tx.status}, Type: ${tx.type})`);
          });
        }
      });
    }

    console.log(`\n--------------------------------------------------------------------\n`);
  }
}

runDetailedCheck()
  .catch((err) => console.error('Error executing detailed check:', err))
  .finally(() => prisma.$disconnect());
