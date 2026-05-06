const url = 'https://api-dev.goodtenants.io/api-upward/v1/webhook';
const payload = {
  data: {
    paidAt: "2026-05-06T09:42:07.503Z",
    status: "PARTIAL",
    currency: "NGN",
    reference: "cf2f069a-a4d4-474c-95d4-0c23b8e087f5",
    totalPaid: 1700000,
    amountPaid: 1700000,
    paymentUuid: "5a96b16b-af29-4f15-a41b-e1432817963e",
    rentEndDate: "2026-06-30T00:00:00.000Z",
    customerEmail: "abdulsalam@yopmail.com",
    rentStartDate: "2025-07-01T00:00:00.000Z",
    remainingAmount: 1300000,
    overpaymentAmount: 0
  },
  event: "payment.updated"
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
