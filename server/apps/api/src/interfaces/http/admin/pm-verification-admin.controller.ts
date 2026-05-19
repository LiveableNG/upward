import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common'
import { AdminJwtAuthGuard } from '../../../application/auth/guards/admin-jwt-auth.guard'
import { RolesGuard } from '../../../application/auth/guards/roles.guard'
import { PrismaService } from '../../../shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

@Controller('admin/pm-verifications')
@UseGuards(AdminJwtAuthGuard, RolesGuard)
export class PmVerificationAdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  @Get()
  async getVerifications(
    @Query('status') status?: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const take = parseInt(limit)

    const where: any = status ? { status } : {}

    const [items, total] = await Promise.all([
      this.prisma.upward_pm_verification.findMany({
        where,
        include: {
          pm: {
            select: {
              firstName: true,
              lastName: true,
              email: true,
              businessName: true,
              pmType: true,
              uuid: true,
              country: true,
              phone: true,
              cacNumber: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.upward_pm_verification.count({ where }),
    ])

    const decryptedItems = items.map((item: any) => {
      if (item.pm) {
        return {
          ...item,
          pm: {
            ...item.pm,
            firstName: item.pm.firstName ? this.encryption.decrypt(item.pm.firstName) : '',
            lastName: item.pm.lastName ? this.encryption.decrypt(item.pm.lastName) : '',
            email: item.pm.email ? this.encryption.decrypt(item.pm.email) : '',
            businessName: item.pm.businessName ? this.encryption.decrypt(item.pm.businessName) : null,
            phone: item.pm.phone ? this.encryption.decrypt(item.pm.phone) : null,
          }
        }
      }
      return item
    })

    return {
      items: decryptedItems,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    }
  }

  @Post(':id/approve')
  @HttpCode(HttpStatus.OK)
  async approveVerification(@Param('id') id: string) {
    const verification = await this.prisma.upward_pm_verification.findUnique({
      where: { id: parseInt(id) }
    })

    if (!verification) throw new Error('Verification not found')

    return this.prisma.$transaction(async (tx) => {
      // Update verification status
      await tx.upward_pm_verification.update({
        where: { id: parseInt(id) },
        data: { status: 'APPROVED' }
      })

      // Mark PM as verified
      return tx.upward_property_manager.update({
        where: { id: verification.pmId },
        data: { isVerified: true }
      })
    })
  }

  @Post(':id/reject')
  @HttpCode(HttpStatus.OK)
  async rejectVerification(@Param('id') id: string, @Body() body: { reason: string }) {
    return this.prisma.upward_pm_verification.update({
      where: { id: parseInt(id) },
      data: { 
        status: 'REJECTED',
        rejectionReason: body.reason
      }
    })
  }
}
