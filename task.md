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
  -H "x-api-key: api_key" \
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

"http://localhost:3000/invite/2ec933f3-4bf5-4abd-b78b-c2dfc2c0f38f


curl -X POST http://localhost:4000/api/v1/platform/get-key \
  -H "Content-Type: application/json" \
  -d '{
    "name": "RentFlow Africa",
    "email": "hello@rentflow.africa",
    "address": "8B Bishop Aboyade Cole Street, Victoria Island, Lagos",
    "webhookUrl": "https://rentflow.africa/api/webhooks/upward"
  }'


  curl -X POST http://localhost:4000/api/v1/single/invite \
  -H "Content-Type: application/json" \
  -H "x-api-key: up_sk_live_a8bf7381b4c2c580b5f36f29" \
  -d '{
    "company": {
      "name": "Prime Estates Nigeria",
      "address": "12 Admiralty Way, Lekki Phase 1, Lagos"
    },
    "user": {
      "email": "adeola.akinwale@gmail.com",
      "firstName": "Adeola",
      "lastName": "Akinwale",
      "phone": "+2348134567890"
    },
    "property": {
      "country": "Nigeria",
      "state": "Lagos",
      "area": "Lekki",
      "subarea": "Admiralty Way",
      "rentAmount": 3500000,
      "rentStartDate": "2024-06-01T00:00:00Z",
      "rentEndDate": "2025-06-01T00:00:00Z"
    },
    "manager": {
      "firstName": "Tunde",
      "lastName": "Balogun",
      "email": "tunde.balogun@primeestates.ng"
    }
  }'

  curl -X POST http://localhost:4000/api/v1/single/invite \
  -H "Content-Type: application/json" \
  -H "x-api-key: up_sk_live_a8bf7381b4c2c580b5f36f29" \
  -d '{
    "company": {
      "name": "Prime Estates Nigeria",
      "address": "12 Admiralty Way, Lekki Phase 1, Lagos"
    },
    "invite": {
      "user": {
        "email": "adeola.akinwale@gmail.com",
        "firstName": "Adeola",
        "lastName": "Akinwale",
        "phone": "+2348134567890"
      },
      "property": {
        "location": {
          "country": "Nigeria",
          "state": "Lagos",
          "area": "Lekki",
          "subarea": "Admiralty Way",
          "address": "12 Admiralty Way"
        },
        "rent": {
          "rentAmount": 3500000,
          "rentStartDate": "2024-06-01T00:00:00Z",
          "rentEndDate": "2025-06-01T00:00:00Z"
        },
        "manager": {
          "firstName": "Tunde",
          "lastName": "Balogun",
          "email": "tunde.balogun@primeestates.ng"
        }
      }
    }
  }'


  curl -X POST http://localhost:4000/api/v1/payment-request \
  -H "Content-Type: application/json" \
  -H "x-api-key: up_sk_live_9b4e3854fef0d191558cadb8" \
  -d '{
    "userPropertyUuid": "a7f2827e-43a6-4c82-8a1f-3cb20b92a964",
    "dueDate": "2027-12-31T23:59:59Z",
    "acceptPartial": true,
    "minPartialAmount": 100000,
    "lineItems": [
      {
        "label": "Rent",
        "amount": 100000
      },
      {
        "label": "Service Charge",
        "amount": 50000
      }
    ]
  }'

curl -X POST http://localhost:4000/api/v1/payment-request \
  -H "Content-Type: application/json" \
  -H "x-api-key: up_sk_live_9b4e3854fef0d191558cadb8" \
  -d '{
    "userPropertyUuid": "a7f2827e-43a6-4c82-8a1f-3cb20b92a964",
    "dueDate": "2027-12-31T23:59:59Z",
    "description": "Housing Package - 2027",
    "bankCode": "058",
    "accountNumber": "2001234567",
    "allowPartial": true,
    "minAmount": 100000,
    "lineItems": [
      {
        "label": "Annual Rent",
        "amount": 2500000
      },
      {
        "label": "Security Deposit",
        "amount": 500000
      },
      {
        "label": "Service Charge",
        "amount": 150000
      },
      {
        "label": "Legal & Agreement",
        "amount": 100000
      }
    ]
  }'


curl -X POST http://localhost:4000/api/v1/external/payment-request \
  -H "Content-Type: application/json" \
  -H "x-api-key: your_api_key_here" \
  -d '{
    "invite": {
      "company": {
        "name": "Prime Estates Nigeria",
        "address": "Lagos, Nigeria"
      },
      "invite": {
        "user": {
          "email": "tenant@example.com",
          "firstName": "Ade",
          "lastName": "Ola",
          "phone": "+2348000000000"
        },
        "property": {
          "location": {
            "country": "Nigeria",
            "state": "Lagos",
            "area": "Lekki"
          },
          "rent": {
            "rentAmount": 3000000,
            "rentEndDate": "2025-06-01T00:00:00Z",
            "currency": "NGN"
          },
          "manager": {
            "firstName": "Manager",
            "lastName": "One",
            "email": "manager@primeestates.ng"
          }
        }
      }
    },
    "dueDate": "2024-06-15T00:00:00Z",
    "description": "Initial Setup & Security Deposit",
    "amount": 150000
  }'


one thing i can't get off my mind is what if user has already signed up and we try to make an invite to them won't that overrid their own signup data? 
DEPLOYED  up_sk_live_7e266528891511580dcaf224

curl -X POST http://localhost:4000/api/v1/payment-request \
  -H "Content-Type: application/json" \
  -H "x-api-key: up_sk_live_097829064d9c769ef566fc42" \
  -d '{
    "userPropertyUuid": "f4f8d0a3-b485-419a-89e4-9685275975bf",
    "amount": 250000,
    "currency": "NGN",
    "description": "Partial payment for March rent",
    "lineItems": [
      { "label": "Rent Balance", "amount": 200000 },
      { "label": "Surcharge", "amount": 50000 }
    ],
    "dueDate": "2026-05-30T00:00:00.000Z",
    "bankCode": "044",
    "accountNumber": "0690000031",
    "allowPartial": true
  }'
