# Upward External API Changelog: Cancel, Edit & Schedule Payments

This document outlines the recent updates to the Upward External API, specifically covering the new **Cancel**, **Edit**, and **Schedule/Recurring** features for payment requests.

---

## Base URLs

*   **Development / Sandbox**: `https://upward-web.vercel.app`
*   **Production**: `https://upward.goodtenants.io`

All endpoints are prepended with `/api/v1`.

---

## 1. Scheduling & Recurring Payments
When generating a payment request via `POST /api/v1/payment-request`, you can now pass optional parameters to schedule the payment for a future activation date, and configure it to automatically recur.

### Creation Payload Updates
You can now include these parameters in the body:

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `scheduledAt` | `string` | No | ISO-8601 date-time string indicating when the request should become active. |
| `isRecurring` | `boolean` | No | Set to `true` to make the request repeat automatically after each cycle (Requires `scheduledAt`). |
| `recurrenceInterval` | `string` | No | The frequency of recurrence. Accepted values: `MONTHLY`, `QUARTERLY`, `YEARLY`. |

#### Example Request: Create Scheduled Recurring Payment
```json
POST /api/v1/payment-request
x-api-key: up_sk_live_...

{
  "userPropertyUuid": "5cab404a-df37-4408-826b-e8b820e26fac",
  "amount": 500000,
  "dueDate": "2026-08-01",
  "description": "August 2026 Rent",
  "scheduledAt": "2026-07-28T09:00:00Z",
  "isRecurring": true,
  "recurrenceInterval": "MONTHLY"
}
```

#### Example Response
Because the request is scheduled for the future, the `paymentLink` is deferred (`null`) and its status is `SCHEDULED`.
```json
{
  "success": true,
  "data": {
    "paymentUuid": "d8e9f0a1-...",
    "paymentLink": null,
    "dva": null,
    "status": "SCHEDULED"
  }
}
```

---

## 2. Edit Rent Request
Edit the properties, total amount, or line items of an existing payment request.

*   **Method**: `PATCH`
*   **Endpoint**: `/api/v1/payment-request/:uuid`
*   **Authentication**: Required (`x-api-key`)

### Request Body Fields (All Optional)
*   `amount` (`number`)
*   `dueDate` (`string`, ISO-8601 date)
*   `description` (`string`)
*   `allowPartial` (`boolean`)
*   `minAmount` (`number`)
*   `rentStartDate` (`string`, ISO-8601 date)
*   `rentEndDate` (`string`, ISO-8601 date)
*   `rentType` (`string`)
*   `lineItems` (`Array<{ name: string, amount: number }>`)
*   `scheduledAt` (`string`, ISO-8601 date-time)
*   `isRecurring` (`boolean`)
*   `recurrenceInterval` (`string`)

> [!WARNING]
> - **Edit Constraint**: You can only update payment requests that have **not** received any payments yet (`amountPaid === 0`).
> - **Line Item Sum**: If you update the `amount` or `lineItems`, the sum of all line item amounts must exactly equal the total `amount`.

#### Example Request
```json
PATCH /api/v1/payment-request/d8e9f0a1-...
x-api-key: up_sk_live_...

{
  "amount": 550000,
  "description": "Adjusted rent & service charge",
  "lineItems": [
    { "name": "Base Rent", "amount": 500000 },
    { "name": "Service Charge", "amount": 50000 }
  ]
}
```

#### Example Response
```json
{
  "success": true,
  "data": {
    "id": 100,
    "uuid": "d8e9f0a1-...",
    "amount": 550000,
    "status": "PENDING",
    "description": "Adjusted rent & service charge",
    "dueDate": "2026-08-01T00:00:00.000Z",
    "allowPartial": false,
    "minAmount": 0,
    "scheduledAt": "2026-07-28T09:00:00.000Z",
    "isRecurring": true,
    "recurrenceInterval": "MONTHLY"
  }
}
```

---

## 3. Cancel Rent Request
Cancel an outstanding pending or future-scheduled payment request.

*   **Method**: `POST`
*   **Endpoint**: `/api/v1/payment-request/:uuid/cancel`
*   **Authentication**: Required (`x-api-key`)

> [!WARNING]
> - **Cancel Constraint**: Only requests with `amountPaid === 0` can be cancelled. Fully paid or partially paid requests cannot be cancelled.

#### Example Request
```json
POST /api/v1/payment-request/d8e9f0a1-.../cancel
x-api-key: up_sk_live_...
```

#### Example Response
```json
{
  "success": true,
  "message": "Payment request cancelled successfully"
}
```

---

## 4. Webhook Notification: `payment_request.activated`
If a payment request is scheduled (`status === 'SCHEDULED'`), Upward runs a background scheduler hourly. When the request's `scheduledAt` timestamp is reached, Upward activates the payment request, changes its status to `PENDING`, and triggers the `payment_request.activated` webhook event to your registered webhook URL.

### Webhook Payload Example
```json
{
  "event": "payment_request.activated",
  "data": {
    "paymentUuid": "d8e9f0a1-...",
    "paymentLink": "https://upward.goodtenants.io/pay/d8e9f0a1-...",
    "amount": 550000,
    "currency": "NGN",
    "status": "PENDING",
    "dva": {
      "accountNumber": "9999920123",
      "accountName": "Global Properties - Tenant Name",
      "bankName": "OPay Digital Services Limited (OPay)",
      "bankCode": "999992"
    }
  }
}
```
