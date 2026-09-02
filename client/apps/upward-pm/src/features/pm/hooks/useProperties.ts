import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Property, Unit } from '../services/propertyService'
import { useToast } from '@/components/common/Toast'

export const useProperties = (initialData?: any) => {
  return useQuery<Property[]>({
    queryKey: ['pm-properties'],
    queryFn: () => api.getProperties(),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    initialData
  })
}

export const useProperty = (uuid: string) => {
  return useQuery({
    queryKey: ['pm-property', uuid],
    queryFn: () => api.getProperty(uuid),
    enabled: !!uuid
  })
}

export const useCreateProperty = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: Partial<Property>) => api.createProperty(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] })
      queryClient.invalidateQueries({ queryKey: ['pm-landlords'] })
    }
  })
}

export const useUpdateProperty = () => {
  const queryClient = useQueryClient()
  const { success } = useToast()
  
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string, data: Partial<Property> }) => api.updateProperty(uuid, data),
    onSuccess: (res: any, variables) => {
      if (res?.requiresApproval) {
        success(res.message || 'Property edit submitted for Admin approval')
      }
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] })
      queryClient.invalidateQueries({ queryKey: ['pm-property', variables.uuid] })
      queryClient.invalidateQueries({ queryKey: ['pm-approval-requests'] })
    }
  })
}

export const useDeleteProperty = () => {
  const queryClient = useQueryClient()
  const { success } = useToast()
  
  return useMutation({
    mutationFn: (uuid: string) => api.deleteProperty(uuid),
    onSuccess: (res: any) => {
      if (res?.requiresApproval) {
        success(res.message || 'Property deletion submitted for Admin approval')
      }
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] })
      queryClient.invalidateQueries({ queryKey: ['pm-units'] })
      queryClient.invalidateQueries({ queryKey: ['pm-approval-requests'] })
    }
  })
}

export const useUnits = (propertyUuid?: string, initialData?: any) => {
  return useQuery<Unit[]>({
    queryKey: ['pm-units', propertyUuid],
    queryFn: () => api.getUnits(propertyUuid),
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    initialData
  })
}

export const useUnit = (uuid: string) => {
  return useQuery({
    queryKey: ['pm-unit', uuid],
    queryFn: () => api.getUnit(uuid),
    enabled: !!uuid
  })
}

export const useUpdateUnit = () => {
  const queryClient = useQueryClient()
  const { success } = useToast()

  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string, data: Partial<Unit> }) => api.updateUnit(uuid, data),
    onSuccess: (res: any, variables) => {
      if (res?.requiresApproval) {
        success(res.message || 'Unit edit submitted for Admin approval')
      }
      queryClient.invalidateQueries({ queryKey: ['pm-units'] })
      queryClient.invalidateQueries({ queryKey: ['pm-unit', variables.uuid] })
      queryClient.invalidateQueries({ queryKey: ['pm-approval-requests'] })
    }
  })
}

export const useDeleteUnit = () => {
  const queryClient = useQueryClient()
  const { success } = useToast()

  return useMutation({
    mutationFn: (uuid: string) => api.deleteUnit(uuid),
    onSuccess: (res: any) => {
      if (res?.requiresApproval) {
        success(res.message || 'Unit deletion submitted for Admin approval')
      }
      queryClient.invalidateQueries({ queryKey: ['pm-units'] })
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] })
      queryClient.invalidateQueries({ queryKey: ['pm-approval-requests'] })
    }
  })
}

export const useUnitPayments = (unitUuid: string) => {
  return useQuery({
    queryKey: ['pm-unit-payments', unitUuid],
    queryFn: () => api.getUnitPayments(unitUuid),
    enabled: !!unitUuid
  })
}

export const useAddUnitPayment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ unitUuid, data }: { unitUuid: string, data: any }) => 
      api.addUnitPayment(unitUuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pm-unit-payments', variables.unitUuid] })
      queryClient.invalidateQueries({ queryKey: ['pm-unit', variables.unitUuid] })
      queryClient.invalidateQueries({ queryKey: ['pm-units'] })
    }
  })
}

export const useUpdateUnitPayment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ unitUuid, paymentUuid, data }: { unitUuid: string, paymentUuid: string, data: any }) => 
      api.updateUnitPayment(unitUuid, paymentUuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pm-unit-payments', variables.unitUuid] })
      queryClient.invalidateQueries({ queryKey: ['pm-unit', variables.unitUuid] })
    }
  })
}

export const useDeleteUnitPayment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ unitUuid, paymentUuid }: { unitUuid: string, paymentUuid: string }) => 
      api.deleteUnitPayment(unitUuid, paymentUuid),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pm-unit-payments', variables.unitUuid] })
      queryClient.invalidateQueries({ queryKey: ['pm-unit', variables.unitUuid] })
      queryClient.invalidateQueries({ queryKey: ['pm-units'] })
    }
  })
}

export const useBulkCreateUnits = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ propertyUuid, units }: { propertyUuid: string, units: Partial<Unit>[] }) => 
      api.bulkCreateUnits(propertyUuid, units),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-units'] })
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] })
    }
  })
}

export const useSyncToUpward = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (unitUuid: string) => api.syncToUpward(unitUuid),
    onSuccess: (_, unitUuid) => {
      queryClient.invalidateQueries({ queryKey: ['pm-unit', unitUuid] })
      queryClient.invalidateQueries({ queryKey: ['pm-units'] })
    }
  })
}

export const useBulkFullImport = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { rows: any[] }) => 
      api.bulkFullImport(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-units'] })
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] })
      queryClient.invalidateQueries({ queryKey: ['pm-tenants'] })
      queryClient.invalidateQueries({ queryKey: ['bulk-invites'] })
    }
  })
}
export const useBulkAddRentHistory = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ unitUuid, rows }: { unitUuid: string, rows: any[] }) => 
      api.bulkAddRentHistory(unitUuid, rows),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pm-unit-payments', variables.unitUuid] })
    }
  })
}

export const useLandlords = () => {
  return useQuery({
    queryKey: ['pm-landlords'],
    queryFn: () => api.getPmLandlords()
  })
}

export const useCreateLandlord = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; email: string; phone?: string; company?: string }) => api.createPmLandlord(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-landlords'] })
    }
  })
}
