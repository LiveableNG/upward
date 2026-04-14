const url = 'https://api-dev.goodtenants.io/api-upward/v1/webhook';
const payload = {
  event: 'payment.updated',
  data: {
    paymentUuid: 'b69425dc-7373-4d20-910a-61a6156d4165',
    reference: 'PAY_8d7f123d-a0f4-4cad-bd19-10045b760332',
    amountPaid: 1200000,
    totalPaid: 1200000,
    remainingAmount: 0,
    overpaymentAmount: 0,
    currency: 'NGN',
    status: 'PAID',
    paidAt: new Date().toISOString(),
    customerEmail: 'test@example.com'
  }
};

async function test() {
  console.log('Testing webhook delivery to:', url);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    console.log('Status:', response.status);
    const body = await response.text();
    console.log('Response Body:', body);
  } catch (error) {
    console.error('Fetch Error:', error.message);
  }
}

test();
