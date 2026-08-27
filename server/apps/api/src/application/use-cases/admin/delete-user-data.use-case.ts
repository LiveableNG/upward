import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

export interface DeleteUserDataDto {
  targetId: string
  role: 'PROPERTY_MANAGER' | 'USER'
  reason?: string
  adminId: string
  adminEmail: string
}

@Injectable()
export class DeleteUserDataUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(dto: DeleteUserDataDto): Promise<{ success: boolean; message: string }> {
    const { targetId, role, reason, adminId, adminEmail } = dto
    const now = new Date()

    if (role === 'PROPERTY_MANAGER') {
      const pm = await (this.prisma as any).upward_property_manager.findUnique({
        where: { uuid: targetId },
      })

      if (!pm) {
        throw new NotFoundException('Property Manager not found')
      }

      // ACTIVE ACCOUNT SAFEGUARD: Bar deletion if active
      if (!pm.isBlocked && !pm.isManuallyBlocked) {
        throw new BadRequestException('Cannot delete an active account. Please disable or suspend the account first.')
      }

      const disabledAt = pm.disabledAt ? new Date(pm.disabledAt) : new Date(pm.updatedAt)
      const diffMs = now.getTime() - disabledAt.getTime()
      const daysDisabled = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

      let email = pm.email || ''
      try {
        email = this.encryption.decrypt(email)
      } catch {}

      await this.prisma.$transaction(async (tx: any) => {
        // 1. Record Audit Log in upward_deletion_audit_log
        await tx.upward_deletion_audit_log.create({
          data: {
            adminId,
            adminEmail,
            targetUserId: pm.uuid,
            targetEmail: email,
            targetRole: 'PROPERTY_MANAGER',
            disabledAt,
            daysDisabled,
            reason: reason || 'Manual Admin Permanent Data Deletion',
          },
        })

        // 2. Record in upward_admin_log
        await tx.upward_admin_log.create({
          data: {
            adminId,
            action: 'PERMANENT_DATA_DELETION',
            details: `Permanently deleted Property Manager data (${email}, UUID: ${pm.uuid}). Days disabled: ${daysDisabled}. Reason: ${reason || 'N/A'}`,
          },
        })

        // 3. Clean up associated company/platform record if created for PM
        if (pm.businessName || email) {
          const businessNameHash = pm.businessName ? this.encryption.hash(pm.businessName) : null
          const emailHash = pm.emailHash || (email ? this.encryption.hash(email) : null)

          await tx.upward_company.deleteMany({
            where: {
              OR: [
                ...(emailHash ? [{ emailHash }] : []),
                ...(businessNameHash ? [{ nameHash: businessNameHash }] : []),
              ],
            },
          })
        }

        // 4. Perform cascading delete of PM
        await tx.upward_property_manager.delete({
          where: { id: pm.id },
        })
      })

      return {
        success: true,
        message: `Property Manager account (${email}) and associated data permanently deleted.`,
      }
    } else {
      const user = await (this.prisma as any).upward_user.findUnique({
        where: { uuid: targetId },
      })

      if (!user) {
        throw new NotFoundException('User account not found')
      }

      // ACTIVE ACCOUNT SAFEGUARD: Bar deletion if active
      if (!user.isBlocked && !user.isManuallyBlocked) {
        throw new BadRequestException('Cannot delete an active account. Please disable or suspend the account first.')
      }

      const disabledAt = user.disabledAt ? new Date(user.disabledAt) : new Date(user.updatedAt)
      const diffMs = now.getTime() - disabledAt.getTime()
      const daysDisabled = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

      let email = user.email || ''
      try {
        email = this.encryption.decrypt(email)
      } catch {}

      await this.prisma.$transaction(async (tx: any) => {
        // 1. Record Audit Log in upward_deletion_audit_log
        await tx.upward_deletion_audit_log.create({
          data: {
            adminId,
            adminEmail,
            targetUserId: user.uuid,
            targetEmail: email,
            targetRole: 'USER',
            disabledAt,
            daysDisabled,
            reason: reason || 'Manual Admin Permanent Data Deletion',
          },
        })

        // 2. Record in upward_admin_log
        await tx.upward_admin_log.create({
          data: {
            adminId,
            action: 'PERMANENT_DATA_DELETION',
            details: `Permanently deleted User data (${email}, UUID: ${user.uuid}). Days disabled: ${daysDisabled}. Reason: ${reason || 'N/A'}`,
          },
        })

        // 3. Perform cascading delete of User
        await tx.upward_user.delete({
          where: { id: user.id },
        })
      })

      return {
        success: true,
        message: `User account (${email}) and associated data permanently deleted.`,
      }
    }
  }
}
