import { BadRequestException } from '@nestjs/common'
import { SingleInviteUseCase, InviteRequest } from '@application/use-cases/external/single-invite.use-case'
import { UserRepository } from '@domains/users/user.repository'
import {
  CompanyRepository,
  ManagerRepository,
  CompanyUserRepository,
} from '@domains/companies/company.repository'
import {
  PropertyRepository,
  LocationRepository,
} from '@domains/companies/property.repository'
import { PrismaService } from '@shared/infrastructure/prisma/prisma.service'
import { EncryptionService } from '@shared/infrastructure/common/encryption.service'

// ─── Helpers ────────────────────────────────────────────────────────────────

const makeUser = (overrides: Partial<any> = {}) => ({
  id: 1,
  uuid: 'user-uuid-001',
  email: 'john.doe@example.com',
  firstName: 'John',
  lastName: 'Doe',
  phone: '08012345678',
  passwordHash: 'INVITED',
  isFromInvite: true,
  isFromWaitlist: false,
  emailHash: 'hash',
  firstNameHash: 'hash',
  lastNameHash: 'hash',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeCompany = (overrides: Partial<any> = {}) => ({
  id: 10,
  uuid: 'company-uuid-001',
  name: 'Acme Properties',
  address: '123 Victoria Island',
  platformId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeManager = (overrides: Partial<any> = {}) => ({
  id: 20,
  uuid: 'manager-uuid-001',
  companyId: 10,
  firstName: 'Grace',
  lastName: 'Adeyemi',
  email: 'grace@acme.com',
  phone: '08099887766',
  emailHash: 'hash',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeProperty = (overrides: Partial<any> = {}) => ({
  id: 30,
  uuid: 'property-uuid-001',
  userId: 1,
  companyId: 10,
  managerId: 20,
  locationId: 40,
  rentAmount: 500000,
  rentEndDate: new Date('2026-12-31'),
  currency: 'NGN',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeLocation = (overrides: Partial<any> = {}) => ({
  id: 40,
  uuid: 'location-uuid-001',
  country: 'Nigeria',
  state: 'Lagos',
  area: 'Lekki',
  subarea: 'Phase 1',
  address: 'Plot 5, Lekki',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

const makeCompanyUser = (overrides: Partial<any> = {}) => ({
  id: 50,
  companyId: 10,
  userId: 1,
  invitedAt: new Date(),
  ...overrides,
})

const validInviteRequest = (): InviteRequest => ({
  company: {
    name: 'Acme Properties',
    address: '123 Victoria Island',
  },
  invite: {
    user: {
      email: 'john.doe@example.com',
      firstName: 'John',
      lastName: 'Doe',
      phone: '08012345678',
    },
    property: {
      location: {
        country: 'Nigeria',
        state: 'Lagos',
        area: 'Lekki',
        subarea: 'Phase 1',
        address: 'Plot 5, Lekki',
      },
      rent: {
        rentAmount: 500000,
        rentStartDate: '2026-01-01',
        rentEndDate: '2026-12-31',
      },
      manager: {
        firstName: 'Grace',
        lastName: 'Adeyemi',
        email: 'grace@acme.com',
        phone: '08099887766',
      },
    },
  },
})

// ─── Test Suite ─────────────────────────────────────────────────────────────

describe('SingleInviteUseCase', () => {
  let useCase: SingleInviteUseCase
  let prisma: jest.Mocked<PrismaService>
  let encryption: jest.Mocked<EncryptionService>
  let userRepository: jest.Mocked<UserRepository>
  let companyRepository: jest.Mocked<CompanyRepository>
  let managerRepository: jest.Mocked<ManagerRepository>
  let companyUserRepository: jest.Mocked<CompanyUserRepository>
  let propertyRepository: jest.Mocked<PropertyRepository>
  let locationRepository: jest.Mocked<LocationRepository>

  beforeEach(() => {
    prisma = {} as any
    encryption = { encrypt: jest.fn(), decrypt: jest.fn() } as any

    userRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      findByUuid: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any

    companyRepository = {
      findById: jest.fn(),
      findByUuid: jest.fn(),
      findByName: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any

    managerRepository = {
      findById: jest.fn(),
      findByUuid: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any

    companyUserRepository = {
      findByCompanyAndUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    } as any

    propertyRepository = {
      findById: jest.fn(),
      findByUuid: jest.fn(),
      findByUserId: jest.fn().mockResolvedValue([]),
      save: jest.fn(),
      update: jest.fn(),
    } as any

    locationRepository = {
      findById: jest.fn(),
      findByUuid: jest.fn(),
      save: jest.fn(),
    } as any

    useCase = new SingleInviteUseCase(
      prisma,
      encryption,
      userRepository,
      companyRepository,
      managerRepository,
      companyUserRepository,
      propertyRepository,
      locationRepository,
    )
  })

  // ── execute() ─────────────────────────────────────────────────────────────

  describe('execute', () => {
    it('should return invite context with userId, managerId, companyId, userPropertyUuid, email and inviteLink', async () => {
      companyRepository.findByName.mockResolvedValue(null)
      companyRepository.save.mockResolvedValue(makeCompany() as any)
      managerRepository.findByEmail.mockResolvedValue(null)
      managerRepository.save.mockResolvedValue(makeManager() as any)
      userRepository.findByEmail.mockResolvedValue(null)
      userRepository.save.mockResolvedValue(makeUser() as any)
      companyUserRepository.findByCompanyAndUser.mockResolvedValue(null)
      companyUserRepository.save.mockResolvedValue(makeCompanyUser() as any)
      locationRepository.save.mockResolvedValue(makeLocation() as any)
      propertyRepository.save.mockResolvedValue(makeProperty() as any)

      const result = await useCase.execute(validInviteRequest(), 99)

      expect(result).toMatchObject({
        userId: 'user-uuid-001',
        managerId: 'manager-uuid-001',
        companyId: 'company-uuid-001',
        userPropertyUuid: 'property-uuid-001',
        email: 'john.doe@example.com',
      })
      expect(result.inviteLink).toContain('/invite/user-uuid-001')
    })

    it('should work without a platformId', async () => {
      companyRepository.findByName.mockResolvedValue(null)
      companyRepository.save.mockResolvedValue(makeCompany() as any)
      managerRepository.findByEmail.mockResolvedValue(null)
      managerRepository.save.mockResolvedValue(makeManager() as any)
      userRepository.findByEmail.mockResolvedValue(null)
      userRepository.save.mockResolvedValue(makeUser() as any)
      companyUserRepository.findByCompanyAndUser.mockResolvedValue(null)
      companyUserRepository.save.mockResolvedValue(makeCompanyUser() as any)
      locationRepository.save.mockResolvedValue(makeLocation() as any)
      propertyRepository.save.mockResolvedValue(makeProperty() as any)

      const result = await useCase.execute(validInviteRequest())

      expect(result.userId).toBe('user-uuid-001')
    })
  })

  // ── Company Logic ─────────────────────────────────────────────────────────

  describe('Company resolution', () => {
    const setupHappyPath = () => {
      managerRepository.findByEmail.mockResolvedValue(null)
      managerRepository.save.mockResolvedValue(makeManager() as any)
      userRepository.findByEmail.mockResolvedValue(null)
      userRepository.save.mockResolvedValue(makeUser() as any)
      companyUserRepository.findByCompanyAndUser.mockResolvedValue(null)
      companyUserRepository.save.mockResolvedValue(makeCompanyUser() as any)
      locationRepository.save.mockResolvedValue(makeLocation() as any)
      propertyRepository.save.mockResolvedValue(makeProperty() as any)
    }

    it('should create a NEW company when none found by name', async () => {
      setupHappyPath()
      companyRepository.findByName.mockResolvedValue(null)
      companyRepository.save.mockResolvedValue(makeCompany() as any)

      await useCase.setupInviteContext(validInviteRequest(), 5)

      expect(companyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Acme Properties', platformId: 5 }),
      )
    })

    it('should find EXISTING company by id when provided', async () => {
      setupHappyPath()
      const existingCompany = makeCompany({ id: 10 })
      companyRepository.findById.mockResolvedValue(existingCompany as any)

      const payload: InviteRequest = { ...validInviteRequest() }
      payload.company = { id: 10 }

      await useCase.setupInviteContext(payload)

      expect(companyRepository.findById).toHaveBeenCalledWith(10)
      expect(companyRepository.save).not.toHaveBeenCalled()
    })

    it('should find EXISTING company by name when no id provided', async () => {
      setupHappyPath()
      const existingCompany = makeCompany()
      companyRepository.findByName.mockResolvedValue(existingCompany as any)

      await useCase.setupInviteContext(validInviteRequest())

      expect(companyRepository.findByName).toHaveBeenCalledWith('Acme Properties')
      expect(companyRepository.save).not.toHaveBeenCalled()
    })

    it('should update company fields when they differ from existing', async () => {
      setupHappyPath()
      const existingCompany = makeCompany({ name: 'Old Name', address: 'Old Address' })
      companyRepository.findByName.mockResolvedValue(existingCompany as any)
      companyRepository.update.mockResolvedValue(makeCompany() as any)

      await useCase.setupInviteContext(validInviteRequest())

      expect(companyRepository.update).toHaveBeenCalledWith(
        10,
        expect.objectContaining({ address: '123 Victoria Island' }),
      )
    })

    it('should NOT update company if name and address are unchanged', async () => {
      setupHappyPath()
      const existingCompany = makeCompany({
        name: 'Acme Properties',
        address: '123 Victoria Island',
      })
      companyRepository.findByName.mockResolvedValue(existingCompany as any)

      await useCase.setupInviteContext(validInviteRequest())

      expect(companyRepository.update).not.toHaveBeenCalled()
    })

    it('should throw BadRequestException when company not found and no name provided', async () => {
      const payload: InviteRequest = { ...validInviteRequest() }
      payload.company = {}

      await expect(useCase.setupInviteContext(payload)).rejects.toThrow(BadRequestException)
    })

    it('should set platformId to null when no platformId provided and creating new company', async () => {
      setupHappyPath()
      companyRepository.findByName.mockResolvedValue(null)
      companyRepository.save.mockResolvedValue(makeCompany() as any)

      await useCase.setupInviteContext(validInviteRequest())

      expect(companyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ platformId: null }),
      )
    })
  })

  // ── Manager Logic ─────────────────────────────────────────────────────────

  describe('Manager resolution', () => {
    const setupCompany = () => {
      companyRepository.findByName.mockResolvedValue(makeCompany() as any)
    }
    const setupUser = () => {
      userRepository.findByEmail.mockResolvedValue(null)
      userRepository.save.mockResolvedValue(makeUser() as any)
      companyUserRepository.findByCompanyAndUser.mockResolvedValue(null)
      companyUserRepository.save.mockResolvedValue(makeCompanyUser() as any)
      locationRepository.save.mockResolvedValue(makeLocation() as any)
      propertyRepository.save.mockResolvedValue(makeProperty() as any)
    }

    it('should create a NEW manager when not found by email', async () => {
      setupCompany()
      setupUser()
      managerRepository.findByEmail.mockResolvedValue(null)
      managerRepository.save.mockResolvedValue(makeManager() as any)

      await useCase.setupInviteContext(validInviteRequest())

      expect(managerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          firstName: 'Grace',
          lastName: 'Adeyemi',
          email: 'grace@acme.com',
          companyId: 10,
        }),
      )
    })

    it('should find EXISTING manager by id when provided', async () => {
      setupCompany()
      setupUser()
      managerRepository.findById.mockResolvedValue(makeManager() as any)

      const payload = validInviteRequest()
      payload.invite.property.manager = { id: 20 }

      await useCase.setupInviteContext(payload)

      expect(managerRepository.findById).toHaveBeenCalledWith(20)
      expect(managerRepository.save).not.toHaveBeenCalled()
    })

    it('should find EXISTING manager by email when no id provided', async () => {
      setupCompany()
      setupUser()
      managerRepository.findByEmail.mockResolvedValue(makeManager() as any)

      await useCase.setupInviteContext(validInviteRequest())

      expect(managerRepository.findByEmail).toHaveBeenCalledWith('grace@acme.com')
      expect(managerRepository.save).not.toHaveBeenCalled()
    })

    it('should update manager when fields are provided and differ', async () => {
      setupCompany()
      setupUser()
      managerRepository.findByEmail.mockResolvedValue(makeManager({ phone: '0800000000' }) as any)
      managerRepository.update.mockResolvedValue(makeManager() as any)

      await useCase.setupInviteContext(validInviteRequest())

      expect(managerRepository.update).toHaveBeenCalledWith(
        20,
        expect.objectContaining({ phone: '08099887766' }),
      )
    })

    it('should throw BadRequestException when creating manager without required fields', async () => {
      setupCompany()
      managerRepository.findByEmail.mockResolvedValue(null)

      const payload = validInviteRequest()
      payload.invite.property.manager = { email: 'missing@fields.com' } 

      await expect(useCase.setupInviteContext(payload)).rejects.toThrow(BadRequestException)
    })
  })

  // ── User Logic ─────────────────────────────────────────────────────────────

  describe('User resolution', () => {
    const setupCompanyAndManager = () => {
      companyRepository.findByName.mockResolvedValue(makeCompany() as any)
      managerRepository.findByEmail.mockResolvedValue(makeManager() as any)
    }
    const setupProperty = () => {
      companyUserRepository.findByCompanyAndUser.mockResolvedValue(null)
      companyUserRepository.save.mockResolvedValue(makeCompanyUser() as any)
      locationRepository.save.mockResolvedValue(makeLocation() as any)
      propertyRepository.save.mockResolvedValue(makeProperty() as any)
    }

    it('should create a new user when email not found', async () => {
      setupCompanyAndManager()
      setupProperty()
      userRepository.findByEmail.mockResolvedValue(null)
      userRepository.save.mockResolvedValue(makeUser() as any)

      await useCase.setupInviteContext(validInviteRequest())

      expect(userRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john.doe@example.com',
          firstName: 'John',
          lastName: 'Doe',
          passwordHash: 'INVITED',
          isFromInvite: true,
        }),
      )
    })

    it('should reuse existing user when email already exists', async () => {
      setupCompanyAndManager()
      setupProperty()
      const existingUser = makeUser({ uuid: 'existing-user-uuid' })
      userRepository.findByEmail.mockResolvedValue(existingUser as any)

      const context = await useCase.setupInviteContext(validInviteRequest())

      expect(context.user.uuid).toBe('existing-user-uuid')
      expect(userRepository.save).not.toHaveBeenCalled()
    })

    it('should assign a generated UUID to new users', async () => {
      setupCompanyAndManager()
      setupProperty()
      userRepository.findByEmail.mockResolvedValue(null)
      userRepository.save.mockResolvedValue(makeUser() as any)

      await useCase.setupInviteContext(validInviteRequest())

      const saved = userRepository.save.mock.calls[0]![0] as any
      expect(saved.uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
      )
    })
  })

  // ── Company-User Link ─────────────────────────────────────────────────────

  describe('Company-User link', () => {
    const setupAll = (existingLink: any = null) => {
      companyRepository.findByName.mockResolvedValue(makeCompany() as any)
      managerRepository.findByEmail.mockResolvedValue(makeManager() as any)
      userRepository.findByEmail.mockResolvedValue(makeUser() as any)
      companyUserRepository.findByCompanyAndUser.mockResolvedValue(existingLink as any)
      companyUserRepository.save.mockResolvedValue(makeCompanyUser() as any)
      companyUserRepository.update.mockResolvedValue(makeCompanyUser() as any)
      locationRepository.save.mockResolvedValue(makeLocation() as any)
      propertyRepository.save.mockResolvedValue(makeProperty() as any)
    }

    it('should create link when no existing company-user relation', async () => {
      setupAll(null)

      await useCase.setupInviteContext(validInviteRequest())

      expect(companyUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: 10, userId: 1 }),
      )
    })

    it('should update invitedAt on re-invite when link already exists', async () => {
      setupAll(makeCompanyUser())

      await useCase.setupInviteContext(validInviteRequest())

      expect(companyUserRepository.update).toHaveBeenCalledWith(
        50,
        expect.objectContaining({ invitedAt: expect.any(Date) }),
      )
      expect(companyUserRepository.save).not.toHaveBeenCalled()
    })
  })

  // ── Property & Location Creation ──────────────────────────────────────────

  describe('Property and Location creation', () => {
    const setupPre = () => {
      companyRepository.findByName.mockResolvedValue(makeCompany() as any)
      managerRepository.findByEmail.mockResolvedValue(makeManager() as any)
      userRepository.findByEmail.mockResolvedValue(makeUser() as any)
      companyUserRepository.findByCompanyAndUser.mockResolvedValue(null)
      companyUserRepository.save.mockResolvedValue(makeCompanyUser() as any)
    }

    it('should create a location with provided data', async () => {
      setupPre()
      locationRepository.save.mockResolvedValue(makeLocation() as any)
      propertyRepository.save.mockResolvedValue(makeProperty() as any)

      await useCase.setupInviteContext(validInviteRequest())

      expect(locationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          country: 'Nigeria',
          state: 'Lagos',
          area: 'Lekki',
          subarea: 'Phase 1',
          address: 'Plot 5, Lekki',
        }),
      )
    })

    it('should default country to "Nigeria" when not provided', async () => {
      setupPre()
      locationRepository.save.mockResolvedValue(makeLocation() as any)
      propertyRepository.save.mockResolvedValue(makeProperty() as any)

      const payload = validInviteRequest()
      payload.invite.property.location = { country: '', state: 'Abuja', area: 'Wuse' } as any

      await useCase.setupInviteContext(payload)

      expect(locationRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ country: 'Nigeria' }),
      )
    })

    it('should create property linked to user, company, manager, and location', async () => {
      setupPre()
      locationRepository.save.mockResolvedValue(makeLocation() as any)
      propertyRepository.save.mockResolvedValue(makeProperty() as any)

      await useCase.setupInviteContext(validInviteRequest())

      expect(propertyRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 1,
          companyId: 10,
          managerId: 20,
          locationId: 40,
          rentAmount: 500000,
          currency: 'NGN',
        }),
      )
    })

    it('should parse rentEndDate as a Date', async () => {
      setupPre()
      locationRepository.save.mockResolvedValue(makeLocation() as any)
      propertyRepository.save.mockResolvedValue(makeProperty() as any)

      await useCase.setupInviteContext(validInviteRequest())

      const saved = propertyRepository.save.mock.calls[0]![0] as any
      expect(saved.rentEndDate).toBeInstanceOf(Date)
    })

    it('should parse rentStartDate as a Date when provided', async () => {
      setupPre()
      locationRepository.save.mockResolvedValue(makeLocation() as any)
      propertyRepository.save.mockResolvedValue(makeProperty() as any)

      await useCase.setupInviteContext(validInviteRequest())

      const saved = propertyRepository.save.mock.calls[0]![0] as any
      expect(saved.rentStartDate).toBeInstanceOf(Date)
    })

    it('should set rentStartDate as undefined when not provided', async () => {
      setupPre()
      locationRepository.save.mockResolvedValue(makeLocation() as any)
      propertyRepository.save.mockResolvedValue(makeProperty() as any)

      const payload = validInviteRequest()
      payload.invite.property.rent.rentStartDate = ''

      await useCase.setupInviteContext(payload)

      const saved = propertyRepository.save.mock.calls[0]![0] as any
      expect(saved.rentStartDate).toBeUndefined()
    })

    it('should throw BadRequestException when rentAmount is missing', async () => {
      setupPre()

      const payload = validInviteRequest()
      ;(payload.invite.property.rent as any).rentAmount = 0

      await expect(useCase.setupInviteContext(payload)).rejects.toThrow(BadRequestException)
    })

    it('should throw BadRequestException when rentEndDate is missing', async () => {
      setupPre()

      const payload = validInviteRequest()
      payload.invite.property.rent.rentEndDate = ''

      await expect(useCase.setupInviteContext(payload)).rejects.toThrow(BadRequestException)
    })

    it('should default currency to NGN when not provided in rent data', async () => {
      setupPre()
      locationRepository.save.mockResolvedValue(makeLocation() as any)
      propertyRepository.save.mockResolvedValue(makeProperty() as any)

      await useCase.setupInviteContext(validInviteRequest())

      const saved = propertyRepository.save.mock.calls[0]![0] as any
      expect(saved.currency).toBe('NGN')
    })
  })

  // ── Return Value ───────────────────────────────────────────────────────────

  describe('setupInviteContext return value', () => {
    it('should return all five entities: user, company, manager, property, location', async () => {
      companyRepository.findByName.mockResolvedValue(makeCompany() as any)
      managerRepository.findByEmail.mockResolvedValue(makeManager() as any)
      userRepository.findByEmail.mockResolvedValue(makeUser() as any)
      companyUserRepository.findByCompanyAndUser.mockResolvedValue(null)
      companyUserRepository.save.mockResolvedValue(makeCompanyUser() as any)
      locationRepository.save.mockResolvedValue(makeLocation() as any)
      propertyRepository.save.mockResolvedValue(makeProperty() as any)

      const context = await useCase.setupInviteContext(validInviteRequest())

      expect(context).toHaveProperty('user')
      expect(context).toHaveProperty('company')
      expect(context).toHaveProperty('manager')
      expect(context).toHaveProperty('property')
      expect(context).toHaveProperty('location')
    })
  })
})
