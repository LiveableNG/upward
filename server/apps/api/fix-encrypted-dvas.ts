import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { PrismaService } from './src/shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from './src/shared/infrastructure/common/encryption.service';
import { ConfigService, ConfigModule } from '@nestjs/config';

import { Module } from '@nestjs/common';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true })],
  providers: [PrismaService, EncryptionService],
})
class ScriptModule {}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ScriptModule);
  const prisma = app.get(PrismaService);
  const encryption = app.get(EncryptionService);
  const configService = app.get(ConfigService);
  
  const paystackSecret = configService.get<string>('PAYSTACK_SECRET_KEY');
  if (!paystackSecret) {
    throw new Error('PAYSTACK_SECRET_KEY not found in environment');
  }

  const headers = {
    Authorization: `Bearer ${paystackSecret}`,
    'Content-Type': 'application/json',
  };

  console.log('--- Scanning for PM DVAs with Encrypted Account Names ---');

  // Fetch all PM DVAs
  const dvas = await prisma.upward_pm_dedicated_virtual_account.findMany({
    include: {
      pm: true
    }
  });

  const affectedDvas = [];

  for (const dva of dvas) {
    const hexRegex = /[a-f0-9]{64,}/i;
    if (hexRegex.test(dva.accountName)) {
      affectedDvas.push(dva);
    }
  }

  console.log(`Found ${affectedDvas.length} affected DVA(s) to fix.\n`);

  for (const dva of affectedDvas) {
    const pm = dva.pm;
    const decryptedFirstName = encryption.decrypt(pm.firstName);
    const decryptedLastName = encryption.decrypt(pm.lastName);
    const decryptedBusinessName = pm.businessName ? encryption.decrypt(pm.businessName) : null;

    const correctFirstName = decryptedBusinessName || decryptedFirstName;
    const correctLastName = decryptedLastName || 'PM';

    console.log(`[PM ID: ${pm.id}] Fixing DVA for: ${correctFirstName} ${correctLastName}`);
    console.log(` - Current Broken Name: ${dva.accountName}`);
    
    try {
      console.log(' 1. Updating Paystack Customer details...');
      const updateRes = await fetch(`https://api.paystack.co/customer/${dva.paystackCustomerId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          first_name: correctFirstName,
          last_name: correctLastName,
        })
      });

      if (!updateRes.ok) {
        console.error(`Failed to update customer ${dva.paystackCustomerId}: ${await updateRes.text()}`);
        continue;
      }

      console.log(' 2. Fetching DVAs from Paystack to find ID for deactivation...');
      const fetchDvaRes = await fetch(`https://api.paystack.co/dedicated_account?customer=${dva.paystackCustomerId}`, {
        method: 'GET',
        headers,
      });

      const fetchDvaData = await fetchDvaRes.json();
      if (fetchDvaData.status && fetchDvaData.data && fetchDvaData.data.length > 0) {
        for (const account of fetchDvaData.data) {
          if (account.account_number === dva.accountNumber) {
            console.log(` 3. Deactivating DVA ${account.id} (${account.account_number}) on Paystack...`);
            const delRes = await fetch(`https://api.paystack.co/dedicated_account/${account.id}`, {
              method: 'DELETE',
              headers,
            });
            if (!delRes.ok) {
              console.warn(`Could not deactivate DVA on Paystack: ${await delRes.text()}`);
            } else {
              console.log(' -> Successfully deactivated on Paystack.');
            }
          }
        }
      } else {
        console.log(' -> No active DVAs found on Paystack for this customer.');
      }

      console.log(' 4. Removing DVA record from database to trigger regeneration...');
      await prisma.upward_pm_dedicated_virtual_account.delete({
        where: { id: dva.id }
      });
      
      console.log(' -> Successfully cleared DB record. A new DVA will be generated when the PM visits the wallet page.\n');

    } catch (err: any) {
      console.error(`Error processing PM ID ${pm.id}: ${err.message}`);
    }
  }

  console.log('--- Remediation Complete ---');
  await app.close();
}

bootstrap().catch(err => {
  console.error(err);
  process.exit(1);
});
