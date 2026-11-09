import { ConfigService } from '@nestjs/config'
import { PremblyKycProvider } from '../../../src/shared/infrastructure/kyc/prembly-kyc.provider'

describe('PremblyKycProvider', () => {
  let provider: PremblyKycProvider
  let configService: ConfigService

  beforeEach(() => {
    configService = {
      get: jest.fn((key: string) => {
        if (key === 'PREMBLY_API_KEY') return 'test-prembly-api-key'
        if (key === 'PREMBLY_APP_ID') return 'test-prembly-app-id'
        if (key === 'PREMBLY_BASE_URL') return 'https://api.prembly.com'
        return undefined
      }),
    } as any

    provider = new PremblyKycProvider(configService)
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('should reject BVN with invalid length', async () => {
    const result = await provider.verify('BVN', '12345')
    expect(result.success).toBe(false)
    expect(result.message).toContain('must be exactly 11 digits')
    expect(result.provider).toBe('PREMBLY')
  })

  it('should successfully verify BVN via Option B REST API schema', async () => {
    const mockPremblyResponse = {
      status: true,
      response_code: '00',
      detail: 'Verification Successful',
      data: {
        bvn: '22222222222',
        first_name: 'Jane',
        last_name: 'Doe',
        dob: '1995-01-01',
        phone_number: '08012345678',
        gender: 'Female',
        photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg...',
      },
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockPremblyResponse,
    } as any)

    const result = await provider.verify('BVN', '22222222222', {
      firstName: 'Jane',
      lastName: 'Doe',
      dateOfBirth: '1995-01-01',
    })

    expect(result.success).toBe(true)
    expect(result.provider).toBe('PREMBLY')
    expect(result.firstName).toBe('Jane')
    expect(result.lastName).toBe('Doe')
    expect(result.dateOfBirth).toBe('1995-01-01')
    expect(result.gender).toBe('Female')
    expect(result.photo).toContain('data:image/jpeg;base64')
    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.prembly.com/api/v1/verification/api/bvn/',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'x-api-key': 'test-prembly-api-key',
        }),
      }),
    )
  })

  it('should handle code 01 (Not Found) with friendly message', async () => {
    const mockNotFoundResponse = {
      status: false,
      response_code: '01',
      detail: 'Record Not Found',
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockNotFoundResponse,
    } as any)

    const result = await provider.verify('BVN', '99999999999')
    expect(result.success).toBe(false)
    expect(result.message).toContain('was not found in the official registry')
  })

  it('should handle code 02 (Service Unavailable)', async () => {
    const mockUnavailableResponse = {
      status: false,
      response_code: '02',
      detail: 'Registry Offline',
    }

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => mockUnavailableResponse,
    } as any)

    const result = await provider.verify('BVN', '99999999999')
    expect(result.success).toBe(false)
    expect(result.message).toContain('temporarily unavailable')
  })

  it('should fall back to alternative route if primary endpoint 404s', async () => {
    const mockSuccessResponse = {
      status: true,
      response_code: '00',
      data: {
        first_name: 'John',
        last_name: 'Fallback',
      },
    }

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: async () => ({}),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockSuccessResponse,
      } as any)

    const result = await provider.verify('BVN', '22222222222')
    expect(result.success).toBe(true)
    expect(result.firstName).toBe('John')
    expect(result.lastName).toBe('Fallback')
    expect(global.fetch).toHaveBeenCalledTimes(2)
  })
})
