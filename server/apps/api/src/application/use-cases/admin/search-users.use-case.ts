import { Injectable, Inject } from '@nestjs/common'
import { USER_REPOSITORY, UserRepository } from '../../../domains/users/user.repository'

@Injectable()
export class SearchUsersUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepo: UserRepository,
  ) {}

  async execute(search: string) {
    const allUsers = await this.userRepo.findAll()
    
    if (!search) {
      return allUsers.slice(0, 50).map(u => ({
        id: u.uuid,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email
      }))
    }

    const query = search.toLowerCase()
    
    const filtered = allUsers.filter(u => 
      u.email.toLowerCase().includes(query) ||
      u.firstName.toLowerCase().includes(query) ||
      u.lastName.toLowerCase().includes(query) ||
      `${u.firstName} ${u.lastName}`.toLowerCase().includes(query)
    )

    return filtered.slice(0, 20).map(u => ({
      id: u.uuid,
      name: `${u.firstName} ${u.lastName}`,
      email: u.email
    }))
  }
}
