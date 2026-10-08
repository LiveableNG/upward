import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { createHmac } from 'crypto';
import * as crypto from 'crypto';

const prisma = new PrismaClient();

function decrypt(encryptedText: string | null | undefined): string {
  if (!encryptedText) return 'N/A';
  if (!encryptedText.includes(':')) return encryptedText;
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return encryptedText;
    const [ivHex, authTagHex, encrypted] = parts;
    const hexKey = process.env.ENCRYPTION_KEY || 'd7f3e2a1b0c9d8e7f6a5b4c3d2e1f0a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8';
    const key = Buffer.from(hexKey, 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    return encryptedText;
  }
}

async function dispatchPastWebhook() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes('--dry-run') || !args.includes('--send');

  console.log('================================================================');
  console.log(` WEBHOOK DISPATCH SIMULATOR (${isDryRun ? 'DRY-RUN MODE' : 'LIVE SEND MODE'})`);
  console.log('================================================================\n');

  const ref = '000023260814222612004223684880';
  
  const tx = await prisma.upward_transaction.findFirst({
    where: { reference: ref },
    include: {
      user: true,
      paymentRequest: {
        include: {
          userProperty: {
            include: {
              company: {
                include: {
                  platform: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!tx) {
    console.error(`Transaction ${ref} not found`);
    await prisma.$disconnect();
    return;
  }

  const pr = tx.paymentRequest;
  const userProperty = pr?.userProperty;
  const company = userProperty?.company;
  const platform = company?.platform;

  const email = decrypt(tx.user?.email);

  const lineItemsPaid: Record<string, number> = {};
  if (tx.lineItems && Array.isArray(tx.lineItems)) {
    for (const item of tx.lineItems as any[]) {
      const isFee = item.category === 'Fee' || ['Upward Benefits'].includes(item.name);
      if (!isFee) {
        const rawAmount = item.amount || tx.amount;
        const amountInNaira = rawAmount > 10000000 ? rawAmount / 100 : rawAmount;
        lineItemsPaid[item.name || 'Rent'] = (lineItemsPaid[item.name || 'Rent'] || 0) + amountInNaira;
      }
    }
  }
  if (Object.keys(lineItemsPaid).length === 0) {
    const amountInNaira = tx.amount > 10000000 ? tx.amount / 100 : tx.amount;
    lineItemsPaid['Rent'] = amountInNaira;
  }

  const payloadData = {
    paymentUuid: pr?.uuid,
    transactionUuid: tx.uuid,
    reference: tx.reference,
    lineItems: lineItemsPaid,
    currency: tx.currency || 'NGN',
    status: 'PAID',
    paidAt: tx.createdAt,
    customerEmail: email,
    externalUnitId: userProperty?.externalUnitId || null,
    isUnderpayment: false,
    settlementStatus: tx.settlementStatus || 'SETTLED'
  };

  const fullPayload = {
    event: 'payment.updated',
    data: payloadData
  };

  const payloadString = JSON.stringify(fullPayload, null, 2);
  const signature = createHmac('sha256', platform?.apiKeyHash || 'secret')
    .update(JSON.stringify(fullPayload))
    .digest('hex');

  console.log('--- TARGET DESTINATION ---');
  console.log(`Platform ID    : ${platform?.id}`);
  console.log(`Platform Name  : ${decrypt(platform?.name)}`);
  console.log(`Webhook URL    : ${platform?.webhookUrl}`);
  console.log(`Target Header  : X-Upward-Signature = ${signature}\n`);

  console.log('--- EXACT WEBHOOK PAYLOAD ---');
  console.log(payloadString);
  console.log('-----------------------------\n');

  if (isDryRun) {
    console.log('ℹ️ DRY-RUN ONLY. No HTTP request was sent and no DB log was saved.');
    console.log('👉 To actually send this payload to the platform, run:');
    console.log('   npx tsx scripts/dispatch-past-webhook.ts --send\n');
    await prisma.$disconnect();
    return;
  }

  // Live Send
  console.log('🚀 Executing LIVE webhook dispatch...');
  const webhookLog = await prisma.upward_webhook_log.create({
    data: {
      platformId: platform!.id,
      event: 'payment.updated',
      url: platform!.webhookUrl,
      payload: fullPayload,
      status: 'PENDING',
      retries: 0,
      direction: 'OUTGOING'
    }
  });

  console.log(`Created DB webhook log record: ID ${webhookLog.id}`);

  try {
    const res = await fetch(platform!.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Upward-Signature': signature
      },
      body: JSON.stringify(fullPayload)
    });

    const responseText = await res.text();
    console.log(`\nResponse Status Code : ${res.status}`);
    console.log(`Response Body        : ${responseText}`);

    await prisma.upward_webhook_log.update({
      where: { id: webhookLog.id },
      data: {
        status: res.ok ? 'SUCCESS' : 'FAILED',
        responseCode: res.status,
        retries: 1
      }
    });

    console.log(`\n✅ Webhook log status updated to: ${res.ok ? 'SUCCESS' : 'FAILED'}`);
  } catch (error: any) {
    console.error(`❌ Webhook dispatch failed:`, error.message);
    await prisma.upward_webhook_log.update({
      where: { id: webhookLog.id },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
        retries: 1
      }
    });
  }

  await prisma.$disconnect();
}

dispatchPastWebhook().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
