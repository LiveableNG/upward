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
  -H "x-api-key: up_sk_live_e78e42ab8cb2633b1e5d5a82" \
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
{"success":true,"message":"Created","data":{"userId":"16457a02-c662-431a-833c-aa066ab5c309","managerId":"be8cd3c2-5854-458a-8e69-366cb44bc5ac","companyId":"5978e8ad-ab06-433b-a113-
c7c321e69af5","userPropertyUuid":"56b6ad64-86e6-47f6-9729-e1bfa925e072","email":"tenant1@gmail.com","inviteLink":"http://localhost:3000/invite/16457a02-c662-431a-833c-aa066ab5c309"
}}

curl -X POST http://localhost:4000/api/v1/payment-request \
  -H "Content-Type: application/json" \
  -H "x-api-key: up_sk_test_standard" \
  -d '{
    "userPropertyUuid": "d3b07384-9c4f-4b2a-9c9f-2fbb8c2c1123",
    "dueDate": "2026-12-31T23:59:59Z",
    "allowPartial": true,
    "minAmount": 100000,
    "lineItems": [
      { "label": "Rent", "amount": 800000 },
      { "label": "Service Charge", "amount": 200000 }
    ],
    "currency": "NGN",
    "description": "Annual rent payment",
    "bankCode": "058",
    "accountNumber": "0123456789",
  }'

curl -X POST http://localhost:4000/api/v1/payment-request \
  -H "Content-Type: application/json" \
  -H "x-api-key: up_sk_flat_amount" \
  -d '{
    "userPropertyUuid": "bb2f1c9e-2d8a-4f12-91a7-1a2c44b6ef55",
    "amount": 500000,
    "currency": "NGN",
    "description": "One-time payment",
    "dueDate": "2026-08-01T00:00:00Z",
    "allowPartial": false,
    "bankCode": "058",
    "accountNumber": "0123456789",
  }'