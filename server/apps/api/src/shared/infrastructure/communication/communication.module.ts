import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { SmsModule } from '../sms/sms.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { EncryptionService } from '../common/encryption.service';
import { UnifiedCommunicationService } from './unified-communication.service';
import { CommunicationEventHandler } from '../../../application/events/handlers/communication.handler';

@Global()
@Module({
  imports: [ConfigModule, PrismaModule, EmailModule, SmsModule, WhatsappModule],
  providers: [EncryptionService, UnifiedCommunicationService, CommunicationEventHandler],
  exports: [UnifiedCommunicationService],
})
export class CommunicationModule {}
