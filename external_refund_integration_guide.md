# Upward Platform: Underpayment & Refund Resolution Integration Guide

This guide describes how to integrate with Upward's underpayment detection and manual refund resolution workflows.

---

## 1. What is an Underpayment?

An **underpayment** occurs when a Payment Request has been configured with `allowPartial: false` (requiring full payment), but a user completes a transaction that transfers less than the total expected amount (including dynamic processing fees).

When Upward detects an underpayment:
1. The transaction status is marked as `SUCCESS` (since the funds were charged).
2. The transaction's `settlementStatus` is flagged as `PENDING_REFUND`.
3. Funds are temporarily held and **not** settled to the company.
4. Upward sends a webhook to the platform notifying them of the underpayment.
5. The platform can manually resolve the hold by calling the **Accept** or **Reject** endpoints.

---

## 2. Receiving Webhook Callbacks

When a transaction is successfully verified on the gateway, Upward broadcasts a `payment.updated` event to the platform's registered Webhook URL.

### Underpayment Event Payload Examples

#### **Scenario A: Standard / Fully Paid Transaction**
```json
{
  "event": "payment.updated",
  "platformId": 77,
  "payload": {
    "paymentUuid": "pay-req-uuid-abc",
    "transactionUuid": "tx-uuid-12345",
    "reference": "paystack-ref-123",
    "lineItems": {
      "Rent": 500000
    },
    "currency": "NGN",
    "status": "PAID",
    "paidAt": "2026-05-26T14:26:34.000Z",
    "customerEmail": "tenant@example.com",
    "isUnderpayment": false,
    "settlementStatus": "VERIFIED"
  }
}
```

#### **Scenario B: Underpaid Transaction (Needs Action)**
Note the `isUnderpayment: true` and `settlementStatus: "PENDING_REFUND"` flags.
```json
{
  "event": "payment.updated",
  "platformId": 77,
  "payload": {
    "paymentUuid": "pay-req-uuid-abc",
    "transactionUuid": "tx-uuid-underpaid",
    "reference": "paystack-ref-underpaid",
    "lineItems": {
      "Rent": 350000
    },
    "currency": "NGN",
    "status": "PARTIAL",
    "paidAt": "2026-05-26T14:26:34.000Z",
    "customerEmail": "tenant@example.com",
    "isUnderpayment": true,
    "settlementStatus": "PENDING_REFUND"
  }
}
```

---

## 3. Resolving a Pending Hold

If `isUnderpayment` is `true`, the transaction will remain in `PENDING_REFUND` (on hold). The platform must make a decision using the following endpoints.

### **Option 1: Accept the Payment**
Accepts the underpayment as-is, updates the internal bookkeeping (marking the request as partially paid), and releases the funds for standard settlement.

* **Endpoint**: `POST /api/v1/payment-request/transaction/:transactionUuid/accept`
* **Headers**:
  * `x-api-key`: `{{your_platform_api_key}}`
  * `Content-Type`: `application/json`
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Payment accepted and queued for settlement"
  }
  ```

### **Option 2: Reject & Refund the Payment**
Rejects the payment, and triggers an automated transfer refund back to the customer's saved bank account (minus the gateway processing fee).

* **Endpoint**: `POST /api/v1/payment-request/transaction/:transactionUuid/reject`
* **Headers**:
  * `x-api-key`: `{{your_platform_api_key}}`
  * `Content-Type`: `application/json`
* **Response (`200 OK`)**:
  ```json
  {
    "success": true,
    "message": "Refund initiated successfully"
  }
  ```
