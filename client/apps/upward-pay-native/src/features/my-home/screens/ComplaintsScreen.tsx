import * as ImagePicker from 'expo-image-picker'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Star, Trash2 } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Input } from '@/components/input/Input'
import { BodyText, CaptionText, HeadingText } from '@/components/text'
import { ComplaintDetailModal } from '@/features/my-home/components/ComplaintDetailModal'
import { ComplaintFeedbackPromptModal } from '@/features/my-home/components/ComplaintFeedbackPromptModal'
import { DisputeComplaintModal } from '@/features/my-home/components/DisputeComplaintModal'
import { FeedbackComplaintModal } from '@/features/my-home/components/FeedbackComplaintModal'
import { MyHomeSectionShell } from '@/features/my-home/components/MyHomeSectionShell'
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_STATUS_FILTERS,
  type ComplaintStatusFilter,
} from '@/features/my-home/constants'
import { useComplaintsInfinite } from '@/features/my-home/hooks/useComplaintsInfinite'
import { useSelectedProperty } from '@/features/my-home/context/MyHomePropertyContext'
import { panelErrorMessage } from '@/features/my-home/hooks/normalizeTenantApp'
import * as myHomeService from '@/features/my-home/services/myHomeService'
import type { Complaint, UploadedHomeFile } from '@/features/my-home/types'
import {
  complaintStatusTone,
  displayComplaintStatus,
  needsResolutionPrompt,
} from '@/features/my-home/utils/complaintStatus'
import { OptionPicker } from '@/features/setup/components/OptionPicker'
import { getErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { useAppTheme } from '@/theme'

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string
  active: boolean
  onPress: () => void
}) {
  const { colors, radius, spacing } = useAppTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={{
        paddingHorizontal: spacing[3],
        paddingVertical: spacing[2],
        borderRadius: radius.full,
        borderWidth: 1,
        borderColor: active ? colors.clay : colors.shellBorder,
        backgroundColor: active ? colors.shellTint : colors.bg,
      }}
    >
      <CaptionText
        style={{
          fontWeight: active ? '600' : '400',
          color: active ? colors.clay : colors.textSecondary,
        }}
      >
        {label}
      </CaptionText>
    </Pressable>
  )
}

function StatusBadge({ status }: { status: string }) {
  const { colors, radius, spacing } = useAppTheme()
  const tone = complaintStatusTone(status)
  const palette = {
    pending: { bg: 'rgba(234, 179, 8, 0.12)', text: '#a16207' },
    ongoing: { bg: 'rgba(59, 130, 246, 0.12)', text: '#2563eb' },
    completed: { bg: 'rgba(22, 163, 74, 0.12)', text: '#16a34a' },
    disputed: { bg: 'rgba(239, 68, 68, 0.12)', text: '#dc2626' },
  }[tone]

  return (
    <View
      style={{
        alignSelf: 'flex-start',
        backgroundColor: palette.bg,
        paddingHorizontal: spacing[2],
        paddingVertical: 4,
        borderRadius: radius.full,
      }}
    >
      <CaptionText style={{ color: palette.text, fontWeight: '600' }}>
        {displayComplaintStatus(status)}
      </CaptionText>
    </View>
  )
}

function RatingStars({ score }: { score: string }) {
  const { colors } = useAppTheme()
  const value = Math.min(5, Math.max(0, Math.round(parseFloat(score) || 0)))
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={14}
          color={star <= value ? '#eab308' : colors.shellBorder}
          fill={star <= value ? '#eab308' : 'transparent'}
        />
      ))}
    </View>
  )
}

