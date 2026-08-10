import { PrismaService } from '../infrastructure/prisma/prisma.service'

/**
 * Company-admin settings (Team, Payment, Branding, Email, Bulk Import)
 * are for account owners — not for employee-only team collaborators.
 *
 * Restricted when: accepted collaborator on someone else's team
 * AND owns zero properties AND has not invited their own team.
 */
export async function resolveCanManageCompanySettings(
  prisma: PrismaService,
  pmId: number,
): Promise<boolean> {
  const [ownedPropertyCount, ownsTeam, isCollaborator] = await Promise.all([
    (prisma as any).upward_pm_property.count({ where: { pmId } }),
    (prisma as any).upward_pm_team_collaboration.findFirst({
      where: { ownerPmId: pmId, status: 'ACCEPTED' },
      select: { id: true },
    }),
    (prisma as any).upward_pm_team_collaboration.findFirst({
      where: { collaboratorPmId: pmId, status: 'ACCEPTED' },
      select: { id: true },
    }),
  ])

  if (ownedPropertyCount > 0 || ownsTeam) return true
  if (isCollaborator) return false
  return true
}
