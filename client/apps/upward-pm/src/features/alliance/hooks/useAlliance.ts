import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as allianceService from '../services/allianceService'
import {
  CreateAllianceListingPayload,
  UpdateAllianceListingPayload,
  ListAllianceListingsParams,
} from '../types/alliance.types'

export function useAllianceProfile() {
  return useQuery({
    queryKey: ['alliance-profile'],
    queryFn: allianceService.getAllianceProfile,
    staleTime: 30000,
  })
}

export function useUpdateAllianceProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: allianceService.updateAllianceProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alliance-profile'] })
    },
  })
}

export function useAllianceListings(params?: ListAllianceListingsParams) {
  return useQuery({
    queryKey: ['alliance-listings', params],
    queryFn: () => allianceService.listAllianceListings(params),
    staleTime: 10000,
  })
}

export function useAllianceListing(uuid?: string) {
  return useQuery({
    queryKey: ['alliance-listing', uuid],
    queryFn: () => {
      if (!uuid) throw new Error('Listing UUID required')
      return allianceService.getAllianceListing(uuid)
    },
    enabled: Boolean(uuid),
  })
}

export function useCreateAllianceListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateAllianceListingPayload) =>
      allianceService.createAllianceListing(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alliance-listings'] })
    },
  })
}

export function useUpdateAllianceListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ uuid, payload }: { uuid: string; payload: UpdateAllianceListingPayload }) =>
      allianceService.updateAllianceListing(uuid, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alliance-listings'] })
      queryClient.invalidateQueries({ queryKey: ['alliance-listing', variables.uuid] })
    },
  })
}

export function usePublishAllianceListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uuid: string) => allianceService.publishAllianceListing(uuid),
    onSuccess: (_, uuid) => {
      queryClient.invalidateQueries({ queryKey: ['alliance-listings'] })
      queryClient.invalidateQueries({ queryKey: ['alliance-listing', uuid] })
    },
  })
}

export function useUnpublishAllianceListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uuid: string) => allianceService.unpublishAllianceListing(uuid),
    onSuccess: (_, uuid) => {
      queryClient.invalidateQueries({ queryKey: ['alliance-listings'] })
      queryClient.invalidateQueries({ queryKey: ['alliance-listing', uuid] })
    },
  })
}

export function useArchiveAllianceListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uuid: string) => allianceService.archiveAllianceListing(uuid),
    onSuccess: (_, uuid) => {
      queryClient.invalidateQueries({ queryKey: ['alliance-listings'] })
      queryClient.invalidateQueries({ queryKey: ['alliance-listing', uuid] })
    },
  })
}