export function ComplaintsScreen() {
  const { selectedUuid } = useSelectedProperty()
  const queryClient = useQueryClient()
  const { colors, spacing } = useAppTheme()
  const [showForm, setShowForm] = useState(false)
  const [category, setCategory] = useState('')
  const [details, setDetails] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [attachments, setAttachments] = useState<UploadedHomeFile[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)

  const [disputeComplaint, setDisputeComplaint] = useState<Complaint | null>(null)
  const [feedbackPromptComplaint, setFeedbackPromptComplaint] = useState<Complaint | null>(null)
  const [feedbackComplaint, setFeedbackComplaint] = useState<Complaint | null>(null)
  const [openComplaintId, setOpenComplaintId] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ComplaintStatusFilter>('pending')

  const MAX_ATTACHMENTS = 2

  const query = useComplaintsInfinite(selectedUuid, statusFilter)
  const list = useMemo(
    () => query.data?.pages.flatMap((page) => page.data) ?? [],
    [query.data?.pages],
  )

  const createMutation = useMutation({
    mutationFn: () =>
      myHomeService.createComplaint(selectedUuid!, {
        category,
        details: details.trim(),
        file_ids: attachments.length ? attachments.map((f) => f.id) : undefined,
      }),
    onSuccess: async () => {
      setShowForm(false)
      setDetails('')
      setCategory('')
      setAttachments([])
      await queryClient.invalidateQueries({ queryKey: ['my-home', 'complaints', selectedUuid] })
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  })

  const pickMedia = async () => {
    if (!selectedUuid || attachments.length >= MAX_ATTACHMENTS) return
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) {
      setFormError('Photo library permission is required to attach media.')
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      quality: 0.85,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setUploadingMedia(true)
    setFormError(null)
    try {
      const mime = asset.mimeType ?? 'image/jpeg'
      const name = asset.fileName ?? `complaint-${Date.now()}.jpg`
      const res = await myHomeService.uploadHomeFile(selectedUuid, {
        uri: asset.uri,
        name,
        mimeType: mime,
      })
      const file =
        res && typeof res === 'object' && 'id' in res
          ? (res as UploadedHomeFile)
          : (res as { data: UploadedHomeFile }).data
      if (file?.id) setAttachments((prev) => [...prev, file].slice(0, MAX_ATTACHMENTS))
    } catch (err) {
      setFormError(getErrorMessage(err))
    } finally {
      setUploadingMedia(false)
    }
  }

  const isAllFilter = statusFilter === 'all'

  return (
    <MyHomeSectionShell
      title="Complaints"
      footer={
        !showForm ? (
          <Button fullWidth onPress={() => setShowForm(true)}>
            Raise complaint
          </Button>
        ) : undefined
      }
    >
      {!selectedUuid ? (
        <BodyText color="textSecondary">Select a linked property on My Home first.</BodyText>
      ) : null}

      {showForm ? (
        <Card style={{ gap: spacing[3] }}>
          <HeadingText>New complaint</HeadingText>
          <OptionPicker
            label="Category"
            value={COMPLAINT_CATEGORIES.find((c) => c.value === category)?.label ?? ''}
            options={COMPLAINT_CATEGORIES.map((c) => c.label)}
            onChange={(label) => {
              const match = COMPLAINT_CATEGORIES.find((c) => c.label === label)
              setCategory(match?.value ?? '')
            }}
            placeholder="Select category"
          />
          <Input
            label="Details"
            value={details}
            onChangeText={setDetails}
            placeholder="Describe the issue…"
          />
          <View style={{ gap: spacing[2] }}>
            <CaptionText color="textMuted">Photos or videos (optional, max 2)</CaptionText>
            {attachments.map((file) => (
              <View
                key={file.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingVertical: spacing[2],
                }}
              >
                <CaptionText color="textSecondary" style={{ flex: 1 }}>
                  {file.caption || file.type}
                </CaptionText>
                <Pressable
                  onPress={() => setAttachments((prev) => prev.filter((f) => f.id !== file.id))}
                  accessibilityRole="button"
                >
                  <Trash2 size={18} color={colors.textMuted} />
                </Pressable>
              </View>
            ))}
            {attachments.length < MAX_ATTACHMENTS ? (
              <Button
                variant="secondary"
                size="sm"
                loading={uploadingMedia}
                onPress={() => void pickMedia()}
              >
                Add photo or video
              </Button>
            ) : null}
          </View>
          {formError ? <CaptionText color="error">{formError}</CaptionText> : null}
          <Button
            fullWidth
            loading={createMutation.isPending}
            onPress={() => {
              setFormError(null)
              if (!category || details.trim().length < 10) {
                setFormError('Pick a category and describe the issue (min 10 characters).')
                return
              }
              createMutation.mutate()
            }}
          >
            Submit complaint
          </Button>
          <Button variant="ghost" fullWidth onPress={() => setShowForm(false)}>
            Cancel
          </Button>
        </Card>
      ) : null}

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {COMPLAINT_STATUS_FILTERS.map((option) => (
          <FilterChip
            key={option.value}
            label={option.label}
            active={statusFilter === option.value}
            onPress={() => setStatusFilter(option.value)}
          />
        ))}
      </View>

      {query.isLoading ? <ActivityIndicator /> : null}
      {query.isError ? (
        <CaptionText color="error">{panelErrorMessage(query.error)}</CaptionText>
      ) : null}

      {list.length === 0 && !query.isLoading && !query.isError ? (
        <BodyText color="textSecondary">
          {isAllFilter
            ? 'No complaints yet for this home.'
            : `No ${COMPLAINT_STATUS_FILTERS.find((f) => f.value === statusFilter)?.label?.toLowerCase() ?? ''} complaints.`}
        </BodyText>
      ) : null}

      <View style={{ gap: spacing[3] }}>
        {list.map((c) => {
          const showResolve = needsResolutionPrompt(c)
          return (
            <Card key={c.complaint_id} style={{ gap: spacing[3] }}>
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                }}
              >
                <StatusBadge status={c.status} />
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <CaptionText color="textMuted">{formatDate(c.created_at)}</CaptionText>
                  {c.pm_messages?.length ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <MessageSquare size={12} color={colors.textMuted} />
                      <CaptionText color="textMuted">{c.pm_messages.length}</CaptionText>
                    </View>
                  ) : null}
                </View>
              </View>
              <BodyText weight="semibold">{c.category}</BodyText>
              <BodyText color="textSecondary">{c.description}</BodyText>
              {c.rating?.score ? (
                <View style={{ gap: 4 }}>
                  <CaptionText color="textMuted">Your feedback</CaptionText>
                  <RatingStars score={c.rating.score} />
                </View>
              ) : null}

              {showResolve ? (
                <View
                  style={{
                    gap: spacing[2],
                    paddingTop: spacing[2],
                    borderTopWidth: 1,
                    borderTopColor: colors.shellBorder,
                  }}
                >
                  <BodyText weight="semibold">Has this issue been resolved?</BodyText>
                  <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                    <Button
                      variant="outline"
                      size="sm"
                      style={{ flex: 1 }}
                      onPress={() => setDisputeComplaint(c)}
                    >
                      Not yet
                    </Button>
                    <Button
                      size="sm"
                      style={{ flex: 1 }}
                      onPress={() => setFeedbackPromptComplaint(c)}
                    >
                      Yes, resolved
                    </Button>
                  </View>
                </View>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onPress={() => setOpenComplaintId(c.complaint_id)}
                >
                  View details
                </Button>
              )}
            </Card>
          )
        })}
      </View>

      {query.hasNextPage ? (
        <Button
          variant="secondary"
          fullWidth
          loading={query.isFetchingNextPage}
          onPress={() => query.fetchNextPage()}
        >
          Load more
        </Button>
      ) : list.length > 0 ? (
        <CaptionText color="textMuted" style={{ textAlign: 'center' }}>
          That&apos;s all for now
        </CaptionText>
      ) : null}

      <DisputeComplaintModal
        visible={!!disputeComplaint}
        propertyUuid={selectedUuid}
        complaint={disputeComplaint}
        onClose={() => setDisputeComplaint(null)}
      />

      <ComplaintFeedbackPromptModal
        visible={!!feedbackPromptComplaint}
        onSkip={() => setFeedbackPromptComplaint(null)}
        onGiveFeedback={() => {
          setFeedbackComplaint(feedbackPromptComplaint)
          setFeedbackPromptComplaint(null)
        }}
      />

      <FeedbackComplaintModal
        visible={!!feedbackComplaint}
        propertyUuid={selectedUuid}
        complaint={feedbackComplaint}
        onClose={() => setFeedbackComplaint(null)}
      />

      <ComplaintDetailModal
        visible={!!openComplaintId}
        propertyUuid={selectedUuid}
        complaintId={openComplaintId}
        onClose={() => setOpenComplaintId(null)}
      />
    </MyHomeSectionShell>
  )
}
