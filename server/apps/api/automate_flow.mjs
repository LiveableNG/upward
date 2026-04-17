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
    const getFutureDate = (days) => {
      const d = new Date();
      d.setDate(d.getDate() + days);
      return d.toISOString().split('T')[0];
    };

    // 1. Get Platform Key
    console.log('--- Step 1: Get Platform Key ---');
    const platformData = await callApi('/platform/get-key', 'POST', {
      name: 'Upward Property Mgmt',
      email: 'alerts@upward.ng',
      webhookUrl: 'https://hooks.upward.ng/simulate'
    });
    const apiKey = platformData.apiKey;
    console.log(`API Key acquired: ${apiKey}`);

    // 2. Setup Test User with multiple Rent Scenarios
    console.log('\n--- Step 2: Creating Test User with Urgency Matrix ---');
    const scenarios = [
      { address: '14-Day Notice House', amount: 1200000, date: getFutureDate(14) },
      { address: '7-Day Warning Apt', amount: 850000, date: getFutureDate(7) },
      { address: '3-Day Critical Suite', amount: 3200000, date: getFutureDate(3) },
      { address: 'Due Today Highrise', amount: 450000, date: getFutureDate(0) },
      { address: 'Overdue Bungalow', amount: 200000, date: getFutureDate(-2) },
    ];

    const inviteData = await callApi('/single/invite', 'POST', {
      company: { name: 'Upward Premium' },
      invite: {
        user: { 
          email: `test-tenant-${Date.now()}@upward.ng`, 
          firstName: 'Simulated', 
          lastName: 'User' 
        },
        properties: scenarios.map(s => ({
          location: { country: 'Nigeria', state: 'Lagos', area: 'Scenario', address: s.address },
          rent: { rentAmount: s.amount, rentEndDate: s.date }
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

    // 3. Create a Payment Request for the Overdue property
    console.log('\n--- Step 3: Triggering Hero Card for Overdue Property ---');
    const overdueProp = propMap[4];
    await callApi('/payment-request', 'POST', {
      userPropertyUuid: overdueProp.uuid,
      amount: overdueProp.amount,
      currency: 'NGN',
      description: 'Overdue Rent Payment',
      dueDate: overdueProp.dueDate, // NOW VALID
      allowPartial: true,
      bankCode: '058',
      accountNumber: '0011223344'
    }, apiKey);

    console.log('\n--- Flow Simulation Ready! ---');
    console.log('1. The Daily Cron will now pick these up for Notifications/Email.');
    console.log('2. Dashboard will show Banners/Popups for the 7, 3, 0, and -2 day cases.');
    console.log('3. Activity Center will prioritize the Overdue invoice.');

    console.log('\nCompleted simulation setup! 🚀');

  } catch (error) {
    console.error('\nFlow aborted due to error:', error.message);
    process.exit(1);
  }
}

run();
