import { Injectable, Logger, Inject } from '@nestjs/common'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { UserRepository, USER_REPOSITORY } from '@domains/users/user.repository'
import { WAITLIST_REPOSITORY, WaitlistRepository } from '@domains/waitlist/waitlist.repository'
import * as bcrypt from 'bcrypt'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { EVENT_BUS, EventBus } from '@application/events/domain-event'

@Injectable()
export class CompleteUserProfileUseCase {
  private readonly logger = new Logger(CompleteUserProfileUseCase.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(EVENT_BUS) private readonly eventBus: EventBus,
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(WAITLIST_REPOSITORY) private readonly waitlistRepository: WaitlistRepository,
  ) {}

  async execute(dto: {
    email: string
    passwordPlain: string
    fullName: string
    phone?: string
    occupation?: string
    gender?: string
    dateOfBirth?: string
    profilePic?: string
  }) {
    const waitlistEntry = await this.waitlistRepository.findByEmail(dto.email)

    let passwordHash: string | undefined
    if (dto.passwordPlain && dto.passwordPlain.trim() !== '') {
      passwordHash = await bcrypt.hash(dto.passwordPlain, 10)
    }

    let user = await this.userRepository.findByEmail(dto.email)

    const userData: any = {
      email: dto.email,
      fullName: dto.fullName,
      phone: dto.phone,
      occupation: dto.occupation,
      gender: dto.gender,
      dateOfBirth: dto.dateOfBirth,
      profilePic: dto.profilePic || '',
      isConvertedFromWaitlist: !!waitlistEntry,
      isProfileComplete: true,
      hasDismissedAppBanner: false,
      useBiometrics: false,
    }

    if (passwordHash) {
      userData.passwordHash = passwordHash
    }

    if (user) {
      await this.userRepository.update(user.id, userData)
      user = await this.userRepository.findById(user.id)
    } else {
      if (!passwordHash) {
        throw new Error('Password is required for new user registration')
      }
      const newUser = {
        ...userData,
        passwordHash,
        id: crypto.randomUUID(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      await this.userRepository.save(newUser)
      user = newUser
    }

    if (!user) throw new Error('Failed to create/update user')

    const payload = { sub: user.id, email: user.email }
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET', 'super-secret-key'),
      expiresIn: '1h',
    })
    const refreshToken = this.jwtService.sign(
      { sub: user.id, type: 'refresh' },
      {
        secret: this.configService.get('JWT_REFRESH_SECRET', 'super-refresh-secret-key'),
        expiresIn: '7d',
      },
    )

    return {
      accessToken,
      refreshToken,
      user,
    }
  }
}
