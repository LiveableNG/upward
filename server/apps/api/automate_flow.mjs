/**
 * Upward API Automation Script
 * This script automates the sequence of API calls defined in the request.
 */

const BASE_URL = 'http://localhost:4000/api/v1';

async function callApi(endpoint, method, body, apiKey = null) {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
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
    // 1. Get Platform Key
    console.log('--- Step 1: Get Platform Key ---');
    const platformData = await callApi('/platform/get-key', 'POST', {
      name: 'Global Property Group',
      email: 'api@global.ng',
      webhookUrl: 'https://hooks.example.com/upward'
    });
    const apiKey = platformData.apiKey;
    console.log(`API Key acquired: ${apiKey}`);

    // 2. Single Invite
    console.log('\n--- Step 2: Single Invite ---');
    const inviteData = await callApi('/single/invite', 'POST', {
      company: { name: 'Prime Living' },
      invite: {
        user: { email: 'tenant@example.com', firstName: 'John', lastName: 'Doe' },
        properties: [
          {
            location: { country: 'Nigeria', state: 'Lagos', area: 'Ikoyi', address: '10 Bourdillon' },
            rent: { rentAmount: 5000000, rentEndDate: '2025-12-31' }
          },
          {
            location: { country: 'Nigeria', state: 'Lagos', area: 'Lekki', address: 'Apt 402, Highrise' },
            rent: { rentAmount: 2500000, rentEndDate: '2025-06-30' },
            manager: { firstName: 'Bisi', lastName: 'Staff', email: 'bisi@prime.com' }
          }
        ]
      }
    }, apiKey);

    const userId = inviteData.data.userId;
    const companyId = inviteData.data.companyId;
    const property1Uuid = inviteData.data.properties[0].uuid;
    const property2Uuid = inviteData.data.properties[1].uuid;

    // 3. Payment Request 1
    console.log('\n--- Step 3: Payment Request for Property 1 ---');
    await callApi('/payment-request', 'POST', {
      userPropertyUuid: property1Uuid,
      amount: 1000000,
      currency: 'NGN',
      description: 'Rent + Service Charge',
      dueDate: '2026-04-01', // OVERDUE
      allowPartial: true,
      minAmount: 100000,
      lineItems: [
        { name: 'Rent', amount: 800000 },
        { name: 'Service Charge', amount: 200000 }
      ],
      bankCode: '058',
      accountNumber: '0123456789'
    }, apiKey);

    // 4. Payment Request 2
    console.log('\n--- Step 4: Payment Request for Property 2 ---');
    await callApi('/payment-request', 'POST', {
      userPropertyUuid: property2Uuid,
      currency: 'NGN',
      description: 'One-time payment',
      dueDate: '2026-08-01',
      allowPartial: false,
      bankCode: '058',
      accountNumber: '0123456789'
    }, apiKey);

    // 5. Add more properties
    console.log('\n--- Step 5: Add more properties ---');
    await callApi(`/single/invite/${userId}/properties`, 'POST', {
      companyUuid: companyId,
      properties: [
        {
          location: { country: 'Nigeria', state: 'Lagos', area: 'Surulere', address: 'Stadium Road' },
          rent: { rentAmount: 1500000, rentEndDate: '2025-08-15' }
        }
      ]
    }, apiKey);

    console.log('\nCompleted all steps successfully! 🚀');
  } catch (error) {
    console.error('\nFlow aborted due to error:', error.message);
    process.exit(1);
  }
}

run();
