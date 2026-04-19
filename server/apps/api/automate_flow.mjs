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
      { address: 'Ajah estate Ikeja', amount: 1200000, date: getFutureDate(14) },
    ];

    const inviteData = await callApi('/single/invite', 'POST', {
      company: { name: 'Upward Premium' },
      invite: {
        user: { 
          email: `ayeleru1234@gmail.com`, 
          firstName: 'Abdulsalam', 
          lastName: 'Ayeleru' 
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

    // 3. Create a Payment Request for the Overdue property
    console.log('\n--- Step 3: Triggering Hero Card for Overdue Property ---');
    const overdueProp = propMap[0];
    await callApi('/payment-request', 'POST', {
      userPropertyUuid: overdueProp.uuid,
      currency: 'NGN',
      description: 'Rent Payment',
      dueDate: overdueProp.dueDate, // NOW VALID
      allowPartial: true,
      bankCode: '058',
      accountNumber: '0011223344',
      lineItems: [
        { amount: 1000000, name: 'Rent' },
        { amount: 200000, name: 'Service Charge' }
      ]
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

//run();

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

fulfillRequest();

