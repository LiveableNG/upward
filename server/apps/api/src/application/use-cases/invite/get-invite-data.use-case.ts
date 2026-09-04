import { Injectable, Inject, NotFoundException } from '@nestjs/common'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'
import { VERIFICATION_TOKEN_REPOSITORY, VerificationTokenRepository } from '../../../domains/auth/verification-token.repository'
import { UserAuthService } from '../../auth/user-auth.service'
import { EncryptionService } from '../../../shared/infrastructure/common/encryption.service'

export interface GetInviteDataResponse {
  success: boolean
  isWaitlist: boolean
  hasPassword?: boolean
  email?: string
  phone?: string | null
  isPhoneOnly?: boolean
  firstName?: string
  lastName?: string
  company?: { name: string; profilePic?: string } | null
  manager?: { name: string } | null
  property?: {
    rentAmount?: number
    location?: { area?: string; city?: string; country?: string } | null
  } | null
}

@Injectable()
export class GetInviteDataUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(VERIFICATION_TOKEN_REPOSITORY) private readonly tokenRepository: VerificationTokenRepository,
    private readonly userAuthService: UserAuthService,
    private readonly encryption: EncryptionService,
  ) {}

  async execute(token: string): Promise<GetInviteDataResponse> {
    try {
      const waitlist = await this.userAuthService.getWaitlistClaimData(token)
      if (waitlist) {
        return {
          success: true,
          isWaitlist: true,
        }
      }
    } catch {
      // Ignore if waitlist entry is not found, proceed to normal invite checks
    }

    let userUuid: string | undefined
    const vt = await this.tokenRepository.findByToken(token)

    if (vt && vt.context === 'INVITE' && vt.expiresAt >= new Date()) {
      userUuid = vt.identifier
    } else {
      const user = await this.userRepository.findByUuid(token)
      if (user && user.passwordHash === 'INVITED') {
        userUuid = token
      }
    }

    if (!userUuid) {
      throw new NotFoundException('Invite link is invalid or has expired')
    }

    const user = await this.userRepository.findByUuid(userUuid)
    if (!user) {
      throw new NotFoundException('Invited user not found')
    }

    const hasPassword = !!user.passwordHash && user.passwordHash !== '' && user.passwordHash !== 'INVITED'
    const companyUser = user.companyUsers?.[0]
    const property = user.properties?.[0]

    let managerName = ''
    if (property?.manager) {
      const firstNameDecrypted = property.manager.firstName ? this.encryption.decrypt(property.manager.firstName) : ''
      const lastNameDecrypted = property.manager.lastName ? this.encryption.decrypt(property.manager.lastName) : ''
      managerName = `${firstNameDecrypted} ${lastNameDecrypted}`.trim()
    }

    let companyName = ''
    if (companyUser?.company?.name) {
      try {
        companyName = this.encryption.decrypt(companyUser.company.name)
      } catch {
        companyName = ''
      }
    }

    return {
      success: true,
      isWaitlist: false,
      hasPassword,
      email: user.email,
      phone: user.phone,
      isPhoneOnly: user.email.endsWith('@upward.com'),
      firstName: user.firstName,
      lastName: user.lastName,
      company: companyUser ? {
        name: companyName,
        profilePic: (companyUser.company as any)?.profilePic,
      } : null,
      manager: managerName ? { name: managerName } : null,
      property: property ? {
        rentAmount: property.rentAmount,
        location: property.location ? {
          area: property.location.area,
          city: property.location.state,
          country: property.location.country
        } : null
      } : null
    }
  }
}
