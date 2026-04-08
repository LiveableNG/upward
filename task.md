curl -X POST http://localhost:4000/api/v1/external/invites \
  -H "Content-Type: application/json" \
  -H "x-api-key: up_sk_live_7f8d2e9a1b4c" \
  -d '{
    "company": {
      "name": "Acme Residential Management",
      "address": "123 Business District, Lagos",
      "profilePic": "https://cdn.acme.com/logo-sq.png"
    },
    "manager": {
      "firstName": "Opeyemi",
      "lastName": "Adetunji",
      "email": "opeyemi@acme-residential.com"
    },
    "invites": [
      {
        "email": "john.doe.test@gmail.com",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+2348012345678",
        "country": "Nigeria",
        "state": "Lagos",
        "area": "Victoria Island",
        "subarea": "Penthouse B",
        "address": "45 Corporate Way",
        "rentAmount": 5500000,
        "rentStartDate": "2024-04-01",
        "rentEndDate": "2025-03-31"
      }
    ]
  }'
