import { SimulateTransferUseCase } from '@application/use-cases/payments/simulate-transfer.use-case'

describe('SimulateTransferUseCase (Rent Vault DVA routing)', () => {
  it('resolves an active rent vault DVA first, removes stale mock DVA records, and forwards vault_id metadata', async () => {
    const deleteManyMock = jest.fn().mockResolvedValue({ count: 1 })
    const findUniqueDvaMock = jest.fn()
    const findFirstVaultMock = jest.fn().mockResolvedValue({
      id: 42,
      uuid: 'vault-mote-001',
      dvaAccountNumber: '1238443844',
      dvaAccountName: 'Upward / Motelejesu Olawale',
      dvaBankName: 'Test Bank',
      dvaCustomerCode: 'CUS_real_test_123',
    })

    const prismaMock = {
      upward_rent_vault: {
        findFirst: findFirstVaultMock,
      },
      upward_dedicated_virtual_account: {
        findUnique: findUniqueDvaMock,
        deleteMany: deleteManyMock,
      },
    } as any

    const configServiceMock = {
      get: jest.fn().mockReturnValue('sk_test_sandbox_123'),
    } as any

    const processWebhookMock = {
      execute: jest.fn().mockResolvedValue({ status: 'success', vault_id: 'vault-mote-001' }),
    } as any

    const useCase = new SimulateTransferUseCase(prismaMock, configServiceMock, processWebhookMock)
    const res = await useCase.execute({
      beneficiaryBank: 'Test Bank',
      beneficiaryAccount: '1238443844',
      amount: 350000,
      narration: 'Rent savings deposit',
    })

    expect(res.success).toBe(true)
    expect(findFirstVaultMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          dvaAccountNumber: '1238443844',
          lockStatus: { in: ['LOCKED', 'SETTLEMENT_READY'] },
        },
      }),
    )
    expect(findUniqueDvaMock).not.toHaveBeenCalled()
    expect(deleteManyMock).toHaveBeenCalledWith({
      where: {
        accountNumber: '1238443844',
        paystackCustomerId: 'CUS_mock_dva_test',
      },
    })
    expect(processWebhookMock.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        event: 'charge.success',
        data: expect.objectContaining({
          amount: 35000000,
          metadata: expect.objectContaining({
            source_app: 'upward',
            vault_id: 'vault-mote-001',
            narration: 'Rent savings deposit',
          }),
          dedicated_account: expect.objectContaining({
            account_number: '1238443844',
            account_name: 'Upward / Motelejesu Olawale',
          }),
        }),
      }),
      expect.any(String),
    )
  })
})
