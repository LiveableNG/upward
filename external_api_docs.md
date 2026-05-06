# Upward External API Documentation

This API allows property management platforms and software providers to integrate with Upward. It provides endpoints for platform registration and tenant invitation.

## 1. Platform Registration
Before you can invite tenants, your platform must be registered to obtain an `x-api-key`.

**Method**: `POST`  
**Endpoint**: `/api/v1/platform/get-key`

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | The name of your platform. |
| `email` | `string` | **Yes** | Contact email for the platform. |
| `webhookUrl` | `string` | **Yes** | URL where Upward will send event notifications. |
| `address` | `string` | No | Physical address of the platform office. |

#### Request format
```json
{
  "name": "Liveable Platform",
  "email": "[EMAIL_ADDRESS]",
  "webhookUrl": "https://liveable.ng/webhook",
  "address": "No 1 High Street, Lagos"
}
```
#### Response
```json
{
  "id": "platform-uuid",
  "apiKey": "up_sk_live_...",
  "name": "Liveable Platform",
  "email": "contact@liveable.ng"
}
```
> [!IMPORTANT]
> **Store your API key securely.** The raw key is only shown once during creation. On our servers, it is stored as a SHA-256 hash.


---

## 2. Tenant Invitations
Once you have an API key, you can generate invite links for your tenants.

**Method**: `POST`  
**Endpoint**: `/api/v1/single/invite`

#### Authentication
Include your API key in the headers:
| Header | Value |
| :--- | :--- |
| `x-api-key` | `your_raw_api_key_here` |

#### Request Body Schema
The request follows a nested structure to coordinate between companies, users, and properties.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `company` | `Object` | **Yes** | Details about the property management company. |
| `invite` | `Object` | **Yes** | Nested object containing user and property info. |

### Company Object
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `uuid` | `string` | No | Upward Company UUID (if already known). |
| `name` | `string` | Cond. | Required if `id` is not provided. Case-insensitive search. |
| `address` | `string` | No | Company's physical address. |

### Invite Object
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `user` | `Object` | **Yes** | The tenant being invited. |
| `properties` | `Array<Object>` | **Yes** | List of lease and location details (one or more units). |

### User Object
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | **Yes** | Tenant's email address (unique identifier). |
| `firstName` | `string` | **Yes** | Tenant's first name. |
| `lastName` | `string` | **Yes** | Tenant's last name. |
| `phone` | `string` | No | Tenant's phone number. |

### Property Object
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `location` | `Object` | **Yes** | Physical location of the unit. |
| `rent` | `Object` | **Yes** | Financial terms of the lease. |
| `manager` | `Object` | No | The manager responsible (Optional). |
| `paymentAccount`| `Object` | No | Direct settlement details (Optional). |

### Location Object
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `country` | `string` | **Yes** | Defaults to "Nigeria". |
| `state` | `string` | **Yes** | State or Province (e.g., "Lagos"). |
| `area` | `string` | **Yes** | Neighborhood (e.g., "Ikoyi"). |
| `address` | `string` | No | Street address. |
| `subarea` | `string` | No | Apartment/Unit number. Fallback is `address`. |

### Rent Object
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `rentAmount` | `number` | **Yes** | Total rent amount. |
| `rentStartDate` | `string` | **Yes** | ISO-8601 date. |
| `rentEndDate` | `string` | **Yes** | ISO-8601 date. |

### Manager Object
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `uuid` | `string` | No | Upward Manager UUID (if already known). |
| `phone` | `string` | No | Manager's phone number. |
| `email` | `string` | Cond. | Required if `uuid` is not provided. |

### Payment Account Object (Direct Settlement)
This object allows you to pre-configure where the funds for this property should be settled. Providing this during invitation ensures the tenant doesn't have to enter bank details manually.

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `bank_code` | `string` | **Yes** | 3-digit bank code (e.g. "058" or "999992"). |
| `account_number`| `string` | **Yes** | 10-digit NUBAN account number. |
| `account_name` | `string` | No | Verified name on the account. |
| `bank_name` | `string` | No | Human-readable bank name. |

