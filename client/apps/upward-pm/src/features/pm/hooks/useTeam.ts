
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

export function useCollaboratorActivities(uuid: string) {
  return useQuery({
    queryKey: ['pm-team-activities', uuid],
    queryFn: () => api.getCollaboratorActivities(uuid),
    enabled: !!uuid
  })
}
