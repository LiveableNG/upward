import { useQuery } from '@tanstack/react-query'
import { MessageSquare } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, Image, Modal, Pressable, ScrollView, View } from 'react-native'

import { BodyText, CaptionText, TitleText } from '@/components/text'
import * as myHomeService from '@/features/my-home/services/myHomeService'
import type { Complaint } from '@/features/my-home/types'
import {
  complaintStatusTone,
  displayComplaintStatus,
} from '@/features/my-home/utils/complaintStatus'
import { formatDate } from '@/lib/format'
import { useAppTheme } from '@/theme'

type Props = {
  visible: boolean
  propertyUuid: string | null
  complaintId: string | null
  onClose: () => void
}

function unwrapComplaint(res: unknown): Complaint | null {
  if (!res || typeof res !== 'object') return null
  if ('complaint_id' in res) return res as Complaint
  if ('data' in res && (res as { data: unknown }).data) {
    return (res as { data: Complaint }).data
  }
  return null
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

export function ComplaintDetailModal({ visible, propertyUuid, complaintId, onClose }: Props) {
  const { colors, spacing, radius } = useAppTheme()
  const [tab, setTab] = useState<'details' | 'messages'>('details')

  const query = useQuery({
    queryKey: ['my-home', 'complaint', propertyUuid, complaintId],
    enabled: visible && !!propertyUuid && !!complaintId,
    queryFn: () => myHomeService.getComplaint(propertyUuid!, complaintId!),
    retry: false,
  })

  const complaint = unwrapComplaint(query.data)

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.shellPageBg }}>
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: spacing[4],
            borderBottomWidth: 1,
            borderBottomColor: colors.shellBorder,
          }}
        >
          <TitleText>Complaint details</TitleText>
          <Pressable onPress={onClose} accessibilityRole="button">
            <BodyText color="clay">Close</BodyText>
          </Pressable>
        </View>

        {query.isLoading ? (
          <ActivityIndicator color={colors.clay} style={{ marginTop: 40 }} />
        ) : !complaint ? (
          <View style={{ padding: spacing[4] }}>
            <BodyText color="textSecondary">Could not load this complaint.</BodyText>
          </View>
        ) : (
          <>
            <View
              style={{
                flexDirection: 'row',
                margin: spacing[4],
                marginBottom: 0,
                backgroundColor: colors.shellTint,
                borderRadius: radius.lg,
                padding: 4,
              }}
            >
              {(['details', 'messages'] as const).map((key) => {
                const active = tab === key
                const label =
                  key === 'details'
                    ? 'Details'
                    : `Messages${complaint.pm_messages?.length ? ` (${complaint.pm_messages.length})` : ''}`
                return (
                  <Pressable
                    key={key}
                    onPress={() => setTab(key)}
                    style={{
                      flex: 1,
                      paddingVertical: spacing[2],
                      borderRadius: radius.md,
                      backgroundColor: active ? colors.bg : 'transparent',
                      alignItems: 'center',
                    }}
                    accessibilityRole="button"
                  >
                    <CaptionText
                      style={{
                        fontWeight: active ? '600' : '400',
                        color: active ? colors.text : colors.textSecondary,
                      }}
                    >
                      {label}
                    </CaptionText>
                  </Pressable>
                )
              })}
            </View>

            <ScrollView contentContainerStyle={{ padding: spacing[4], gap: spacing[4] }}>
              {tab === 'details' ? (
                <>
                  <StatusBadge status={complaint.status} />
                  <View style={{ gap: spacing[1] }}>
                    <CaptionText color="textMuted">Category</CaptionText>
                    <BodyText weight="semibold">{complaint.category}</BodyText>
                  </View>
                  <View style={{ gap: spacing[1] }}>
                    <CaptionText color="textMuted">Description</CaptionText>
                    <BodyText color="textSecondary">{complaint.description}</BodyText>
                  </View>
                  <CaptionText color="textMuted">
                    Opened {formatDate(complaint.created_at)}
                  </CaptionText>
                  {complaint.unit?.property_address ? (
                    <View style={{ gap: spacing[1] }}>
                      <CaptionText color="textMuted">Property</CaptionText>
                      <BodyText>{complaint.unit.property_address}</BodyText>
                    </View>
                  ) : null}
                  {complaint.manager ? (
                    <View style={{ gap: spacing[1] }}>
                      <CaptionText color="textMuted">Property manager</CaptionText>
                      <BodyText>
                        {[complaint.manager.first_name, complaint.manager.last_name]
                          .filter(Boolean)
                          .join(' ')}
                      </BodyText>
                      {complaint.manager.company_name ? (
                        <CaptionText color="textSecondary">
                          {complaint.manager.company_name}
                        </CaptionText>
                      ) : null}
                    </View>
                  ) : null}
                  {complaint.files?.length ? (
                    <View style={{ gap: spacing[2] }}>
                      <CaptionText color="textMuted">Attachments</CaptionText>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {complaint.files.map((file, index) => (
                          <Image
                            key={`${file.source}-${index}`}
                            source={{ uri: file.source }}
                            style={{
                              width: 120,
                              height: 90,
                              borderRadius: radius.md,
                              marginRight: spacing[2],
                              backgroundColor: colors.shellTint,
                            }}
                          />
                        ))}
                      </ScrollView>
                    </View>
                  ) : null}
                </>
              ) : complaint.pm_messages?.length ? (
                complaint.pm_messages.map((message, index) => (
                  <View
                    key={`${message.created_at}-${index}`}
                    style={{
                      gap: spacing[2],
                      padding: spacing[3],
                      backgroundColor: colors.bg,
                      borderRadius: radius.lg,
                      borderWidth: 1,
                      borderColor: colors.shellBorder,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        gap: spacing[2],
                      }}
                    >
                      <BodyText weight="semibold">{message.pm_name}</BodyText>
                      <CaptionText color="textMuted">{formatDate(message.created_at)}</CaptionText>
                    </View>
                    <BodyText color="textSecondary">{message.message}</BodyText>
                  </View>
                ))
              ) : (
                <View
                  style={{ alignItems: 'center', gap: spacing[3], paddingVertical: spacing[6] }}
                >
                  <MessageSquare size={28} color={colors.textMuted} />
                  <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
                    Your property manager hasn&apos;t sent any messages for this complaint yet.
                  </BodyText>
                </View>
              )}
            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  )
}
