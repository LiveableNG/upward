# 5. Payment Infrastructure Setup

Upward handles financial operations using **Paystack** as the primary payment gateway. The payment module is designed to support:
1.  **Split Payments** (direct payouts to landlords/property managers while keeping a platform fee).
2.  **Dedicated Virtual Accounts (DVAs)** (automatic bank transfer tracking for tenants).
3.  **Overpayment Allocations** (crediting excess payments back to a tenant's balance).
4.  **Automatic Webhook Processing** (resilient payment confirmation).

---

## 1. Architectural Components

The payment layer is split across the standard Clean Architecture boundaries:

*   **Domain Interfaces (`src/domains/payments/payment.repository.ts`)**:
    *   Defines abstract structures for `SavedLandlord`, `Transaction`, `PaymentRequest`, `PaystackSubaccount`, `Overpayment`, and `DVAAccount`.
    *   Specifies `IPaymentGateway` detailing methods for initializing checkouts, verification, subaccount provisioning, DVA generation, and bank list resolution.
*   **Infrastructure Gateways (`src/shared/infrastructure/payments/paystack.gateway.ts`)**:
    *   Implements the actual HTTP client wrappers targeting Paystack's API.
*   **Application Services (`src/application/use-cases/payments/payment.use-cases.ts`)**:
    *   Orchestrates checkout lifecycles, ledger postings, DVA bindings, manual payments, and webhook resolution.

---

## 2. Split Payments (Subaccounts)

To split rental income, we provision Paystack Subaccounts for Landlords or Property Managers:
1.  During landlord onboarding, their bank account details are verified via `IPaymentGateway.verifyAccountNumber`.
2.  A subaccount is created on Paystack using `IPaymentGateway.findOrCreateSubaccount`.
3.  When a tenant makes a rent payment, the system initializes the checkout (`InitializePaymentUseCase`) pointing to that specific `subaccountCode`.
4.  Paystack splits the transaction amount at the gateway level, sending the rent directly to the landlord and the platform fee to Upward.

---

## 3. Dedicated Virtual Accounts (DVA)

For seamless bank transfers, we assign dedicated bank accounts directly to user properties:
1.  **Creation**: When a tenant completes profiling or connects to a property, the system provisions a customer on Paystack (`IPaymentGateway.createCustomer`) and hooks up a Dedicated Virtual Account (`IPaymentGateway.createDedicatedAccount`).
2.  **Mapping**: The generated bank account number and bank code are stored in the `DVAAccount` table, mapped to a `userPropertyId`.
3.  **Transfer Detection**:
    *   The tenant makes a standard bank transfer to their DVA.
    *   Paystack detects the incoming credit and pushes a webhook payload containing the customer and bank details.
    *   `ProcessPaymentWebhookUseCase` intercepts this, matches the account number to `DVAAccount`, and records a new payment transaction against the active rent invoice.

---

## 4. Overpayment Processing

If a tenant transfers more than their current rent requirement, the excess is tracked as an overpayment:
*   The payment handler calculates `outstandingBalance = rentInvoice.amount - rentInvoice.amountPaid`.
*   If `transaction.amount > outstandingBalance`, the system settles the invoice and records the difference in the `Overpayment` table.
*   Future billing runs query the `Overpayment` table to apply existing credits to new invoices.

---

## 5. Webhook Resiliency & Retries

*   **Webhook Log**: Every incoming/outgoing webhook payload is stored in the database (`WebhookLog`) with a lifecycle status (`PENDING`, `SENT`, `FAILED`).
*   **Signatures**: Incoming webhooks validation checks signature hashes to prevent spoofing.
*   **Job retry cron**: If a webhook handler fails to confirm payment due to third-party network timeouts, a cron daemon retries processing using backoff parameters.

---

## 6. Core Database Entities (Prisma)

Refer to these models inside the multi-file prisma schemas when dealing with payments:

*   **`Transaction`**: Records every payment event.
*   **`SavedLandlord`**: Holds landlord payout credentials and subaccount mapping.
*   **`PaystackSubaccount`**: Concrete split parameters for vendors.
*   **`DVAAccount`**: Virtual account mapping details.
*   **`Overpayment`**: Holds tenant credits for future rent runs.
*   **`PaymentRequest`**: Tracks invoice status (`PENDING`, `PARTIAL`, `PAID`).
