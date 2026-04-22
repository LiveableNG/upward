/**
 * Upward API Automation Script
 * This script automates the sequence of API calls defined in the request.
 */

import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const BASE_URL = 'http://localhost:4000/api/v1';

async function callApi(endpoint, method, body, apiKey = null, token = null) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  console.log(`\n>> ${method} ${url}`);
  if (body) console.log(`Body: ${JSON.stringify(body, null, 2)}`);

  const response = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
  });

  const data = await response.json();
  
  if (!response.ok) {
    console.error(`Status: ${response.status} ${response.statusText}`);
    console.error(`Error:`, JSON.stringify(data, null, 2));
    throw new Error(`API call failed: ${endpoint}`);
  }

  console.log(`Success! Response:`, JSON.stringify(data, null, 2));
  return data;
}

async function run() {
  try {
    const getFutureDate = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    // 1. Get Platform Key
    console.log('--- Step 1: Get Platform Key ---');
    const platformData = await callApi('/platform/get-key', 'POST', {
      name: 'GoodTenants',
      email: 'hello@goodtenants.africa',
      webhookUrl: 'https://hooks.upward.ng/simulate'
    });
    const apiKey = platformData.apiKey;
    console.log(`API Key acquired: ${apiKey}`);

    // 2. Setup Test User with multiple Rent Scenarios
    console.log('\n--- Step 2: Creating Test User with Urgency Matrix ---');
    const scenarios = [
      { address: 'Ajah estate Ikeja', amount: 1200000, date: getFutureDate(14) },
    ];

    const inviteData = await callApi('/single/invite', 'POST', {
      company: { name: 'Upward Premium' },
      invite: {
        user: { 
          email: `baldwinjames9872@gmail.com`, 
          firstName: 'Baldwin', 
          lastName: 'James' 
        },
        properties: scenarios.map(s => ({
          location: { country: 'Nigeria', state: 'Lagos', area: 'Shomolu', address: s.address },
          rent: {
            rentAmount: s.amount,
            rentEndDate: s.date,
            rentStartDate: new Date(new Date(s.date).setFullYear(new Date(s.date).getFullYear() - 1))
          }
        }))
      }
    }, apiKey);

    const userId = inviteData.data.userId;
    const responseProps = inviteData.data.properties;
    
    // Map response UUIDs back to our scenario dates
    const propMap = responseProps.map((p, i) => ({
        ...p,
        dueDate: scenarios[i].date,
        amount: scenarios[i].amount
    }));

    console.log(`\nCreated ${propMap.length} property scenarios for User ID: ${userId}`);
    propMap.forEach((p, i) => {
        console.log(`- Property ${i+1}: ${p.uuid} (Due: ${p.dueDate})`);
    });

    //3. Create a Payment Request for the Overdue property
    console.log('\n--- Step 3: Triggering Hero Card for Overdue Property ---');
    const overduePropUuid = propMap[0].uuid;
    const dueDate = propMap[0].dueDate;
    const amount = propMap[0].amount;
    await callApi('/payment-request', 'POST', {
      userPropertyUuid: overduePropUuid,
      currency: 'NGN',
      description: 'Rent Payment',
      allowPartial: true,
      bankCode: '058',
      accountNumber: '0011223344',
      dueDate: '2026-04-22T00:00:00.000Z',
      lineItems: [
        { amount: 1000000, name: 'Rent' },
        { amount: 200000, name: 'Service Charge' }
      ]
    }, apiKey);

    // console.log('\n--- Flow Simulation Ready! ---');
    // console.log('1. The Daily Cron will now pick these up for Notifications/Email.');
    // console.log('2. Dashboard will show Banners/Popups for the 7, 3, 0, and -2 day cases.');
    // console.log('3. Activity Center will prioritize the Overdue invoice.');

    console.log('\nCompleted simulation setup! 🚀');

  } catch (error) {
    console.error('\nFlow aborted due to error:', error.message);
    process.exit(1);
  }
}

run();

