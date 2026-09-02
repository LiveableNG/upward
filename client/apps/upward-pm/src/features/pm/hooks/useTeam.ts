
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useToast } from '@/components/common/Toast'

export function useTeam() {
  return useQuery({
    queryKey: ['pm-team'],
    queryFn: api.getTeamMembers
  })
}

export function useInviteMember() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: api.inviteTeamMember,
    onSuccess: () => {
      success('Invitation sent successfully')
      queryClient.invalidateQueries({ queryKey: ['pm-team'] })
    },
    onError: (err: any) => {
      error(err.message || 'Failed to send invitation')
    }
  })
}

export function useResendTeamInvite() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: (uuid: string) => api.resendTeamInvite(uuid),
    onSuccess: (data) => {
      success(data.message || 'Invitation resent successfully')
      queryClient.invalidateQueries({ queryKey: ['pm-team'] })
    },
    onError: (err: any) => {
      error(err.message || 'Failed to resend invitation')
    }
  })
}

export function useUpdateMemberPermissions() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: ({ uuid, data }: { uuid: string, data: any }) => 
      api.updateTeamMemberPermissions(uuid, data),
    onSuccess: () => {
      success('Permissions updated')
      queryClient.invalidateQueries({ queryKey: ['pm-team'] })
    },
    onError: (err: any) => {
      error(err.message || 'Failed to update permissions')
    }
  })
}

export function useRevokeMember() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: api.revokeTeamMember,
    onSuccess: () => {
      success('Team member removed')
      queryClient.invalidateQueries({ queryKey: ['pm-team'] })
    },
    onError: (err: any) => {
      error(err.message || 'Failed to remove team member')
    }
  })
}

export function useTransferTeamProperties() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: api.transferTeamProperties,
    onSuccess: (data) => {
      success(`${data.transferredCount} propert${data.transferredCount === 1 ? 'y' : 'ies'} transferred`)
      queryClient.invalidateQueries({ queryKey: ['pm-team'] })
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] })
    },
    onError: (err: any) => {
      error(err.message || 'Failed to transfer properties')
    }
  })
}

export function useCollaboratorActivities(uuid: string) {
  return useQuery({
    queryKey: ['pm-team-activities', uuid],
    queryFn: () => api.getCollaboratorActivities(uuid),
    enabled: !!uuid
  })
}

export function useApprovalRequests() {
  return useQuery({
    queryKey: ['pm-approval-requests'],
    queryFn: () => api.getApprovalRequests(),
    staleTime: 1 * 60 * 1000,
  })
}

export function useResolveApprovalRequest() {
  const queryClient = useQueryClient()
  const { success, error } = useToast()

  return useMutation({
    mutationFn: ({ uuid, action, rejectionReason }: { uuid: string; action: 'APPROVE' | 'REJECT'; rejectionReason?: string }) =>
      api.resolveApprovalRequest(uuid, action, rejectionReason),
    onSuccess: (data: any) => {
      success(data.message || 'Action resolved successfully')
      queryClient.invalidateQueries({ queryKey: ['pm-approval-requests'] })
      queryClient.invalidateQueries({ queryKey: ['pm-properties'] })
      queryClient.invalidateQueries({ queryKey: ['pm-dashboard-summary'] })
    },
    onError: (err: any) => {
      error(err.message || 'Failed to resolve approval request')
    }
  })
}
