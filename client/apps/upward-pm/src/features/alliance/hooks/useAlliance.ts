import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as allianceService from '../services/allianceService'
import {
  CreateAllianceListingPayload,
  UpdateAllianceListingPayload,
  ListAllianceListingsParams,
  AllianceListingMedia,
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

export function useListingMedia(listingUuid?: string) {
  return useQuery<AllianceListingMedia[]>({
    queryKey: ['alliance-listing-media', listingUuid],
    queryFn: () => {
      if (!listingUuid) throw new Error('Listing UUID required')
      return allianceService.listListingMedia(listingUuid)
    },
    enabled: Boolean(listingUuid),
  })
}

export function useUploadListingMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ listingUuid, file }: { listingUuid: string; file: File }) => {
      const toBase64 = (f: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.readAsDataURL(f)
          reader.onload = () => {
            const res = reader.result as string
            resolve(res.includes(',') ? res.split(',')[1] : res)
          }
          reader.onerror = (error) => reject(error)
        })

      const base64Data = await toBase64(file)
      const confirmedMedia = await allianceService.uploadListingMedia(listingUuid, {
        base64Data,
        contentType: file.type || 'image/jpeg',
        filename: file.name,
      })

      return confirmedMedia
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alliance-listing-media', variables.listingUuid] })
      queryClient.invalidateQueries({ queryKey: ['alliance-listing', variables.listingUuid] })
      queryClient.invalidateQueries({ queryKey: ['alliance-listings'] })
    },
  })
}

export function useReorderListingMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ listingUuid, mediaUuids }: { listingUuid: string; mediaUuids: string[] }) =>
      allianceService.reorderListingMedia(listingUuid, mediaUuids),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alliance-listing-media', variables.listingUuid] })
      queryClient.invalidateQueries({ queryKey: ['alliance-listing', variables.listingUuid] })
      queryClient.invalidateQueries({ queryKey: ['alliance-listings'] })
    },
  })
}

export function useDeleteListingMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ listingUuid, mediaUuid }: { listingUuid: string; mediaUuid: string }) =>
      allianceService.deleteListingMedia(listingUuid, mediaUuid),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alliance-listing-media', variables.listingUuid] })
      queryClient.invalidateQueries({ queryKey: ['alliance-listing', variables.listingUuid] })
      queryClient.invalidateQueries({ queryKey: ['alliance-listings'] })
    },
  })
}

export function useDiscoverAllianceListings(params?: import('../types/alliance.types').DiscoverAllianceListingsParams) {
  return useQuery<import('../types/alliance.types').DiscoverAllianceListingsResponse>({
    queryKey: ['alliance-discover-listings', params],
    queryFn: () => allianceService.discoverListings(params),
  })
}

export function useDiscoveredAllianceListing(uuid?: string) {
  return useQuery<import('../types/alliance.types').AllianceDiscoveredListingDetail>({
    queryKey: ['alliance-discovered-listing', uuid],
    queryFn: () => {
      if (!uuid) throw new Error('Listing UUID required')
      return allianceService.getDiscoveredListing(uuid)
    },
    enabled: Boolean(uuid),
  })
}

export function useTrackAllianceListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uuid: string) => allianceService.trackAllianceListing(uuid),
    onSuccess: (_, uuid) => {
      queryClient.invalidateQueries({ queryKey: ['alliance-discover-listings'] })
      queryClient.invalidateQueries({ queryKey: ['alliance-discovered-listing', uuid] })
    },
  })
}

export function useUntrackAllianceListing() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (uuid: string) => allianceService.untrackAllianceListing(uuid),
    onSuccess: (_, uuid) => {
      queryClient.invalidateQueries({ queryKey: ['alliance-discover-listings'] })
      queryClient.invalidateQueries({ queryKey: ['alliance-discovered-listing', uuid] })
    },
  })
}

// Stage 2: Referral & Lead Hooks
export function useAllianceReferrals(params?: import('../types/alliance.types').ListAllianceReferralsParams) {
  return useQuery<import('../types/alliance.types').ListAllianceReferralsResponse>({
    queryKey: ['alliance-referrals', params],
    queryFn: () => allianceService.listAllianceReferrals(params),
    staleTime: 10000,
  })
}

export function useAllianceReferral(uuid?: string) {
  return useQuery<import('../types/alliance.types').AllianceReferral>({
    queryKey: ['alliance-referral', uuid],
    queryFn: () => {
      if (!uuid) throw new Error('Referral UUID required')
      return allianceService.getAllianceReferral(uuid)
    },
    enabled: Boolean(uuid),
  })
}

export function useCreateAllianceReferral() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ listingUuid, payload }: { listingUuid: string; payload: import('../types/alliance.types').CreateAllianceReferralPayload }) =>
      allianceService.createAllianceReferral(listingUuid, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alliance-referrals'] })
      queryClient.invalidateQueries({ queryKey: ['alliance-discover-listings'] })
    },
  })
}

export function useUpdateAllianceLeadStage() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ uuid, payload }: { uuid: string; payload: import('../types/alliance.types').UpdateAllianceLeadStagePayload }) =>
      allianceService.updateAllianceLeadStage(uuid, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alliance-referrals'] })
      queryClient.invalidateQueries({ queryKey: ['alliance-referral', variables.uuid] })
    },
  })
}

export function useCloseAllianceReferral() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ uuid, payload }: { uuid: string; payload?: import('../types/alliance.types').CloseAllianceReferralPayload }) =>
      allianceService.closeAllianceReferral(uuid, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alliance-referrals'] })
      queryClient.invalidateQueries({ queryKey: ['alliance-referral', variables.uuid] })
    },
  })
}

// Stage 3: Commission & Rating Hooks
export function useAllianceCommissions(params?: import('../types/alliance.types').ListAllianceCommissionsParams) {
  return useQuery<import('../types/alliance.types').ListAllianceCommissionsResponse>({
    queryKey: ['alliance-commissions', params],
    queryFn: () => allianceService.listAllianceCommissions(params),
    staleTime: 10000,
  })
}

export function useAllianceCommission(uuid?: string) {
  return useQuery<import('../types/alliance.types').AllianceCommission>({
    queryKey: ['alliance-commission', uuid],
    queryFn: () => {
      if (!uuid) throw new Error('Commission UUID required')
      return allianceService.getAllianceCommission(uuid)
    },
    enabled: Boolean(uuid),
  })
}

export function useConvertAllianceReferral() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ uuid, payload }: { uuid: string; payload: import('../types/alliance.types').ConvertAllianceReferralPayload }) =>
      allianceService.convertAllianceReferral(uuid, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['alliance-referrals'] })
      queryClient.invalidateQueries({ queryKey: ['alliance-referral', variables.uuid] })
      queryClient.invalidateQueries({ queryKey: ['alliance-commissions'] })
    },
  })
}

export function useSubmitAllianceRating() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: import('../types/alliance.types').SubmitAllianceRatingPayload) =>
      allianceService.submitAllianceRating(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alliance-referrals'] })
      queryClient.invalidateQueries({ queryKey: ['alliance-rating-summary'] })
    },
  })
}

export function useSubjectRatingSummary(subjectType: string, subjectId?: number) {
  return useQuery<import('../types/alliance.types').AllianceRatingSummary>({
    queryKey: ['alliance-rating-summary', subjectType, subjectId],
    queryFn: () => {
      if (!subjectId) throw new Error('Subject ID required')
      return allianceService.getSubjectRatingSummary(subjectType, subjectId)
    },
    enabled: Boolean(subjectId),
    staleTime: 30000,
  })
}


