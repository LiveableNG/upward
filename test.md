curl -X POST http://localhost:4000/api/v1/platform/get-key \
  -H 'Content-Type: application/json' \
  -d '{"name": "Global Property Group", "email": "api@global.ng", "webhookUrl": "https://hooks.example.com/upward"}'

{"message":"Platform created successfully","id":"aede4e52-16b7-42f4-96da-13a462cb0d43","apiKey":"up_sk_live_3a47269bb98d224b72f2dff0","name":"Global Property Group","email":"api@gl
obal.ng"}


curl -X POST http://localhost:4000/api/v1/single/invite \
  -H 'x-api-key: up_sk_live_3a47269bb98d224b72f2dff0' \
  -H 'Content-Type: application/json' \
  -d '{
    "company": {"name": "Prime Living"},
    "invite": {
      "user": {"email": "tenant@example.com", "firstName": "John", "lastName": "Doe"},
      "properties": [
        {
          "location": {"country": "Nigeria", "state": "Lagos", "area": "Ikoyi", "address": "10 Bourdillon"},
          "rent": {"rentAmount": 5000000, "rentEndDate": "2025-12-31"}
        },
        {
          "location": {"country": "Nigeria", "state": "Lagos", "area": "Lekki", "address": "Apt 402, Highrise"},
          "rent": {"rentAmount": 2500000, "rentEndDate": "2025-06-30"},
          "manager": {"firstName": "Bisi", "lastName": "Staff", "email": "bisi@prime.com"}
        }
      ]
    }
  }'
{"success":true,"message":"Created","data":{"userId":"e5b518b6-f8b1-4785-ac88-f28b34ef5152","companyId":"fba5aefa-dea5-4dc8-9a95-d93c713c9978","email":"tenant@example.com","inviteL
ink":"http://localhost:3000/invite/e5b518b6-f8b1-4785-ac88-f28b34ef5152","properties":[{"uuid":"ba356121-8abd-42bb-b43a-0fb14c7172a3","address":"10 Bourdillon"},{"uuid":"a953127a-4
7ee-4de6-99e7-92112d73076e","address":"Apt 402, Highrise","managerId":"90bac261-21f7-466a-aa96-754c42265258"}]}}


curl -X POST http://localhost:4000/api/v1/payment-request \
  -H 'x-api-key: up_sk_live_3a47269bb98d224b72f2dff0' \
  -H 'Content-Type: application/json' \
  -d '{
    "userPropertyUuid": "ba356121-8abd-42bb-b43a-0fb14c7172a3",
    "amount": 1000000,
    "currency": "NGN",
    "description": "Rent + Service Charge",
    "dueDate": "2026-12-31",
    "allowPartial": true,
    "minAmount": 100000,
    "lineItems": [
      { "name": "Rent", "amount": 800000 },
      { "name": "Service Charge", "amount": 200000 }
    ],
    "bankCode": "058",
    "accountNumber": "0123456789"
  }'

{"success":true,"data":{"success":true,"data":{"paymentUuid":"ac7c6bfb-80fa-436d-acb4-139eb5df7074","paymentLink":"http://localhost:3000/pay/ac7c6bfb-80fa-436d-acb4-139eb5df7074"}}
}


curl -X POST http://localhost:4000/api/v1/payment-request \
  -H 'x-api-key: up_sk_live_3a47269bb98d224b72f2dff0' \
  -H 'Content-Type: application/json' \
  -d '{
    "userPropertyUuid": "a953127a-47ee-4de6-99e7-92112d73076e",
    "currency": "NGN",
    "description": "One-time payment",
    "dueDate": "2026-08-01",
    "allowPartial": false,
    "bankCode": "058",
    "accountNumber": "0123456789"
  }'

{"success":true,"data":{"success":true,"data":{"paymentUuid":"3ecef665-7897-4819-8366-b96c53e81c8d","paymentLink":"http://localhost:3000/pay/3ecef665-7897-4819-8366-b96c53e81c8d"}}
}


curl -X POST http://localhost:4000/api/v1/single/invite/e5b518b6-f8b1-4785-ac88-f28b34ef5152/properties \
  -H 'x-api-key: up_sk_live_3a47269bb98d224b72f2dff0' \
  -H 'Content-Type: application/json' \
  -d '{
    "companyUuid": "fba5aefa-dea5-4dc8-9a95-d93c713c9978",
    "properties": [
      {
        "location": {"country": "Nigeria", "state": "Lagos", "area": "Surulere", "address": "Stadium Road"},
        "rent": {"rentAmount": 1500000, "rentEndDate": "2025-08-15"}
      }
    ]
  }'

{"success":true,"message":"Properties added","data":{"userId":"e5b518b6-f8b1-4785-ac88-f28b34ef5152","companyId":"fba5aefa-dea5-4dc8-9a95-d93c713c9978","email":"tenant@example.com"
,"properties":[{"uuid":"4ccfa09d-76fd-4a8b-a0e9-db2b3964e16d","address":"Stadium Road"}]}}
