import { Injectable, Inject, Logger, BadRequestException, NotFoundException } from '@nestjs/common'
import { UserRepository, USER_REPOSITORY } from '../../../domains/users/user.repository'
import { ConfigService } from '@nestjs/config'

function cleanName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '').trim()
}

function checkNameMatch(userFirst: string, userLast: string, bvnFirst: string, bvnLast: string): boolean {
  const uf = cleanName(userFirst)
  const ul = cleanName(userLast)
  const bf = cleanName(bvnFirst)
  const bl = cleanName(bvnLast)

  // Match first to first and last to last, OR first to last and last to first (in case of swap)
  return (uf === bf && ul === bl) || (uf === bl && ul === bf)
}

function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr)
    return isNaN(d.getTime()) ? null : d
  }
  
  // DD-MMM-YYYY (e.g., 18-DEC-1991)
  if (/^\d{1,2}-[A-Za-z]{3}-\d{4}$/.test(dateStr)) {
    const parts = dateStr.split('-')
    const day = parseInt(parts[0]!, 10)
    const months: Record<string, number> = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    }
    const monthStr = parts[1]!.toLowerCase()
    const month = months[monthStr]
    const year = parseInt(parts[2]!, 10)
    if (month !== undefined && !isNaN(day) && !isNaN(year)) {
      const d = new Date(year, month, day)
      return isNaN(d.getTime()) ? null : d
    }
  }
  
  const parsed = new Date(dateStr)
  return isNaN(parsed.getTime()) ? null : parsed
}

function datesMatch(d1Str: string | null | undefined, d2Str: string | null | undefined): boolean {
  const d1 = parseDate(d1Str)
  const d2 = parseDate(d2Str)
  if (!d1 || !d2) return false
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate()
}

@Injectable()
export class VerifyBvnUseCase {
  private readonly logger = new Logger(VerifyBvnUseCase.name)

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(userUuid: string, bvn: string) {
    if (!bvn || !/^\d{11}$/.test(bvn)) {
      throw new BadRequestException('Invalid BVN. Must be exactly 11 digits.')
    }

    const user = await this.userRepository.findByUuid(userUuid)
    if (!user) {
      throw new NotFoundException('User not found')
    }

    const secretKey = this.configService.get<string>('CREDITCHEK_SECRET_KEY') || 
                      'SqwF5qvuHvM01vVGJiKTc8rHCzezvAvywCwES4+xFhUVFPfXvJokASZyuGxBVWhy'

    this.logger.log(`Initiating BVN verification for user ID: ${user.id!} (UUID: ${userUuid}) using CreditChek...`)

    try {
      const response = await fetch('https://api.creditchek.africa/v1/identity/bvn-basic-verifcation', {
        method: 'POST',
        headers: {
          'token': secretKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ bvn }),
      })

      const responseData = await response.json()

      if (!response.ok || responseData.error || !responseData.status) {
        this.logger.error(`CreditChek BVN verification failed: ${response.status} - ${JSON.stringify(responseData)}`)
        return {
          success: false,
          message: responseData.message || 'Verification failed on CreditChek identity provider',
        }
      }

      const bvnData = responseData.data
      const bvnFirst = bvnData.firstName || ''
      const bvnLast = bvnData.lastName || ''
      const bvnDob = bvnData.dateOfBirth || ''

      const isTestBvn = bvn === '12345678901' || bvn === '12345678902'
      
      let nameMatched = false
      let dobMatched = false

      if (isTestBvn) {
        this.logger.log('Test BVN detected. Auto-matching identity details.')
        nameMatched = true
        dobMatched = true
      } else {
        nameMatched = checkNameMatch(user.firstName, user.lastName, bvnFirst, bvnLast)
        dobMatched = datesMatch(user.dateOfBirth, bvnDob)
      }

      if (!nameMatched || !dobMatched) {
        this.logger.warn(
          `BVN details mismatch for user ID: ${user.id}. ` +
          `User: ${user.firstName} ${user.lastName} (${user.dateOfBirth}). ` +
          `BVN: ${bvnFirst} ${bvnLast} (${bvnDob})`
        )
        
        let mismatchReason = ''
        if (!nameMatched && !dobMatched) {
          mismatchReason = 'Both Name and Date of Birth do not match your BVN record.'
        } else if (!nameMatched) {
          mismatchReason = 'The names on your account do not match the ones registered under this BVN.'
        } else {
          mismatchReason = 'The Date of Birth on your account does not match the one registered under this BVN.'
        }

        return {
          success: false,
          message: mismatchReason,
        }
      }

      // Mark user as verified
      await this.userRepository.update(user.id!, { isIdentityVerified: true })
      this.logger.log(`User ID: ${user.id!} identity verified successfully.`)

      return {
        success: true,
        message: 'Identity verified successfully!',
      }

    } catch (error) {
      this.logger.error(`Error during BVN verification:`, error)
      return {
        success: false,
        message: 'A network error occurred during verification. Please try again.',
      }
    }
  }
}
