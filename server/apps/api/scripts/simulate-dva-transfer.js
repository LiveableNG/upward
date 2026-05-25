const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      const value = valueParts
        .join('=')
        .trim()
        .replace(/^["'](.*)["']$/, '$1');
      process.env[key.trim()] = value;
    }
  });
}

const prisma = new PrismaClient();

async function main() {
  const accountNumber = '1230021538';
  const amountNGN = 50000; // NGN 50,000
  const amountKobo = amountNGN * 100;
  const webhookUrl = 'http://upward-dev.vercel.app/api/v1/payments/webhook';
  const paystackSecretKey = process.env.PAYSTACK_SECRET_KEY || '';

  console.log(`\n🚀 Starting DVA transfer simulation for account: ${accountNumber}`);

  // 1. Ensure DVA exists in DB
  let dva = await prisma.upward_dedicated_virtual_account.findUnique({
    where: { accountNumber },
  });

  if (!dva) {
    console.log(`⚠️  DVA ${accountNumber} not found in DB. Let's find property 87 to link it...`);
    const property = await prisma.upward_user_property.findUnique({
      where: { id: 87 },
    });

    if (!property) {
      console.error('❌ Error: Property with ID 87 does not exist. Please specify a valid property ID.');
      process.exit(1);
    }

    console.log(`🔗 Linking account ${accountNumber} to Property 87...`);
    dva = await prisma.upward_dedicated_virtual_account.create({
      data: {
        accountNumber,
        accountName: 'TEST ACCOUNT',
        bankName: 'Test Bank',
        bankCode: 'test-bank',
        accountCode: `DVA_${accountNumber}`,
        paystackCustomerId: 'CUS_mock_dva_test',
        userPropertyId: 87,
      },
    });
    console.log('✅ Mock DVA created in database.');
  } else {
    console.log(`✅ Verified DVA exists in DB (linked to Property ID: ${dva.userPropertyId})`);
  }

  // 2. Construct Payload
  const reference = `TFD_${accountNumber}_${amountNGN}_${Date.now()}`;
  const payload = {
    event: 'charge.success',
    data: {
      id: Math.floor(Math.random() * 1000000),
      domain: 'test',
      status: 'success',
      reference: reference,
      amount: amountKobo,
      gateway_response: 'Successful',
      paid_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      channel: 'dedicated_nuban',
      currency: 'NGN',
      ip_address: '127.0.0.1',
      metadata: {
        source_app: 'upward',
      },
      customer: {
        id: 999999,
        first_name: 'Test',
        last_name: 'Tenant',
        email: 'tenant@test.com',
        customer_code: dva.paystackCustomerId,
      },
      dedicated_account: {
        id: dva.id,
        account_name: dva.accountName,
        account_number: dva.accountNumber,
        bank: {
          name: dva.bankName,
          slug: dva.bankCode,
        },
      },
    },
  };

  const payloadString = JSON.stringify(payload);

  // 3. Compute HMAC SHA512 Signature
  const hash = crypto
    .createHmac('sha512', paystackSecretKey)
    .update(payloadString)
    .digest('hex');

  console.log(`📤 Sending mock transfer event payload to ${webhookUrl}...`);
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-paystack-signature': hash,
      },
      body: payloadString,
    });

    console.log(`📡 Status: ${response.status}`);
    const responseText = await response.text();
    console.log(`💬 Server Response: ${responseText}`);
    if (response.ok) {
      console.log('🎉 Transfer simulation successful!');
    } else {
      console.log('❌ Server rejected the simulation.');
    }
  } catch (error) {
    console.error('❌ Fetch Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
