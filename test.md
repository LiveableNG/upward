curl -X POST http://localhost:4000/api/v1/platform/get-key \
  -H "Content-Type: application/json" \
  -d '{
    "name": "EstateCore",
    "email": "support@estatecore.africa",
    "address": "Ikoyi, Lagos",
    "webhookUrl": "https://estatecore.africa/api/webhooks/upward"
  }'

curl -X POST http://localhost:4000/api/v1/single/invite \
  -H "Content-Type: application/json" \
  -H "x-api-key: up_sk_live_e5bcd4606bc0529e89a6895d" \
  -d '{
    "company": {
      "name": "Prime Estates Nigeria",
      "address": "12 Adeola Odeku, Victoria Island, Lagos"
    },
    "invite": {
      "user": {
        "email": "tenant1@gmail.com",
        "firstName": "Tunde",
        "lastName": "Balogun",
        "phone": "+2348012345678"
      },
      "property": {
        "location": {
          "country": "Nigeria",
          "state": "Lagos",
          "area": "Lekki",
          "address": "Chevron Drive"
        },
        "rent": {
          "rentAmount": 3500000,
          "rentStartDate": "2024-06-01T00:00:00Z",
          "rentEndDate": "2025-06-01T00:00:00Z"
        },
        "manager": {
          "firstName": "Aisha",
          "lastName": "Lawal",
          "email": "aisha@primeestates.ng"
        }
      }
    }
  }'


{"success":true,"message":"Created","data":{"userId":"d92cb612-80b5-44e9-b584-d6e9a7ff6479","managerId":"07dceb68-ce95-440d-b1d1-ef0f25264c82","companyId":"c0d51a2b-1f42-4943-8cfc-
864ac03f6c7b","userPropertyUuid":"e4e52697-522a-4da9-8b1f-3dc7d8e59320","email":"tenant1@gmail.com","inviteLink":"http://localhost:3000/invite/d92cb612-80b5-44e9-b584-d6e9a7ff6479"
}}

curl -X POST http://localhost:4000/api/v1/payment-request \
  -H "Content-Type: application/json" \
  -H "x-api-key: up_sk_live_e5bcd4606bc0529e89a6895d" \
  -d '{
    "userPropertyUuid": "e4e52697-522a-4da9-8b1f-3dc7d8e59320",
    "dueDate": "2026-12-31T23:59:59Z",
    "allowPartial": true,
    "amount": 1000000,
    "minAmount": 100000,
    "lineItems": [
      { "name": "Rent", "amount": 800000 },
      { "name": "Service Charge", "amount": 200000 }
    ],
    "currency": "NGN",
    "description": "Annual rent payment",
    "bankCode": "058",
    "accountNumber": "0123456789"
  }'
{"success":true,"data":{"success":true,"data":{"paymentUuid":"cfc4fa92-0579-4c35-8c3b-0c08314ce174","paymentLink":"http://localhost:3000/pay/cfc4fa92-0579-4c35-8c3b-0c08314ce174"}}
}


curl -X POST http://localhost:4000/api/v1/payment-request \
  -H "Content-Type: application/json" \
  -H "x-api-key: up_sk_live_e5bcd4606bc0529e89a6895d" \
  -d '{
    "userPropertyUuid": "e4e52697-522a-4da9-8b1f-3dc7d8e59320",
    "amount": 500000,
    "currency": "NGN",
    "description": "One-time payment",
    "dueDate": "2026-08-01T00:00:00Z",
    "allowPartial": false,
    "bankCode": "058",
    "accountNumber": "0123456789"
  }'

{"success":true,"data":{"success":true,"data":{"paymentUuid":"db4966ad-76fd-4f0e-b68e-b2643dc1bc2e","paymentLink":"http://localhost:3000/pay/db4966ad-76fd-4f0e-b68e-b2643dc1bc2e"}}
}
