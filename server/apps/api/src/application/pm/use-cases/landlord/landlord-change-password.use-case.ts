import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LandlordAuthService } from '../../../auth/landlord-auth.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class LandlordChangePasswordUseCase {
  constructor(
    private readonly landlordAuthService: LandlordAuthService
  ) {}

  async execute(landlordUuid: string, newPassword: string) {
    const passwordHash = await bcrypt.hash(newPassword, 10);
    await this.landlordAuthService.changePassword(landlordUuid, passwordHash);
    return { success: true };
  }
}
