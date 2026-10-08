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

const pmEmail = 'o.adenekanandco@gmail.com';

async function checkPmSubscriptionDetails() {
  console.log('\n====================================================================');
  console.log(`      PM SUBSCRIPTION & WALLET AUDIT: ${pmEmail}                   `);
  console.log('====================================================================\n');

  const pmEmailH = hash(pmEmail);

  // 1. Find Property Manager by email or emailHash
  let pm = await prisma.upward_property_manager.findUnique({
    where: { email: pmEmail },
    include: {
      subscription: true,
      wallet: {
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      },
      subscriptionInvoices: {
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
      properties: {
        include: {
          units: true,
        },
      },
    },
  });

  if (!pm) {
    pm = await prisma.upward_property_manager.findUnique({
      where: { emailHash: pmEmailH },
      include: {
        subscription: true,
        wallet: {
          include: {
            transactions: {
              orderBy: { createdAt: 'desc' },
              take: 5,
            },
          },
        },
        subscriptionInvoices: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        properties: {
          include: {
            units: true,
          },
        },
      },
    });
  }

  if (!pm) {
    console.log(`❌ Property Manager with email '${pmEmail}' not found in database.`);
    return;
  }

  console.log(`✅ Property Manager Found:`);
  console.log(`   - PM ID: ${pm.id}`);
  console.log(`   - UUID: ${pm.uuid}`);
  console.log(`   - Business Name: ${decrypt(pm.businessName)}`);
  console.log(`   - Email: ${pm.email}`);
  console.log(`   - Name: ${decrypt(pm.firstName)} ${decrypt(pm.lastName)}`);
  
  // Calculate total managed units
  let totalUnits = 0;
  pm.properties.forEach(p => {
    totalUnits += p.units.length;
  });
  console.log(`   - Total Properties: ${pm.properties.length} | Total Units: ${totalUnits}`);

  // 2. Subscription Details
  console.log(`\n📋 SUBSCRIPTION DETAILS (upward_subscription table):`);
  if (!pm.subscription) {
    console.log(`   ⚠️ No subscription record found for this PM.`);
  } else {
    const sub = pm.subscription;
    console.log(`   - Subscription ID     : ${sub.id}`);
    console.log(`   - Tier                : ${sub.tier}`);
    console.log(`   - Status              : ${sub.status}`);
    console.log(`   - Anniversary Day     : ${sub.anniversaryDate ?? 'NULL'}`);
    console.log(`   - Unit Billing Mode   : ${sub.unitBillingMode}`);
    console.log(`   - Price Yearly / Unit : ₦${sub.priceYearly}`);
    console.log(`   - Price Monthly / Unit: ₦${sub.priceMonthly}`);
    console.log(`   - Grace Period Days   : ${sub.gracePeriodDays}`);
    console.log(`   - Grace Started At    : ${sub.graceStartedAt ? sub.graceStartedAt.toISOString() : 'NULL'}`);
    console.log(`   - Pending Tier        : ${sub.pendingTier ?? 'None'}`);
  }

  // 3. Wallet Details
  console.log(`\n💳 WALLET DETAILS (upward_pm_wallet table):`);
  if (!pm.wallet) {
    console.log(`   ⚠️ No wallet record found for this PM.`);
  } else {
    console.log(`   - Wallet ID           : ${pm.wallet.id}`);
    console.log(`   - Balance             : ₦${pm.wallet.balance.toLocaleString()}`);
    console.log(`   - Is Active           : ${pm.wallet.isActive}`);
    console.log(`   - Recent Transactions (${pm.wallet.transactions.length}):`);
    pm.wallet.transactions.forEach(t => {
      console.log(`     ↳ [${t.createdAt.toISOString().split('T')[0]}] ${t.type} | ₦${t.amount} | Status: ${t.status} | Ref: ${t.reference}`);
    });
  }

  // 4. Invoices Details
  console.log(`\n📄 RECENT INVOICES (upward_subscription_invoice table):`);
  if (pm.subscriptionInvoices.length === 0) {
    console.log(`   ℹ️ No subscription invoices found.`);
  } else {
    pm.subscriptionInvoices.forEach(inv => {
      console.log(`   - Invoice ID #${inv.id} (Units: ${inv.unitCount}, Amount: ₦${inv.amount.toLocaleString()}):`);
      console.log(`     Invoice Date  : ${inv.invoiceDate.toISOString().split('T')[0]}`);
      console.log(`     Deduction Date: ${inv.deductionDate.toISOString().split('T')[0]}`);
      console.log(`     Payment Status: ${inv.paymentStatus}`);
    });
  }

  console.log(`\n--------------------------------------------------------------------\n`);
}

checkPmSubscriptionDetails()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
