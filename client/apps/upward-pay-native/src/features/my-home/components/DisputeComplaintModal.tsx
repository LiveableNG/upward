import * as ImagePicker from 'expo-image-picker'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2 } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Input } from '@/components/input/Input'
import { BodyText, CaptionText, TitleText } from '@/components/text'
import * as myHomeService from '@/features/my-home/services/myHomeService'
import type { Complaint, UploadedHomeFile } from '@/features/my-home/types'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

type Props = {
  visible: boolean
  propertyUuid: string | null
  complaint: Complaint | null
  onClose: () => void
}

const MAX_ATTACHMENTS = 2

export function DisputeComplaintModal({ visible, propertyUuid, complaint, onClose }: Props) {
  const queryClient = useQueryClient()
  const { colors, spacing } = useAppTheme()
  const [reason, setReason] = useState('')
  const [preferredResolution, setPreferredResolution] = useState('')
  const [attachments, setAttachments] = useState<UploadedHomeFile[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [triedSubmit, setTriedSubmit] = useState(false)

  useEffect(() => {
    if (!visible) {
      setReason('')
      setPreferredResolution('')
      setAttachments([])
      setFormError(null)
      setTriedSubmit(false)
    }
  }, [visible])

  const disputeMutation = useMutation({
    mutationFn: () =>
      myHomeService.disputeComplaint(propertyUuid!, complaint!.complaint_id, {
        reason: reason.trim(),
        preferredResolution: preferredResolution.trim(),
        file_ids: attachments.length ? attachments.map((f) => f.id) : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-home', 'complaints', propertyUuid] })
      onClose()
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  })

  const pickMedia = async () => {
    if (!propertyUuid || attachments.length >= MAX_ATTACHMENTS) return
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
      const name = asset.fileName ?? `dispute-${Date.now()}.jpg`
      const res = await myHomeService.uploadHomeFile(propertyUuid, {
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

  const submit = () => {
    setFormError(null)
    setTriedSubmit(true)
    if (!propertyUuid || !complaint) {
      setFormError('Select a home before submitting a dispute.')
      return
    }
    if (!reason.trim() || !preferredResolution.trim()) {
      setFormError('Please complete both required fields.')
      return
    }
    if (uploadingMedia) {
      setFormError('Wait for uploads to finish before submitting.')
      return
    }
    disputeMutation.mutate()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.shellPageBg }}>
        <ScrollView
          contentContainerStyle={{
            padding: spacing[4],
            gap: spacing[3],
            paddingBottom: spacing[8],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <TitleText>Dispute resolution</TitleText>
            <Pressable onPress={onClose} accessibilityRole="button">
              <BodyText color="clay">Close</BodyText>
            </Pressable>
          </View>
          <BodyText color="textSecondary">
            Tell your property manager why this complaint is not resolved yet and what you need
            next.
          </BodyText>

          <Card style={{ gap: spacing[3] }}>
            <Input
              label="Why isn't this issue resolved?"
              value={reason}
              onChangeText={setReason}
              placeholder="Explain the current status…"
              multiline
            />
            {triedSubmit && !reason.trim() ? (
              <CaptionText color="error">Please provide a reason for the dispute.</CaptionText>
            ) : null}
            <Input
              label="What resolution are you seeking?"
              value={preferredResolution}
              onChangeText={setPreferredResolution}
              placeholder="What would you like to happen?"
              multiline
            />
            {triedSubmit && !preferredResolution.trim() ? (
              <CaptionText color="error">Please describe the resolution you want.</CaptionText>
            ) : null}

            <View style={{ gap: spacing[2] }}>
              <CaptionText color="textMuted">Supporting evidence (optional, max 2)</CaptionText>
              {attachments.map((file) => (
                <View
                  key={file.id}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'space-between',
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
            <Button fullWidth loading={disputeMutation.isPending} onPress={submit}>
              Submit dispute
            </Button>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  )
}
