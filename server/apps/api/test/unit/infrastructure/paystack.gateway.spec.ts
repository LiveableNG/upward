import { PaystackGateway } from '@shared/infrastructure/payments/paystack.gateway'
import { ConfigService } from '@nestjs/config'

describe('PaystackGateway - DVA Bank Provider & Fallback', () => {
  let gateway: PaystackGateway
  let mockConfigService: jest.Mocked<ConfigService>
  let mockSubaccountRepo: any
  let originalFetch: typeof global.fetch

  beforeEach(() => {
    originalFetch = global.fetch
    mockConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'PAYSTACK_SECRET_KEY') return 'sk_live_secret123'
        if (key === 'PAYSTACK_BASE_URL') return 'https://api.paystack.co'
        return null
      }),
    } as any
    mockSubaccountRepo = {
      findByBusinessNameAndBank: jest.fn(),
      create: jest.fn(),
    }

    gateway = new PaystackGateway(mockConfigService, mockSubaccountRepo)
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  it('should default to titan-paystack in live mode', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: true,
        data: {
          account_number: '1234567890',
          account_name: 'Test Customer',
          bank: { name: 'Titan Trust Bank', slug: 'titan-paystack' },
        },
      }),
    } as any)

    const result = await gateway.createDedicatedAccount({ customerCode: 'CUS_123' })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.paystack.co/dedicated_account',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          customer: 'CUS_123',
          subaccount: undefined,
          preferred_bank: 'titan-paystack',
        }),
      }),
    )
    expect(result.data.account_number).toBe('1234567890')
  })

  it('should automatically fall back to wema-bank when titan-paystack fails in live mode', async () => {
    let callCount = 0
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) {
        // First call with titan-paystack fails
        return Promise.resolve({
          ok: false,
          status: 400,
          json: () => Promise.resolve({ status: false, message: 'Provider titan-paystack temporarily unavailable' }),
        })
      }
      // Second call with wema-bank fallback succeeds
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            status: true,
            data: {
              account_number: '9876543210',
              account_name: 'Test Customer',
              bank: { name: 'Wema Bank', slug: 'wema-bank' },
            },
          }),
      })
    })

    const result = await gateway.createDedicatedAccount({ customerCode: 'CUS_123' })

    expect(callCount).toBe(2)
    expect(result.data.bank.name).toBe('Wema Bank')
    expect(result.data.account_number).toBe('9876543210')
  })

  it('should use test-bank when in test mode', async () => {
    const testConfigService = {
      get: jest.fn((key: string) => {
        if (key === 'PAYSTACK_SECRET_KEY') return 'sk_test_secret123'
        if (key === 'PAYSTACK_BASE_URL') return 'https://api.paystack.co'
        return null
      }),
    } as any
    const testGateway = new PaystackGateway(testConfigService, mockSubaccountRepo)

    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        status: true,
        data: {
          account_number: '0001112223',
          account_name: 'Test Sandbox Customer',
          bank: { name: 'Test Bank', slug: 'test-bank' },
        },
      }),
    } as any)

    await testGateway.createDedicatedAccount({ customerCode: 'CUS_TEST' })

    expect(global.fetch).toHaveBeenCalledWith(
      'https://api.paystack.co/dedicated_account',
      expect.objectContaining({
        body: JSON.stringify({
          customer: 'CUS_TEST',
          subaccount: undefined,
          preferred_bank: 'test-bank',
        }),
      }),
    )
  })

  it('should not fall back if disableFallback is true', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ status: false, message: 'Titan unavailable' }),
    } as any)

    await expect(
      gateway.createDedicatedAccount({
        customerCode: 'CUS_123',
        preferredBank: 'titan-paystack',
        disableFallback: true,
      }),
    ).rejects.toThrow('Titan unavailable')

    expect(global.fetch).toHaveBeenCalledTimes(1)
  })
})
