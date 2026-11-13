import { UnauthorizedException } from '@nestjs/common'
import { UserRepository } from '../../../domains/users/user.repository'

export async function resolveUserId(
  userIdentifier: number | string,
  userRepo?: UserRepository,
): Promise<number> {
  if (typeof userIdentifier === 'number') {
    return userIdentifier
  }
  if (!userRepo) {
    throw new UnauthorizedException('User repository unavailable')
  }
  const user = await userRepo.findByUuid(userIdentifier)
  if (!user?.id) {
    throw new UnauthorizedException('User not found')
  }
  return user.id
}
