import { Injectable, Inject } from '@nestjs/common';
import { ILandlordRepository, PM_LANDLORD_REPOSITORY } from '../../../domains/pm/ILandlordRepository';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';
import { EmailService } from '../../../shared/infrastructure/email/email.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class LandlordService {
  constructor(
    @Inject(PM_LANDLORD_REPOSITORY)
    private readonly landlordRepository: ILandlordRepository,
    private readonly encryption: EncryptionService,
    private readonly emailService: EmailService,
    private readonly config: ConfigService,
  ) {}

  async ensureLandlord(email: string, name?: string, phone?: string) {
    if (!email) return;

    const existing = await this.landlordRepository.findByEmail(email);
    if (existing) {
      const portalUrl = this.config.get('PM_LANDLORD_PORTAL_URL', 'http://localhost:3000/portal/login');
      await this.emailService.sendLandlordNewPropertyAssignment({
        email,
        landlordName: existing.firstName || name || 'Landlord',
        portalLink: portalUrl,
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

      const portalUrl = this.config.get('PM_LANDLORD_PORTAL_URL', 'https://upward-pm.vercel.app/portal/login');
      await this.emailService.sendLandlordWelcome({
        email,
        landlordName: name || 'Landlord',
        tempPassword,
        portalLink: portalUrl,
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
