import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';

export interface PmSearchResult {
  id: number;
  uuid: string;
  name: string;
  firstName: string;
  lastName: string;
  businessName?: string | null;
  email: string;
  phone?: string | null;
  pmType?: string | null;
  isVerified: boolean;
}

@Injectable()
export class SearchPmUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(query?: string): Promise<PmSearchResult[]> {
    const trimmed = (query || '').trim().toLowerCase();
    if (!trimmed || trimmed.length < 2) {
      return [];
    }

    const emailHash = this.encryption.hash(trimmed);
    const phoneHash = this.encryption.hash(trimmed);

    // 1. Check exact hash matches first
    const directMatches = await this.prisma.upward_property_manager.findMany({
      where: {
        OR: [
          { emailHash },
          { phoneHash },
        ],
        isBlocked: false,
        isManuallyBlocked: false,
      },
      take: 10,
    });

    // 2. Fetch candidate PMs to search across decrypted names & company names
    const allPms = await this.prisma.upward_property_manager.findMany({
      where: {
        isBlocked: false,
        isManuallyBlocked: false,
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    const combinedList = [...directMatches];
    const seenIds = new Set<number>(directMatches.map((m) => m.id));

    for (const pm of allPms) {
      if (!seenIds.has(pm.id)) {
        combinedList.push(pm);
        seenIds.add(pm.id);
      }
    }

    const results: PmSearchResult[] = [];

    for (const pm of combinedList) {
      try {
        const decryptedFirst = pm.firstName ? this.encryption.decrypt(pm.firstName) : '';
        const decryptedLast = pm.lastName ? this.encryption.decrypt(pm.lastName) : '';
        const decryptedBusiness = pm.businessName ? this.encryption.decrypt(pm.businessName) : '';
        const decryptedEmail = pm.email ? (this.encryption.decrypt(pm.email).includes('@') ? this.encryption.decrypt(pm.email) : pm.email) : '';
        const decryptedPhone = pm.phone ? this.encryption.decrypt(pm.phone) : '';

        const fullName = `${decryptedFirst} ${decryptedLast}`.trim().toLowerCase();
        const businessLower = decryptedBusiness.toLowerCase();
        const emailLower = decryptedEmail.toLowerCase();
        const phoneLower = decryptedPhone.replace(/\D/g, '');
        const queryDigits = trimmed.replace(/\D/g, '');

        const matchesName = fullName.includes(trimmed) || `${decryptedLast} ${decryptedFirst}`.toLowerCase().includes(trimmed);
        const matchesBusiness = businessLower.includes(trimmed);
        const matchesEmail = emailLower.includes(trimmed);
        const matchesPhone = queryDigits.length >= 3 && phoneLower.includes(queryDigits);

        if (matchesName || matchesBusiness || matchesEmail || matchesPhone) {
          results.push({
            id: pm.id,
            uuid: pm.uuid,
            name: `${decryptedFirst} ${decryptedLast}`.trim() || decryptedBusiness || 'Property Manager',
            firstName: decryptedFirst,
            lastName: decryptedLast,
            businessName: decryptedBusiness || null,
            email: decryptedEmail,
            phone: decryptedPhone || null,
            pmType: pm.pmType || 'Property Manager',
            isVerified: !!pm.isVerified,
          });
        }

        if (results.length >= 8) break;
      } catch {
        // Skip records with decryption failures
        continue;
      }
    }

    return results;
  }
}
