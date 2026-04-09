curl -X POST https://upward-dev.vercel.app/api/v1/platform/get-key \
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
  -H "x-api-key: up_sk_live_e1f7b01642560ba4fa0b68c0" \
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
  -H "x-api-key: up_sk_live_e1f7b01642560ba4fa0b68c0" \
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
  -H "x-api-key: up_sk_live_e1f7b01642560ba4fa0b68c0" \
  -d '{
    "userPropertyUuid": "5cab404a-df37-4408-826b-e8b820e26fac",
    "dueDate": "2027-12-31T23:59:59Z"
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