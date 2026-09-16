import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';

export interface PmSearchResult {
  id?: number;
  uuid: string;
  name: string;
  firstName: string;
  lastName: string;
  businessName?: string | null;
  email: string;
  phone?: string | null;
  pmType?: string | null;
  isVerified: boolean;
  isExternal?: boolean;
  platformId?: number | null;
  companyUuid?: string | null;
  companyName?: string | null;
  companyEmail?: string | null;
  managerUuid?: string | null;
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
    const nameHash = this.encryption.hash(trimmed);
    const queryDigits = trimmed.replace(/\D/g, '');

    const results: PmSearchResult[] = [];
    const seenUuids = new Set<string>();

    // 1. Search Internal Property Managers (upward_property_manager)
    const directPmMatches = await this.prisma.upward_property_manager.findMany({
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

    const allPms = await this.prisma.upward_property_manager.findMany({
      where: {
        isBlocked: false,
        isManuallyBlocked: false,
      },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });

    const combinedPms = [...directPmMatches];
    const seenPmIds = new Set<number>(directPmMatches.map((m) => m.id));

    for (const pm of allPms) {
      if (!seenPmIds.has(pm.id)) {
        combinedPms.push(pm);
        seenPmIds.add(pm.id);
      }
    }

    for (const pm of combinedPms) {
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

        const matchesName = fullName.includes(trimmed) || `${decryptedLast} ${decryptedFirst}`.toLowerCase().includes(trimmed);
        const matchesBusiness = businessLower.includes(trimmed);
        const matchesEmail = emailLower.includes(trimmed);
        const matchesPhone = queryDigits.length >= 3 && phoneLower.includes(queryDigits);

        if (matchesName || matchesBusiness || matchesEmail || matchesPhone) {
          if (!seenUuids.has(pm.uuid)) {
            seenUuids.add(pm.uuid);
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
              isExternal: false,
            });
          }
        }

        if (results.length >= 8) break;
      } catch {
        // Skip records with decryption failures
        continue;
      }
    }

    // 2. Search External Platform Companies (upward_company where platformId IS NOT NULL)
    const directCompanyMatches = await this.prisma.upward_company.findMany({
      where: {
        platformId: { not: null },
        OR: [
          { emailHash },
          { phoneHash },
          { nameHash },
        ],
      },
      take: 10,
    });

    const allCompanies = await this.prisma.upward_company.findMany({
      where: {
        platformId: { not: null },
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    const combinedCompanies = [...directCompanyMatches];
    const seenCompanyIds = new Set<number>(directCompanyMatches.map((c) => c.id));
    for (const c of allCompanies) {
      if (!seenCompanyIds.has(c.id)) {
        combinedCompanies.push(c);
        seenCompanyIds.add(c.id);
      }
    }

    for (const comp of combinedCompanies) {
      try {
        const decryptedName = comp.name ? this.encryption.decrypt(comp.name) : '';
        const decryptedEmail = comp.email ? this.encryption.decrypt(comp.email) : '';
        const decryptedPhone = comp.phone ? this.encryption.decrypt(comp.phone) : '';

        const nameLower = decryptedName.toLowerCase();
        const emailLower = decryptedEmail.toLowerCase();
        const phoneLower = decryptedPhone.replace(/\D/g, '');

        const matchesName = nameLower.includes(trimmed);
        const matchesEmail = emailLower.includes(trimmed);
        const matchesPhone = queryDigits.length >= 3 && phoneLower.includes(queryDigits);

        if (matchesName || matchesEmail || matchesPhone) {
          if (!seenUuids.has(comp.uuid)) {
            seenUuids.add(comp.uuid);
            results.push({
              id: comp.id,
              uuid: comp.uuid,
              name: decryptedName || 'Property Management Co.',
              firstName: decryptedName || 'Company',
              lastName: '',
              businessName: decryptedName || null,
              email: decryptedEmail,
              phone: decryptedPhone || null,
              pmType: 'External Management Company',
              isVerified: true,
              isExternal: true,
              platformId: comp.platformId,
              companyUuid: comp.uuid,
              companyName: decryptedName,
              companyEmail: decryptedEmail,
            });
          }
        }
      } catch {
        continue;
      }
    }

    // 3. Search External Platform Managers (upward_manager linked to platform company)
    const allManagers = await this.prisma.upward_manager.findMany({
      where: {
        company: {
          platformId: { not: null },
        },
      },
      include: {
        company: true,
      },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });

    for (const mgr of allManagers) {
      try {
        const decryptedFirst = mgr.firstName ? this.encryption.decrypt(mgr.firstName) : '';
        const decryptedLast = mgr.lastName ? this.encryption.decrypt(mgr.lastName) : '';
        const decryptedEmail = mgr.email ? this.encryption.decrypt(mgr.email) : '';
        const decryptedPhone = mgr.phone ? this.encryption.decrypt(mgr.phone) : '';
        const decryptedCompanyName = mgr.company?.name ? this.encryption.decrypt(mgr.company.name) : '';
        const decryptedCompanyEmail = mgr.company?.email ? this.encryption.decrypt(mgr.company.email) : '';

        const fullName = `${decryptedFirst} ${decryptedLast}`.trim().toLowerCase();
        const companyLower = decryptedCompanyName.toLowerCase();
        const emailLower = decryptedEmail.toLowerCase();
        const phoneLower = decryptedPhone.replace(/\D/g, '');

        const matchesName = fullName.includes(trimmed) || `${decryptedLast} ${decryptedFirst}`.toLowerCase().includes(trimmed);
        const matchesCompany = companyLower.includes(trimmed);
        const matchesEmail = emailLower.includes(trimmed);
        const matchesPhone = queryDigits.length >= 3 && phoneLower.includes(queryDigits);

        if (matchesName || matchesCompany || matchesEmail || matchesPhone) {
          if (!seenUuids.has(mgr.uuid)) {
            seenUuids.add(mgr.uuid);
            results.push({
              id: mgr.id,
              uuid: mgr.uuid,
              name: `${decryptedFirst} ${decryptedLast}`.trim() || decryptedCompanyName || 'Property Manager',
              firstName: decryptedFirst,
              lastName: decryptedLast,
              businessName: decryptedCompanyName || null,
              email: decryptedEmail || decryptedCompanyEmail,
              phone: decryptedPhone || null,
              pmType: 'External Property Manager',
              isVerified: true,
              isExternal: true,
              platformId: mgr.company.platformId,
              companyUuid: mgr.company.uuid,
              companyName: decryptedCompanyName,
              companyEmail: decryptedCompanyEmail,
              managerUuid: mgr.uuid,
            });
          }
        }
      } catch {
        continue;
      }
    }

    return results.slice(0, 15);
  }
}
