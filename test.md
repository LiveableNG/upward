curl -X POST http://localhost:4000/api/v1/platform/get-key \
  -H 'Content-Type: application/json' \
  -d '{"name": "Global Property Group", "email": "api@global.ng", "webhookUrl": "https://hooks.example.com/upward"}'

{"message":"Platform created successfully","id":"a844a78b-f7fc-4037-b8fc-f3e1277c0660","apiKey":"up_sk_live_a254e77ee582264cecfcb6c1","name":"Global Property Group","email":"api@gl
obal.ng"}

curl -X POST http://localhost:4000/api/v1/single/invite \
  -H 'x-api-key: up_sk_live_a254e77ee582264cecfcb6c1' \
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
{"success":true,"message":"Created","data":{"userId":"1d64c3df-611d-45d4-99df-3bccc310999f","companyId":"edd48518-fc0b-4081-8a7a-67ead4c26f0b","email":"tenant@example.com","inviteL
ink":"http://localhost:3000/invite/1d64c3df-611d-45d4-99df-3bccc310999f","properties":[{"uuid":"aab1cbbe-e821-4cb0-8af6-0d7f64b17ef8","address":"10 Bourdillon"},{"uuid":"c28b26b9-5
42d-4b4e-a36e-d8812c318c61","address":"Apt 402, Highrise","managerId":"0406174a-cb95-4ddf-b4d5-14794b4e283c"}]}}


curl -X POST http://localhost:4000/api/v1/payment-request \
  -H 'x-api-key: up_sk_live_a254e77ee582264cecfcb6c1' \
  -H 'Content-Type: application/json' \
  -d '{
    "userPropertyUuid": "aab1cbbe-e821-4cb0-8af6-0d7f64b17ef8",
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
{"success":true,"data":{"success":true,"data":{"paymentUuid":"a088288f-8f30-4dd8-a039-3281733af756","paymentLink":"http://localhost:3000/pay/a088288f-8f30-4dd8-a039-3281733af756"}}
}
Abd


curl -X POST http://localhost:4000/api/v1/payment-request \
  -H 'x-api-key: up_sk_live_a254e77ee582264cecfcb6c1' \
  -H 'Content-Type: application/json' \
  -d '{
    "userPropertyUuid": "c28b26b9-542d-4b4e-a36e-d8812c318c61",
    "currency": "NGN",
    "description": "One-time payment",
    "dueDate": "2026-08-01",
    "allowPartial": false,
    "bankCode": "058",
    "accountNumber": "0123456789"
  }'

{"success":true,"data":{"success":true,"data":{"paymentUuid":"7ba8fe2b-668a-4104-8a8e-912059b740e1","paymentLink":"http://localhost:3000/pay/7ba8fe2b-668a-4104-8a8e-912059b740e1"}}
}

curl -X POST http://localhost:4000/api/v1/single/invite/1d64c3df-611d-45d4-99df-3bccc310999f/properties \
  -H 'x-api-key: up_sk_live_a254e77ee582264cecfcb6c1' \
  -H 'Content-Type: application/json' \
  -d '{
    "companyUuid": "edd48518-fc0b-4081-8a7a-67ead4c26f0b",
    "properties": [
      {
        "location": {"country": "Nigeria", "state": "Lagos", "area": "Surulere", "address": "Stadium Road"},
        "rent": {"rentAmount": 1500000, "rentEndDate": "2025-08-15"}
      }
    ]
  }'

{"success":true,"message":"Properties added","data":{"userId":"1d64c3df-611d-45d4-99df-3bccc310999f","companyId":"edd48518-fc0b-4081-8a7a-67ead4c26f0b","email":"tenant@example.com"
,"properties":[{"uuid":"d6048471-d94e-46f2-a20d-1e607ee44018","address":"Stadium Road"}]}}
Abdulsalam@DESKTOP-ND5KOGF MINGW64 ~
