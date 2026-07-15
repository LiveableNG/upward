import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ProcessPendingSequencesUseCase } from './application/use-cases/whatsapp-sequence/process-pending-sequences.use-case';
import { PrismaService } from './shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from './shared/infrastructure/common/encryption.service';
import * as crypto from 'crypto';

async function bootstrap() {
  console.log('Bootstrapping app context...');
  const app = await NestFactory.createApplicationContext(AppModule);

  const processUseCase = app.get(ProcessPendingSequencesUseCase);
  const prisma = app.get(PrismaService);
  const encryption = app.get(EncryptionService);

  const testNumbers = ['+2348142844591', '+2348124618329'];

  for (const phone of testNumbers) {
    console.log(`Setting up test data for ${phone}...`);

    // 1. Create a dummy user so the foreign key constraints pass
    const testEmail = `test-${Date.now()}-${Math.random().toString(36).substring(7)}@upward.com`;

    // Encrypt the name so we can test if the processor decrypts it correctly
    const encryptedFirstName = encryption.encrypt('John (Test)');
    const encryptedPMName = encryption.encrypt('Upward (Test)');

    const user = await prisma.upward_user.create({
      data: {
        uuid: crypto.randomUUID(),
        email: testEmail,
        emailHash: encryption.hash(testEmail),
        firstName: encryptedFirstName,
        firstNameHash: encryption.hash('John (Test)'),
        lastName: encryption.encrypt('Doe'),
        lastNameHash: encryption.hash('Doe'),
        phone: encryption.encrypt(phone),
        phoneHash: encryption.hash(phone),
        passwordHash: 'dummy',
        isFromWaitlist: false,
        isFromInvite: false,
      }
    });

    console.log(`Created test user ${user.id}`);

    // 2. Add pending sequence with ENCRYPTED names in the templateData
    await prisma.upward_whatsapp_sequence_log.create({
      data: {
        userId: user.id,
        phoneEncrypted: user.phone!,
        phoneHash: encryption.hash(phone),
        stage: 'DAY_2',
        status: 'PENDING',
        scheduledFor: new Date(),
        templateName: 'upward_seq_day2_v2', // Changed to Day 2 template
        templateData: { body_text: [[encryptedFirstName]] }, // Day 2 only takes the name
      }
    });
  }

  console.log('\nRunning ProcessPendingSequencesUseCase...');
  await processUseCase.execute();
  console.log('Processor finished!');

  await app.close();
  process.exit(0);
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
