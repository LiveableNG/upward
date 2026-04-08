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
| `id` | `number` | No | Upward Company ID (if already known). |
| `name` | `string` | Cond. | Required if `id` is not provided. Case-insensitive search. |
| `address` | `string` | No | Company's physical address. |

### Invite Object
| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `user` | `Object` | **Yes** | The tenant being invited. |
| `property` | `Object` | **Yes** | Lease and location details. |

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
| `manager` | `Object` | **Yes** | The manager responsible for this unit. |

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
| `id` | `number` | No | Upward Manager ID (if already known). |
| `firstName` | `string` | Cond. | Required if `id` is not provided. |
| `lastName` | `string` | Cond. | Required if `id` is not provided. |
| `email` | `string` | Cond. | Required if `id` is not provided. |
| `phone` | `string` | No | Manager's phone number. |

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
}
```

### Response Example
```json
{
  "success": true,
  "message": "Created",
  "data": [
    {
      "userId": "b7a71853-2d7a-4399-af09-115a6c1406ce",
      "managerId": "f1c2d3e4-...",
      "companyId": "a1b2c3d4-...",
      "email": "john.doe@gmail.com",
      "inviteLink": "http://localhost:3000/invite/b7a71853-2d7a-4399-af09-115a6c1406ce"
    }
  ]
}
```

## Implementation Notes
1. **Case Insensitivity**: Company name searches are case-insensitive.
2. **Entity Persistence**: If a company or manager with the same details exists, Upward will link to the existing record and update its details if new ones are provided.
3. **API Security**: Raw API keys are hashed on the server. If you lose your key, you must generate a new one.
