import { ConfigService } from '@nestjs/config'
import { MonnifyKycProvider } from '../../../src/shared/infrastructure/kyc/monnify-kyc.provider'

describe('MonnifyKycProvider', () => {
  let provider: MonnifyKycProvider
  let configService: ConfigService

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'MONNIFY_API_KEY') return 'test-monnify-key'
        if (key === 'MONNIFY_SECRET_KEY') return 'test-monnify-secret'
        if (key === 'MONNIFY_BASE_URL') return 'https://api.monnify.com'
        if (key === 'NODE_ENV') return 'test'
        return undefined
      }),
    } as any

    provider = new MonnifyKycProvider(configService)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should reject BVN with invalid length', async () => {
    const result = await provider.verify('BVN', '12345')
    expect(result.success).toBe(false)
    expect(result.message).toContain('must be exactly 11 digits')
    expect(result.provider).toBe('MONNIFY')
  })

  it('should authenticate and successfully verify BVN with Monnify API', async () => {
    const mockAuthResponse = {
      requestSuccessful: true,
      responseMessage: 'success',
      responseCode: '0',
      responseBody: {
        accessToken: 'mock-monnify-token',
        expiresIn: 3600,
      },
    }

    const mockBvnResponse = {
      requestSuccessful: true,
      responseMessage: 'success',
      responseCode: '0',
      responseBody: {
        bvn: '22222222222',
        firstName: 'John',
        middleName: 'Doe',
        lastName: 'Smith',
        dateOfBirth: '1990-01-01',
        mobileNumber: '08012345678',
        gender: 'MALE',
        image: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
        nameMatchPercentage: 100,
      },
    }

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockAuthResponse,
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockBvnResponse,
      } as any)

    const result = await provider.verify('BVN', '22222222222', {
      firstName: 'John',
      lastName: 'Smith',
      dateOfBirth: '1990-01-01',
      phone: '08012345678',
    })

    expect(result.success).toBe(true)
    expect(result.provider).toBe('MONNIFY')
    expect(result.firstName).toBe('John')
    expect(result.lastName).toBe('Smith')
    expect(result.dateOfBirth).toBe('1990-01-01')
    expect(result.rawResponse).toBeDefined()
    expect(result.rawResponse?.image).toContain('data:image/jpeg;base64')
  })

  it('should gracefully simulate in development mode if credentials missing', async () => {
    const devConfig = {
      get: jest.fn((key: string) => {
        if (key === 'NODE_ENV') return 'development'
        return undefined
      }),
    } as any

    const devProvider = new MonnifyKycProvider(devConfig)
    const result = await devProvider.verify('BVN', '11111111111', {
      firstName: 'Developer',
      lastName: 'Tester',
      dateOfBirth: '1995-05-15',
    })

    expect(result.success).toBe(true)
    expect(result.provider).toBe('MONNIFY')
    expect(result.rawResponse?.responseBody?.image).toBeDefined()
  })
})