async function fulfillRequest() {
  try {

    const requestUuid = '01ac61fa-b5c2-4a8a-ba9b-0fd41dc27e5f';
    await callApi(`/public/credibility/request/${requestUuid}/fulfill`, 'POST', {
      records: [
        { amount: 250000, dueDate: '2023-01-01T00:00:00.000Z', paidDate: '2023-01-28T00:00:00.000Z' }, // Late (28 days)
        { amount: 250000, dueDate: '2023-02-01T00:00:00.000Z', paidDate: '2023-02-15T00:00:00.000Z' }, // Late (14 days)
        { amount: 250000, dueDate: '2023-03-01T00:00:00.000Z', paidDate: '2023-02-28T00:00:00.000Z' }, // On time
        { amount: 250000, dueDate: '2023-04-01T00:00:00.000Z', paidDate: '2023-03-31T00:00:00.000Z' }, // On time
        { amount: 250000, dueDate: '2023-05-01T00:00:00.000Z', paidDate: '2023-05-01T00:00:00.000Z' }, // On time (same day)
        { amount: 250000, dueDate: '2023-06-01T00:00:00.000Z', paidDate: '2023-06-05T00:00:00.000Z' }, // Late (5 days)
        { amount: 250000, dueDate: '2023-07-01T00:00:00.000Z', paidDate: '2023-06-29T00:00:00.000Z' }, // On time
        { amount: 250000, dueDate: '2023-08-01T00:00:00.000Z', paidDate: '2023-07-30T00:00:00.000Z' }, // On time
        { amount: 250000, dueDate: '2023-09-01T00:00:00.000Z', paidDate: '2023-09-10T00:00:00.000Z' }, // Late (10 days)
        { amount: 250000, dueDate: '2023-10-01T00:00:00.000Z', paidDate: '2023-09-28T00:00:00.000Z' }, // On time
        { amount: 250000, dueDate: '2023-11-01T00:00:00.000Z', paidDate: '2023-10-31T00:00:00.000Z' }, // On time
        { amount: 250000, dueDate: '2023-12-01T00:00:00.000Z', paidDate: '2023-11-29T00:00:00.000Z' }, // On time
      ]
    });
    console.log('Request fulfilled successfully!');
  } catch (error) {
    console.error('Failed to fulfill request:', error.message);
    process.exit(1);
  }
}

//fulfillRequest();


async function pushAnnouncement(token, title, message, icon = 'sparkles', url = '/dashboard') {
  console.log(`\n--- Pushing Global Announcement: ${title} ---`);
  await callApi('/admin/notifications/announcements', 'POST', {
    title,
    message,
    iconType: icon,
    url
  }, null, token);
}

async function clearAnnouncements(token) {
  console.log('\n--- Deactivating All Announcements ---');
  await callApi('/admin/notifications/announcements', 'DELETE', null, null, token);
}

async function loginAdmin() {
  console.log('--- Logging in as Admin ---');
  const data = await callApi('/admin/auth/login', 'POST', {
    email: 'abdulsalam.ayeleru@goodtenants.africa',
  
  
    password: 'Oluwaseun123'
  });
  return data.accessToken;
}

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '1107dfc18c646779472c1676315cca08daaa14f375c0f1696ef26f7f89bba815';
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return text;
  const iv = crypto.randomBytes(IV_LENGTH);
  const key = Buffer.from(ENCRYPTION_KEY, 'hex');
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

function hash(text) {
  if (!text) return text;
  return crypto.createHash('sha256').update(text.toLowerCase().trim()).digest('hex');
}

async function createPlatformDirectly() {
  const prisma = new PrismaClient();
  const rawApiKey = 'up_sk_live_c6c2173c91dd462c83e2c2d0';
  const apiKeyHash = crypto.createHash('sha256').update(rawApiKey).digest('hex');
  const name = 'Goodtenants';
  const email = 'hello@goodtenants.africa';

  console.log(`\n--- Creating Platform Directly in DB: ${name} ---`);
  
  try {
    const existing = await prisma.upward_platform.findFirst({
        where: { nameHash: hash(name) }
    });

    if (existing) {
        console.log(`Platform ${name} already exists. Skipping creation.`);
        return existing;
    }

    const platform = await prisma.upward_platform.create({
      data: {
        apiKey: apiKeyHash,
        name: encrypt(name),
        nameHash: hash(name),
        email: encrypt(email),
        emailHash: hash(email),
        webhookUrl: 'https://webhook.goodtenants.africa/callback',
        address: 'Lagos, Nigeria'
      }
    });

    console.log('✅ Platform created successfully:', platform.uuid);
    console.log('Secret Key:', rawApiKey);
    return platform;
  } catch (error) {
    console.error('❌ Failed to create platform:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

//createPlatformDirectly();

// (async () => {
//     try {
//         // await createPlatformDirectly();
//         const token = await loginAdmin();
        
//         await pushAnnouncement(
//             token,
//             'Welcome to Upward! 🚀', 
//             '<p>Your rent dashboard is now <strong>officially live</strong>.</p><ul><li>Settle payments easily</li><li>Build your credit score</li><li>Unlock financial perks</li></ul><p>Visit our <a href="https://upward.ng/help">help center</a> if you have any questions.</p>', 
//             'sparkles', 
//             '/dashboard'
//         );

//         console.log('\n✅ All steps completed successfully!');
//     } catch (error) {
//         console.error('\n❌ Script failed:', error.message);
//         process.exit(1);
//     }
// })();