---

### Request Example
```json
{
  "company": {
    "name": "Global Properties LTD",
    "address": "No 1 High Street, Lagos"
  },
  "invite": {
    "user": {
      "email": "john.doe@gmail.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+2348001112222"
    },
    "properties": [
      {
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
          "email": "bisi@globalprop.ng",
          "phone": "+2349030303030"
        },
        "paymentAccount": {
          "bank_name": "OPay Digital Services Limited (OPay)",
          "bank_code": "999992",
          "account_name": "AFONYA AFOKE OMERHI",
          "account_number": "8034094074"
        }
      }
    ]
  }
}
```

{
  "success": true,
  "message": "Created",
  "data": {
    "userId": "b7a71853-2d7a-4399-af09-115a6c1406ce",
    "companyId": "a1b2c3d4-...",
    "email": "john.doe@gmail.com",
    "inviteLink": "http://localhost:3000/invite/b7a71853-...",
    "properties": [
      { "uuid": "5cab404a-...", "address": "Bourdillon Road", "managerUuid": "f1c2d3e4-..." }
    ]
  }
}
```

---

## 3. Adding More Properties
If a user is already registered or has been invited, you can add more properties to their profile under a specific company.

**Method**: `POST`  
**Endpoint**: `/api/v1/single/invite/:userUuid/properties`

#### Request Body Schema
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `companyUuid` | `string` | **Yes** | The UUID of the company managing the new property. |
| `properties` | `Array<Object>` | **Yes** | List of property objects (same schema as section 2). |

### Request Example
```json
{
  "companyUuid": "a1b2c3d4-...",
  "properties": [
    {
      "location": { "country": "Nigeria", "state": "Lagos", "area": "Surulere", "address": "Stadium Road" },
      "rent": { "rentAmount": 150000, "rentEndDate": "2025-06-01" },
      "manager": { "firstName": "Sola", "lastName": "Adebayo", "email": "sola@luxuryliving.com" }
    }
  ]
}
```

### Response Example
```json
{
  "success": true,
  "message": "Properties added",
  "data": {
    "userId": "b7a71853-...",
    "companyId": "a1b2c3d4-...",
    "email": "john.doe@gmail.com",
    "properties": [
      { "uuid": "new-prop-uuid-...", "address": "Stadium Road", "managerUuid": "..." }
    ]
  }
}
```

---

## 4. Payment Requests
Generate a payment link for a tenant based on an existing property or by initiating an auto-invite.

**Method**: `POST`  
**Endpoint**: `/api/v1/payment-request`

#### Request Body Schema
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `userPropertyUuid` | `string` | Cond. | Required if `invite` is not provided. Target property UUID. |
| `amount` | `number` | No | Total amount. Defaults to property rent amount. |
| `currency` | `string` | No | Currency (e.g., "NGN"). Defaults to property currency. |
| `description` | `string` | No | Narrative for the payment request. |
| `lineItems` | `Array` | No | Breakdown of the amount (e.g., security, cleanup). |
| `allowPartial` | `Boolean` | No | Whether to allow partial payments (Default: `false`) |
| `dueDate` | `string` | **Yes** | ISO-8601 date. |
| `bankCode` | `string` | **Yes** | 3-digit bank code for direct settlement (split payments). |
| `accountNumber` | `string` | **Yes** | 10-digit NUBAN account number for settlement. |
| `invite` | `Object` | Cond. | Full invite payload if performing a "Cold Start". |

> [!NOTE]
> **Line Item Constraint**: If `lineItems` are provided, the sum of all item amounts **must exactly match** the total `amount` provided in the request. If `amount` is not provided, the sum must match the property's default rent amount.

### Request Example (Existing Property)
```json
{
  "userPropertyUuid": "5cab404a-df37-4408-826b-e8b820e26fac",
  "dueDate": "2024-04-05",
  "description": "April 2024 Rent",
  "amount": 45000,
  "currency": "NGN",
  "allowPartial": true,
  "bankCode": "058",
  "accountNumber": "0123456789",
  "lineItems": [
    { "name": "Security Fee", "amount": 25000 },
    { "name": "Waste Management", "amount": 20000 }
  ]
}
```

### Request Example (Cold Start - Auto-Invite)
Use this if the tenant has not been invited to Upward yet. This will create the user and property automatically.

```json
{
  "invite": {
    "company": { "name": "Global Properties LTD" },
    "invite": {
      "user": {
        "email": "jane.doe@example.com",
        "firstName": "Jane",
        "lastName": "Doe"
      },
      "properties": [
        {
          "location": { "country": "Nigeria", "state": "Lagos", "area": "Ikoyi" },
          "rent": {
            "rentAmount": 5000000,
            "rentEndDate": "2025-01-01T00:00:00Z"
          },
          "manager": { "firstName": "Bisi", "lastName": "Manager", "email": "bisi@globalprop.ng" }
        }
      ]
    }
  },
  "dueDate": "2024-06-15T00:00:00Z",
  "description": "Initial Deposit & Security Fee",
  "amount": 500000,
  "bankCode": "011",
  "accountNumber": "0987654321"
}
```

### Response Example
```json
{
  "success": true,
  "data": {
    "paymentUuid": "d8e9f0a1-...",
    "paymentLink": "http://localhost:3000/pay/d8e9f0a1-..."
  }
}
```

---

## 5. Credibility Verification
This section allows platforms to verify and provide historical tenancy data for their users upon request. When a tenant requests their credibility history for a property managed on your platform, Upward will notify you via a webhook.

### Fulfill a Credibility Request
Use this endpoint to provide the requested tenancy records.

**Method**: `POST`  
**Endpoint**: `/api/v1/credibility/request/:uuid/fulfill`

#### Path Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `uuid` | `string` | The `requestUuid` received in the webhook. |

#### Request Body
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `records` | `Array<Object>` | **Yes** | List of payment records to ingest. |

### Record Object
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `amount` | `number` | **Yes** | Amount paid. |
| `dueDate` | `string` | **Yes** | ISO-8601 date when the payment was due. |
| `paidDate` | `string` | **Yes** | ISO-8601 date when the payment was made. |

#### Request Example
```json
{
  "records": [
    {
      "amount": 450000,
      "dueDate": "2024-01-01T00:00:00Z",
      "paidDate": "2024-01-03T10:00:00Z"
    },
    {
      "amount": 450000,
      "dueDate": "2024-02-01T00:00:00Z",
      "paidDate": "2024-02-01T09:00:00Z"
    }
  ]
}
```

### Reject a Credibility Request
If you cannot fulfill the request (e.g., the user was never at that property), you can explicitly reject it.

**Method**: `POST`  
**Endpoint**: `/api/v1/credibility/request/:uuid/reject`

---

## 6. Implementation Notes
1. **Case Insensitivity**: Company name searches are case-insensitive.
2. **Entity Persistence**: If a company or manager with the same details exists, Upward will link to the existing record.
3. **Mandatory Rent**: For invitations, `rentAmount`, `rentStartDate`, and `rentEndDate` must be provided.
4. **API Security**: Raw API keys are hashed on the server.
5. **Automated Settlement**: Providing `paymentAccount` (during invite) or `bankCode`/`accountNumber` (in a payment request) triggers automated settlement. Upward resolves or creates a persistent Paystack subaccount. Settlement priority:
    1. `paymentAccount` details specified in the property invitation.
    2. Explicit `bankCode`/`accountNumber` provided in an individual payment request.
    3. Property Manager's primary settlement account (if assigned).
    4. Company's primary settlement account.
6. **Robust Property Matching**: To prevent duplicate property records, Upward matches invitations against existing records using a combination of **User + Company + Address**. If an exact match is found (even with a different manager), the existing record is updated and reused.
7. **Optional Managers**: If a property is managed directly by a company without a specific assigned staff member, the `manager` object in invitations/add-property can be omitted.
8. **Partial & Overpayments**: 
    *   **Partial**: Tenants can pay less than the requested amount. The platform will receive a `payment.updated` webhook with the `remainingAmount`.
    *   **Overpayment**: If a tenant pays more than the total requested amount, the excess is recorded as a "Future Credit" in Upward. This credit is tracked and can be applied to future bills.
9. **Credibility Workflow**: When a platform receives a `past_tenancy_record.requested` webhook, they can either:
    *   **Automate**: Fetch the user's payment history from their own DB and call the `/fulfill` endpoint programmatically.
    *   **Redirect**: Provide the `fillingPageLink` to their internal property managers to fill the records manually via the Upward UI.

---

## 7. Webhook Notifications
Upward sends asynchronous notifications to the `webhookUrl` provided during platform registration to keep your system in sync.

### Event: `payment.updated`
Triggered whenever a payment is made towards a request. Use the `status` field to determine if the request is now fully resolved (`PAID`) or remains `PARTIAL`.

#### Payload Structure (Full Resolution Example)
```json
{
  "event": "payment.updated",
  "data": {
    "paymentUuid": "d8e9f0a1-...",
    "reference": "EXT_5cab404a...",
    "amountPaid": 45000,
    "totalPaid": 45000,
    "remainingAmount": 0,
    "overpaymentAmount": 0,
    "currency": "NGN",
    "status": "PAID",
    "paidAt": "2024-06-15T14:30:00Z",
    "customerEmail": "jane.doe@example.com"
  }
}
```

#### Payload Structure (Partial Payment Example)
```json
{
  "event": "payment.updated",
  "data": {
    "paymentUuid": "d8e9f0a1-...",
    "reference": "EXT_5cab404a...",
    "amountPaid": 20000,
    "totalPaid": 20000,
    "remainingAmount": 25000,
    "overpaymentAmount": 0,
    "currency": "NGN",
    "status": "PARTIAL",
    "paidAt": "2024-06-15T14:45:00Z",
    "customerEmail": "jane.doe@example.com"
  }
}
```

### Event: `invite.accepted`
Triggered when a tenant successfully signs up and activates their account via the invite link.

#### Payload Structure
*   **Company/Manager Resolution**: 
    *   Providing a `uuid` will attempt to link to an existing record.
    *   If no `uuid` is provided, `name` (for companies) or `email` (for managers) is used to find or create the record. Full details are required for creation.
    *   **Properties Managed by Company Only**: If the `manager` object is omitted, the property is linked directly to the company, and settlement routing falls back to the company's business name.

### Payment Requests
*   **Sum Validation**: If you provide `lineItems`, their total sum **must match** the main `amount` field. This prevents reconciliation errors.
*   **Settlement Routing**: `bankCode` and `accountNumber` are required for every payment request. This allows Upward to route funds to the specific landlord's account automatically.
*   **Idempotency (Upsert)**: Sending a payment request with the same `userPropertyUuid`, `amount`, and `dueDate` as a pending one will **update** the existing request rather than creating a duplicate.

### Credibility Verification
*   **Sequential Records**: Ensure records are provided in a logical chronological order for best user experience on the tenant's profile.
*   **Data Accuracy**: Fulfilling a request marks it as `COMPLETED`. This data is used to calculate the user's Rent Score.

---

## 9. Webhook Delivery Details
1. **Method**: `POST`
2. **Content-Type**: `application/json`
3. **Expectation**: Your server should return a `200 OK` response within 5 seconds.
4. **Retries**: If your server is down or returns an error (non-2xx), Upward will retry the delivery with an exponential backoff (e.g., after 5m, 15m, 1h, 6h, 24h).
