# Upward External Invite API Documentation

This API allows third-party property management software to seamlessly invite tenants to the Upward platform. By calling this API, you can pre-populate tenant profiles, set up their tenancy details, and generate unique invite links for email distribution.

## Authentication

All requests to the External API must include an `x-api-key` header.

| Header | Value | Description |
| :--- | :--- | :--- |
| `x-api-key` | `up_sk_test_7f8d2e9a1b4c` | Your master software service API key. |

> [!IMPORTANT]
> This key is hardcoded

## Endpoints

### Batch/Single Invite Tenants

**Method**: `POST`  
**Endpoint**: `/external/invites`

> [!NOTE]
> All passable parameters in the request body are **optional** except for fields explicitly marked as **Yes** in the "Required" column.

#### Request Body Schema

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `company` | `Object` | **Yes** | Details about the property management company. |
| `manager` | `Object` | No | Details about the manager sending the invitation. |
| `invites` | `Array` or `Object` | **Yes** | A single invite object or an array of invite objects. |

#### Company Object Schema

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | **Yes** | The full name of the company. |
| `address` | `string` | No | Company's physical address. |
| `profilePic` | `string` | No | URL to the company's logo/profile picture. |

#### Manager Object Schema

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `firstName` | `string` | **Yes** | Manager's first name. |
| `lastName` | `string` | **Yes** | Manager's last name. |
| `email` | `string` | **Yes** | Manager's email (unique identifier). |
| `phone` | `string` | No | Manager's phone number. |

#### Invite Object Schema (Tenant & Lease Details)

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | **Yes** | Tenant's email address. |
| `firstName` | `string` | **Yes** | Tenant's first name. |
| `lastName` | `string` | **Yes** | Tenant's last name. |
| `phone` | `string` | No | Tenant's phone number. |
| `country` | `string` | No | Country name (Defaults to "Nigeria"). |
| `state` | `string` | No | State (e.g., "Lagos"). |
| `city` | `string` | No | City or Local Government Area. |
| `area` | `string` | No | Specific neighborhood or area (e.g., "Victoria Island"). |
| `subarea` | `string` | No | Detailed part of the address (e.g., "Penthouse B"). |
| `address` | `string` | No | Full street address. |
| `rentAmount` | `number` | No | Total rent amount for the period. |
| `rentStartDate` | `string` | No | Lease start date (ISO-8601: `YYYY-MM-DD`). |
| `rentEndDate` | `string` | No | Lease end date / Due date (ISO-8601: `YYYY-MM-DD`). |

#### Comprehensive Request Example

```json
{
  "company": {
    "name": "Acme Residential Management",
    "address": "123 Business District, Lagos",
    "profilePic": "https://cdn.acme.com/logo-sq.png"
  },
  "manager": {
    "firstName": "Opeyemi",
    "lastName": "Adetunji",
    "email": "opeyemi@acme-residential.com",
    "phone": "+2348000000000"
  },
  "invites": [
    {
      "email": "john.doe.test@gmail.com",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "+2348012345678",
      "country": "Nigeria",
      "state": "Lagos",
      "city": "Lagos Island",
      "area": "Victoria Island",
      "subarea": "Penthouse B",
      "address": "45 Corporate Way",
      "rentAmount": 5500000,
      "rentStartDate": "2024-04-01",
      "rentEndDate": "2025-03-31"
    }
  ]
}
```

#### Example Response

```json
{
  "success": true,
  "data": [
    {
      "email": "john.doe@gmail.com",
      "success": true,
      "inviteLink": "https://localhost:3000/invite/6628b7a1-8d2a-4c91-b072-4d2c8038bca1"
    }
  ]
}
```

## Testing with CURL

All passable parameters in the request body are optional except the ones marked as required.

```bash
curl -X POST http://localhost:4000/api/v1/external/invites \
  -H "Content-Type: application/json" \
  -H "x-api-key: up_sk_test_7f8d2e9a1b4c" \
  -d '{
    "company": {
      "name": "Acme Residential Management",
      "address": "123 Business District, Lagos",
      "profilePic": "https://cdn.acme.com/logo-sq.png"
    },
    "manager": {
      "firstName": "Opeyemi",
      "lastName": "Adetunji",
      "email": "opeyemi@acme-residential.com",
      "phone": "+2348000000000"
    },
    "invites": [
      {
        "email": "john.doe.test@gmail.com",
        "firstName": "John",
        "lastName": "Doe",
        "phone": "+2348012345678",
        "country": "Nigeria",
        "state": "Lagos",
        "city": "Lagos Island",
        "area": "Victoria Island",
        "subarea": "Penthouse B",
        "address": "45 Corporate Way",
        "rentAmount": 5500000,
        "rentStartDate": "2024-04-01",
        "rentEndDate": "2025-03-31"
      }
    ]
  }'
```

## Implementation Flow

1. **Auto-Link**: The system intelligently maps tenants to companies and managers based on the payload.
2. **Location Granularity**: By providing `state`, `area`, and `subarea`, the tenant's profile is automatically populated with a structured residential history.
3. **Activation**: The tenant clicks the `inviteLink`, verifies their information, and sets a password to start using Upward.
