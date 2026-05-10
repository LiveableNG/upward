import { useQuery, useMutation, useQueryClient, useSuspenseQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Property, Unit } from '../services/propertyService'

export const useProperties = () => {
  return useSuspenseQuery({
    queryKey: ['pm-properties'],
    queryFn: () => api.getProperties()
  })
}

export const useProperty = (uuid: string) => {
  return useSuspenseQuery({
    queryKey: ['pm-property', uuid],
    queryFn: () => api.getProperty(uuid)
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
  
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string, data: Partial<Property> }) => api.updateProperty(uuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] })
      queryClient.invalidateQueries({ queryKey: ['pm-property', variables.uuid] })
    }
  })
}

export const useDeleteProperty = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (uuid: string) => api.deleteProperty(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] })
      queryClient.invalidateQueries({ queryKey: ['pm-units'] })
    }
  })
}

export const useUnits = (propertyUuid?: string) => {
  return useSuspenseQuery({
    queryKey: ['pm-units', propertyUuid],
    queryFn: () => api.getUnits(propertyUuid)
  })
}

export const useUnit = (uuid: string) => {
  return useSuspenseQuery({
    queryKey: ['pm-unit', uuid],
    queryFn: () => api.getUnit(uuid)
  })
}

export const useUpdateUnit = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string, data: Partial<Unit> }) => api.updateUnit(uuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pm-units'] })
      queryClient.invalidateQueries({ queryKey: ['pm-unit', variables.uuid] })
    }
  })
}

export const useDeleteUnit = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uuid: string) => api.deleteUnit(uuid),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pm-units'] })
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] })
    }
  })
}

export const useUnitPayments = (unitUuid: string) => {
  return useSuspenseQuery({
    queryKey: ['pm-unit-payments', unitUuid],
    queryFn: () => api.getUnitPayments(unitUuid)
  })
}

export const useAddUnitPayment = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ unitUuid, data }: { unitUuid: string, data: any }) => 
      api.addUnitPayment(unitUuid, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['pm-unit-payments', variables.unitUuid] })
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
