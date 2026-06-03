import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { tenantService, CreateTenantDto } from '../services/tenantService'
import { useToast } from '@/components/common/Toast'

export const useTenants = () => {
  return useQuery({
    queryKey: ['tenants'],
    queryFn: () => tenantService.getTenants(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export const useTenant = (uuid: string) => {
  return useQuery({
    queryKey: ['tenant', uuid],
    queryFn: () => tenantService.getTenant(uuid),
    enabled: !!uuid,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  })
}

export const useTenantActions = () => {
  const queryClient = useQueryClient()
  const toast = useToast()

  const createTenant = useMutation({
    mutationFn: (dto: CreateTenantDto) => tenantService.createTenant(dto),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      if (data.inviteStatus === 'SENT') {
        toast.success('Tenant added and invitation sent!')
      } else if (data.inviteStatus === 'ON_UPWARD') {
        toast.success('Tenant added (User already on Upward)')
      } else {
        toast.success('Tenant added successfully')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to add tenant')
    }
  })

  const inviteTenant = useMutation({
    mutationFn: (uuid: string) => tenantService.inviteTenant(uuid),
    onSuccess: (_, uuid) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenant', uuid] })
      toast.success('Invitation sent successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to send invitation')
    }
  })

  const assignTenant = useMutation({
    mutationFn: ({ tenantUuid, unitUuid, ...rentDetails }: { 
      tenantUuid: string, 
      unitUuid: string, 
      rentAmountPaid?: number,
      rentAmount?: number,
      rentType?: string,
      rentStartDate?: string,
      rentDueDate?: string
    }) => 
      tenantService.assignTenant(tenantUuid, unitUuid, rentDetails),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenant', variables.tenantUuid] })
      queryClient.invalidateQueries({ queryKey: ['pm-units'] })
      queryClient.invalidateQueries({ queryKey: ['pm-unit'] })
      queryClient.invalidateQueries({ queryKey: ['tenant-join-requests'] })
      toast.success('Tenant assigned successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign tenant')
    }
  })

  const unassignTenant = useMutation({
    mutationFn: ({ tenantUuid, unitUuid }: { tenantUuid: string, unitUuid: string }) => 
      tenantService.unassignTenant(tenantUuid, unitUuid),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenant', variables.tenantUuid] })
      queryClient.invalidateQueries({ queryKey: ['pm-units'] })
      queryClient.invalidateQueries({ queryKey: ['pm-unit'] })
      toast.success('Tenant unassigned successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to unassign tenant')
    }
  })

  const updateTenant = useMutation({
    mutationFn: ({ uuid, data }: { uuid: string, data: Partial<CreateTenantDto> }) => 
      tenantService.updateTenant(uuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      queryClient.invalidateQueries({ queryKey: ['tenant', variables.uuid] })
      toast.success('Tenant updated successfully')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update tenant')
    }
  })

  const bulkInvite = useMutation({
    mutationFn: (tenantUuids: string[]) => tenantService.bulkInvite(tenantUuids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      toast.success('Tenant reminders are being processed.')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to start bulk invitation')
    }
  })

  return {
    createTenant,
    inviteTenant,
    assignTenant,
    unassignTenant,
    updateTenant,
    bulkInvite
  }
}
