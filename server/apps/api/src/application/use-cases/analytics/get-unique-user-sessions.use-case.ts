import { Injectable } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service';
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service';

export class UniqueUserSessionsQueryDto {
  @IsOptional()
  @IsString()
  page?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  platform?: string;
}

export interface UniqueUserSummary {
  userId: number | null;
  uuid?: string;
  email: string;
  name?: string;
  userPathway?: string;
  userRole?: string;
  platforms: string[]; // e.g. ['ios', 'android', 'web']
  devices: Array<{
    platform: string;
    deviceModel: string;
    osVersion?: string;
    sessionCount: number;
    lastSeenAt: string;
  }>;
  totalSessions: number;
  firstSeenAt: string;
  lastActiveAt: string;
  lastDropOffStage?: string;
  lastAction?: string;
  hasError: boolean;
}

@Injectable()
export class GetUniqueUserSessionsUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(query: UniqueUserSessionsQueryDto) {
    const pageNum = query.page ? parseInt(query.page, 10) : 1;
    const limitNum = query.limit ? parseInt(query.limit, 10) : 20;
    const skip = (pageNum - 1) * limitNum;

    const where: any = {
      app: 'upward-pay',
      userEmail: { not: null },
    };

    if (query.platform && query.platform !== 'ALL') {
      where.platform = query.platform;
    }

    if (query.search && query.search.trim()) {
      const s = query.search.trim();
      where.OR = [
        { userEmail: { contains: s, mode: 'insensitive' } },
        { deviceModel: { contains: s, mode: 'insensitive' } },
      ];
    }

    // 1. Group by userEmail to find distinct users and their session counts
    const groupedUsers = await (this.prisma as any).upward_user_session.groupBy({
      by: ['userEmail'],
      where,
      _count: {
        sessionId: true,
      },
      _min: {
        startedAt: true,
      },
      _max: {
        startedAt: true,
      },
      orderBy: {
        _max: {
          startedAt: 'desc',
        },
      },
    });

    const total = groupedUsers.length;
    const pagedGroups = groupedUsers.slice(skip, skip + limitNum);

    const emails: string[] = pagedGroups.map((g: any) => g.userEmail).filter(Boolean);

    if (emails.length === 0) {
      return {
        data: [],
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      };
    }

    // 2. Fetch User profiles from upward_user for these emails
    const uniqueEmails = Array.from(new Set<string>(emails));
    const emailHashes = uniqueEmails.map((email) => this.encryption.hash(email));

    const userRecords = emailHashes.length > 0
      ? await this.prisma.upward_user.findMany({
          where: {
            emailHash: { in: emailHashes },
          },
          select: {
            id: true,
            uuid: true,
            email: true,
            firstName: true,
            lastName: true,
            isFromInvite: true,
            isFromWaitlist: true,
          },
        })
      : [];

    const userProfileMap = new Map<string, any>();
    for (const u of userRecords) {
      let email = '';
      let firstName = '';
      let lastName = '';
      try {
        email = u.email ? this.encryption.decrypt(u.email) : '';
        firstName = u.firstName ? this.encryption.decrypt(u.firstName) : '';
        lastName = u.lastName ? this.encryption.decrypt(u.lastName) : '';
      } catch (err) {
        email = u.email || '';
        firstName = u.firstName || '';
        lastName = u.lastName || '';
      }
      const decryptedUser = {
        id: u.id,
        uuid: u.uuid,
        email,
        firstName,
        lastName,
        isFromInvite: u.isFromInvite,
        isFromWaitlist: u.isFromWaitlist,
      };
      if (email) {
        userProfileMap.set(email.toLowerCase(), decryptedUser);
      }
    }

    // 3. Fetch all sessions for these users to aggregate distinct devices and platforms
    const sessions = await (this.prisma as any).upward_user_session.findMany({
      where: {
        userEmail: { in: emails },
      },
      select: {
        id: true,
        sessionId: true,
        userEmail: true,
        userId: true,
        userRole: true,
        platform: true,
        deviceModel: true,
        osVersion: true,
        startedAt: true,
        dropOffStage: true,
        lastAction: true,
        hasError: true,
      },
      orderBy: { startedAt: 'desc' },
    });

    // Map sessions to userEmail
    const sessionsByUser = new Map<string, any[]>();
    for (const s of sessions) {
      const emailKey = s.userEmail.toLowerCase();
      const list = sessionsByUser.get(emailKey) || [];
      list.push(s);
      sessionsByUser.set(emailKey, list);
    }

    // 4. Build unique user summaries
    const data: UniqueUserSummary[] = pagedGroups.map((group: any) => {
      const email = group.userEmail;
      const emailKey = email.toLowerCase();
      const profile = userProfileMap.get(emailKey);
      const userSessions = sessionsByUser.get(emailKey) || [];

      // Platforms used
      const platformSet = new Set<string>();
      // Group by device
      const deviceMap = new Map<string, { platform: string; deviceModel: string; osVersion?: string; sessionCount: number; lastSeenAt: string }>();

      let hasError = false;
      let lastDropOffStage: string | undefined = undefined;
      let lastAction: string | undefined = undefined;

      for (let i = 0; i < userSessions.length; i++) {
        const s = userSessions[i];
        if (s.platform) platformSet.add(s.platform);
        if (s.hasError) hasError = true;
        if (i === 0) {
          lastDropOffStage = s.dropOffStage;
          lastAction = s.lastAction;
        }

        const devKey = `${s.platform}_${s.deviceModel || 'Unknown'}`;
        const existing = deviceMap.get(devKey);
        if (existing) {
          existing.sessionCount++;
        } else {
          deviceMap.set(devKey, {
            platform: s.platform,
            deviceModel: s.deviceModel || (s.platform === 'ios' ? 'Apple Device' : s.platform === 'android' ? 'Android Device' : 'Web Browser'),
            osVersion: s.osVersion || undefined,
            sessionCount: 1,
            lastSeenAt: s.startedAt?.toISOString() || new Date().toISOString(),
          });
        }
      }

      let userPathway = 'ORGANIC';
      if (profile?.isFromInvite) userPathway = 'INVITE';
      else if (profile?.isFromWaitlist) userPathway = 'WAITLIST';

      const name = profile && (profile.firstName || profile.lastName)
        ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
        : undefined;

      return {
        userId: profile?.id || userSessions[0]?.userId || null,
        uuid: profile?.uuid,
        email,
        name,
        userPathway,
        userRole: userSessions[0]?.userRole || 'TENANT',
        platforms: Array.from(platformSet),
        devices: Array.from(deviceMap.values()),
        totalSessions: group._count.sessionId,
        firstSeenAt: group._min.startedAt?.toISOString() || new Date().toISOString(),
        lastActiveAt: group._max.startedAt?.toISOString() || new Date().toISOString(),
        lastDropOffStage,
        lastAction,
        hasError,
      };
    });

    return {
      data,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    };
  }
}
