import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'
import { PASS_PLACEHOLDERS } from '../../../domains/users/user.repository'

@Injectable()
export class GetInvitationTrackerUseCase {
  private readonly logger = new Logger(GetInvitationTrackerUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute() {
    // 1. Fetch all TENANT_INVITE communication logs (ordered asc so last write = most recent)
    const inviteLogs = await this.prisma.upward_communication_log.findMany({
      where: { type: 'TENANT_INVITE' },
      orderBy: { createdAt: 'asc' },
    })

    // 2. Fetch all PM tenants to identify people
    const pmTenants = await this.prisma.upward_pm_tenant.findMany({
      where: { isInternal: false },
      include: { pm: true },
    })

    // 3. Fetch users to determine conversion status
    const users = await this.prisma.upward_user.findMany({
      where: { isInternal: false },
      select: {
        id: true,
        emailHash: true,
        phoneHash: true,
        passwordHash: true,
        transactions: {
          where: { status: 'SUCCESS' },
          select: { id: true },
        },
      },
    })

    // ── Build lookup maps ──────────────────────────────────────────
    const userMapByEmail = new Map<string, any>()
    const userMapByPhone = new Map<string, any>()
    users.forEach((u) => {
      if (u.emailHash) userMapByEmail.set(u.emailHash, u)
      if (u.phoneHash) userMapByPhone.set(u.phoneHash, u)
    })

    // Map from hashed contact info → tenant UUID  (so same person via phone or email → same UUID)
    const contactHashToTenantUuid = new Map<string, string>()
    const tenantByUuid = new Map<string, any>()

    pmTenants.forEach((t) => {
      tenantByUuid.set(t.uuid, t)
      if (t.emailHash) contactHashToTenantUuid.set(t.emailHash, t.uuid)
      if (t.phoneHash) contactHashToTenantUuid.set(t.phoneHash, t.uuid)
    })

    // ── Pre-compute hash cache (avoid re-hashing the same string multiple times) ──
    const hashCache = new Map<string, string>()
    const getHash = (value: string): string => {
      if (!hashCache.has(value)) hashCache.set(value, this.encryption.hash(value))
      return hashCache.get(value)!
    }

    // ── Group logs by tenant UUID (de-duplicating phone + email) ──
    // For logs that can't be matched to a tenant, fall back to the raw recipient string as key
    type TrackerEntry = {
      tenantUuid: string | null
      recipients: Set<string>          // all contact strings (email + phone) seen for this person
      totalSent: number
      channelCounts: Record<string, number>
      lastSentChannel: string
      lastSentDate: Date
    }

    const trackerMap = new Map<string, TrackerEntry>()

    inviteLogs.forEach((log) => {
      const rawRecipient = log.recipient || log.email
      if (!rawRecipient) return

      const cleanRecipient = rawRecipient.toLowerCase().trim()
      const recipientHash = getHash(cleanRecipient)

      // Resolve to a canonical key (tenant UUID if possible, else raw recipient)
      const tenantUuid = contactHashToTenantUuid.get(recipientHash) || null
      const mapKey = tenantUuid ?? cleanRecipient

      if (!trackerMap.has(mapKey)) {
        trackerMap.set(mapKey, {
          tenantUuid,
          recipients: new Set<string>(),
          totalSent: 0,
          channelCounts: {},
          lastSentChannel: log.channel,
          lastSentDate: log.createdAt,
        })
      }

      const entry = trackerMap.get(mapKey)!
      entry.recipients.add(cleanRecipient)
      entry.totalSent += 1
      entry.channelCounts[log.channel] = (entry.channelCounts[log.channel] || 0) + 1
      // Since logs are ordered asc, each iteration overwrites with a newer date
      entry.lastSentChannel = log.channel
      entry.lastSentDate = log.createdAt
    })

    // ── Build output rows ──────────────────────────────────────────
    const result = Array.from(trackerMap.entries()).map(([_key, entry]) => {
      let tenantName = ''
      let pmName = ''

      if (entry.tenantUuid) {
        const t = tenantByUuid.get(entry.tenantUuid)
        if (t) {
          try {
            const fn = t.firstNameEncrypted ? this.encryption.decrypt(t.firstNameEncrypted) : (t.firstNameSearch || '')
            const ln = t.lastNameEncrypted ? this.encryption.decrypt(t.lastNameEncrypted) : (t.lastNameSearch || '')
            tenantName = `${fn} ${ln}`.trim()
          } catch {
            tenantName = `${t.firstNameSearch || ''} ${t.lastNameSearch || ''}`.trim()
          }

          if (t.pm) {
            try {
              const biz = t.pm.businessName ? this.encryption.decrypt(t.pm.businessName) : ''
              const pfn = t.pm.firstName ? this.encryption.decrypt(t.pm.firstName) : ''
              const pln = t.pm.lastName ? this.encryption.decrypt(t.pm.lastName) : ''
              pmName = biz || `${pfn} ${pln}`.trim()
            } catch {
              pmName = 'Platform'
            }
          }
        }
      }

      // Determine conversion status — try all hashed contact values for this person
      let status = 'PENDING'
      for (const r of Array.from(entry.recipients)) {
        const h = getHash(r)  // uses cache — no re-computation
        const user = userMapByEmail.get(h) || userMapByPhone.get(h)
        if (user) {
          const isShadow =
            !user.passwordHash ||
            user.passwordHash === PASS_PLACEHOLDERS.INVITED ||
            user.passwordHash === PASS_PLACEHOLDERS.SHADOW ||
            user.passwordHash === 'INVITED_NO_PASSWORD' ||
            user.passwordHash === 'SHADOW_GUEST' ||
            (!user.passwordHash.startsWith('$2') &&
              user.passwordHash !== PASS_PLACEHOLDERS.SOCIAL &&
              user.passwordHash !== 'SOCIAL_AUTH')

          const hasPaid = user.transactions && user.transactions.length > 0
          status = isShadow ? (hasPaid ? 'GUEST_PAID' : 'PENDING') : (hasPaid ? 'SIGNED_UP_PAID' : 'SIGNED_UP')
          break
        }
      }

      // Use the first recipient as display (prefer non-phone if available, else phone)
      const recipientsArr = Array.from(entry.recipients)
      const displayRecipient =
        recipientsArr.find((r) => r.includes('@')) || recipientsArr[0] || ''

      return {
        recipient: displayRecipient,
        allRecipients: recipientsArr,
        tenantName,
        pmName: pmName || 'Platform',
        totalSent: entry.totalSent,
        channelsUsed: Object.keys(entry.channelCounts),
        channelCounts: entry.channelCounts,
        lastSentChannel: entry.lastSentChannel,
        lastSentDate: entry.lastSentDate,
        status,
      }
    })

    // Sort newest last-sent first
    result.sort((a, b) => b.lastSentDate.getTime() - a.lastSentDate.getTime())

    // ── Summary stats ──────────────────────────────────────────────
    const summary = {
      EMAIL: { sent: 0, converted: 0 },
      SMS: { sent: 0, converted: 0 },
      WHATSAPP: { sent: 0, converted: 0 },
    }

    result.forEach((r) => {
      const isConverted = r.status !== 'PENDING'
      // Credit conversion to the last channel used
      const lastCh = r.lastSentChannel as keyof typeof summary
      Object.entries(r.channelCounts).forEach(([ch, count]) => {
        const k = ch as keyof typeof summary
        if (summary[k] !== undefined) {
          summary[k].sent += count
        }
      })
      if (isConverted && summary[lastCh] !== undefined) {
        summary[lastCh].converted += 1
      }
    })

    return { data: result, summary }
  }
}
