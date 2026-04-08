curl -X POST http://localhost:4000/api/v1/platform/get-key \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Liveable Platform",
    "email": "contact@liveable.ng",
    "address": "Victoria Island, Lagos",
    "webhookUrl": "https://api.liveable.ng/webhooks/upward"
  }'


curl -X POST http://localhost:4000/api/v1/single/invite \
  -H "Content-Type: application/json" \
  -H "x-api-key: up_sk_live_097829064d9c769ef566fc42 \
  -d '{
    "company": {
      "name": "Global Properties LTD",
      "address": "No 1 High Street, Lagos"
    },
    "invite": {
      "user": {
        "email": "new.tenant@gmail.com",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+2348001112222"
      },
      "property": {
        "location": {
          "country": "Nigeria",
          "state": "Lagos",
          "area": "Ikoyi",
          "address": "Bourdillon Road"
        },
        "rent": {
          "rentAmount": 5000000,
          "rentStartDate": "2024-01-01T00:00:00Z",
          "rentEndDate": "2025-01-01T00:00:00Z"
        },
        "manager": {
          "firstName": "Bisi",
          "lastName": "Manager",
          "email": "bisi@globalprop.ng"
        }
      }
    }
  }'

"http://localhost:3000/invite/b7a71853-2d7a-4399-af09-115a6c1406ce