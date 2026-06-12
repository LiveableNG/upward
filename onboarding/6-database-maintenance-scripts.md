# 6. Database Maintenance & Operations Scripts

Because developers do not have credentials to the live production database, they must manage their local development environments by running and writing diagnostic scripts. The Upward backend includes pre-built scripts located in the root of `server/apps/api` and under `server/apps/api/scripts/`.

---

## 1. How to Execute Scripts

When executing these scripts, make sure you are in the `server/apps/api/` directory (or use workspace command delegators).

### For JavaScript/ESM Scripts (`.js` or `.mjs`)
Run using standard Node.js:
```bash
# From server/apps/api
node clear_subaccounts.js
node scripts/simulate-dva-transfer.js
```

### For TypeScript Scripts (`.ts`)
Run using `tsx` (TypeScript Execute, which is pre-installed in development packages):
```bash
# From server/apps/api
npx tsx scripts/create-admin-row.ts
npx tsx scripts/view_db.ts
```

---

## 2. Directory Script Reference

### Root Scripts (`server/apps/api/*`)
| Script Name | Language | Purpose |
| :--- | :--- | :--- |
| `clear_subaccounts.js` | JS | Resets subaccount relationships on property/payment models and purges local `DVAAccount` and `PaystackSubaccount` tables. |
| `remove_corrupt.js` | JS | Cleanup utility for removing records with corrupt format hashes. |
| `test_webhook.js` | JS | Sends test HTTP trigger events mimicking third-party payment gateways. |
| `check_db.ts` | TS | Simple database latency check. |

### Subfolder Scripts (`server/apps/api/scripts/*`)
| Script Name | Language | Purpose |
| :--- | :--- | :--- |
| `simulate-dva-transfer.js` | JS | Simulates an incoming bank transfer webhook from Paystack to verify automated DVA ledger creations. |
| `view_db.ts` | TS | Prints summary statistics and select rows from your local database tables. |
| `create-admin-row.ts` | TS | Seeds a new developer or system admin record into the database. |
| `check_no_password_users.js` | JS | Diagnostic scanner identifying users lacking hashed passwords (e.g. shadow or waitlist invitees). |
| `export-waitlist-csv.ts` | TS | Exports all waitlist tables to a readable `.csv` dump. |
| `manual_waitlist_addition.ts` | TS | Manually registers new entries on the waitlist. |
| `find_platform.ts` | TS | Queries registered platform credentials. |

---

## 3. Writing Your Own Local Scripts

If you need to perform custom local modifications (e.g. batch updates, resetting mock test properties), follow this layout to ensure your scripts interface cleanly with Prisma and read local environment parameters:

```javascript
// Example: server/apps/api/scripts/my-custom-script.js
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// 1. Load environment variables from .env relative to script path
const envPath = path.resolve(__dirname, '../.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split(/\r?\n/).forEach((line) => {
    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      process.env[key.trim()] = valueParts.join('=').trim().replace(/^["'](.*)["']$/, '$1');
    }
  });
}

const prisma = new PrismaClient();

async function main() {
  console.log('🤖 Executing custom db script...');
  
  // Custom query operations
  const usersCount = await prisma.upward_user.count();
  console.log(`System has ${usersCount} users registered.`);
}

main()
  .catch((err) => console.error('❌ Script failed:', err))
  .finally(async () => {
    await prisma.$disconnect();
  });
```
