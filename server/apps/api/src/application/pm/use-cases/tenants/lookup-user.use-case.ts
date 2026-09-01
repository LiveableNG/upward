import { Inject, Injectable } from '@nestjs/common';
import { USER_REPOSITORY, UserRepository } from '../../../../domains/users/user.repository';
import { EncryptionService } from '../../../../shared/infrastructure/common/encryption.service';

export interface LookupUserQuery {
  email?: string;
  phone?: string;
}

export interface LookupUserResult {
  exists: boolean;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string | null;
  };
}

@Injectable()
export class LookupUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly userRepository: UserRepository,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(query: LookupUserQuery): Promise<LookupUserResult> {
    try {
      let matchedUser = null;

      if (query.email && query.email.trim()) {
        matchedUser = await this.userRepository.findByEmail(query.email.trim());
      }

      if (!matchedUser && query.phone && query.phone.trim()) {
        let cleaned = query.phone.trim().replace(/\s+/g, '');
        if (!cleaned.startsWith('+')) {
          if (cleaned.startsWith('0') && cleaned.length === 11) {
            cleaned = '+234' + cleaned.substring(1);
          } else if (cleaned.length === 10) {
            cleaned = '+234' + cleaned;
          }
        }
        matchedUser = await this.userRepository.findByPhone(cleaned);
      }

      if (matchedUser) {
        const isDummyEmail = matchedUser.email?.endsWith('@upward.com');

        // If matched user only has a dummy @upward.com email, treat as non-existent
        if (isDummyEmail) {
          return { exists: false };
        }

        return {
          exists: true,
          user: {
            firstName: matchedUser.firstName,
            lastName: matchedUser.lastName,
            email: matchedUser.email,
            phone: matchedUser.phone,
          },
        };
      }
    } catch (e) {
      // Fail silently and return exists: false
    }

    return { exists: false };
  }
}
