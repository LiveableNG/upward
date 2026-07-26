import { Injectable, Inject } from '@nestjs/common';
import { ILandlordRepository, PM_LANDLORD_REPOSITORY } from '../../../domains/pm/ILandlordRepository';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { UnifiedCommunicationService } from '../../../shared/infrastructure/communication/unified-communication.service';

@Injectable()
export class LandlordService {
  constructor(
    @Inject(PM_LANDLORD_REPOSITORY)
    private readonly landlordRepository: ILandlordRepository,
    private readonly encryption: EncryptionService,
    private readonly config: ConfigService,
    private readonly unifiedCommService: UnifiedCommunicationService,
  ) {}

  async ensureLandlord(email: string, name?: string, phone?: string, pmUuid?: string) {
    if (!email) return;

    const existing = await this.landlordRepository.findByEmail(email);
    if (existing) {
      const defaultPortalUrl = this.config.get<string>('PM_APP_URL') ? `${this.config.get<string>('PM_APP_URL')}/portal/login` : 'http://localhost:3000/portal/login';
      const portalUrl = this.config.get('PM_LANDLORD_PORTAL_URL', defaultPortalUrl);
      await this.unifiedCommService.processCommunication({
        recipientEmail: email,
        recipientPhone: phone,
        recipientName: existing.firstName || name || 'Landlord',
        recipientRole: 'LANDLORD',
        pmUuid,
        type: 'LANDLORD_PROPERTY_ASSIGNMENT',
        context: {
          landlordName: existing.firstName || name || 'Landlord',
          portalLink: portalUrl,
        },
      });
      return existing;
    }

    const tempPassword = Math.random().toString(36).slice(-8);
    const passwordHash = await bcrypt.hash(tempPassword, 10);
    const uuid = crypto.randomUUID();

    try {
      const landlord = await this.landlordRepository.create({
        uuid,
        email,
        emailHash: this.encryption.hash(email),
        passwordHash,
        firstName: name,
        phone,
        mustChangePassword: true,
      });

      const defaultPortalUrl = this.config.get<string>('PM_APP_URL') ? `${this.config.get<string>('PM_APP_URL')}/portal/login` : 'https://upward-pm.vercel.app/portal/login';
      const portalUrl = this.config.get('PM_LANDLORD_PORTAL_URL', defaultPortalUrl);
      await this.unifiedCommService.processCommunication({
        recipientEmail: email,
        recipientPhone: phone,
        recipientName: name || 'Landlord',
        recipientRole: 'LANDLORD',
        pmUuid,
        type: 'LANDLORD_WELCOME',
        context: {
          landlordName: name || 'Landlord',
          tempPassword,
          portalLink: portalUrl,
        },
      });

      return landlord;
    } catch (error: any) {
      if (error.code === 'P2002') {
        return this.landlordRepository.findByEmail(email);
      }
      throw error;
    }
  }
}
