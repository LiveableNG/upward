import * as Clipboard from 'expo-clipboard'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ActivityIndicator, Pressable, Share, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Input } from '@/components/input/Input'
import { BodyText, CaptionText, HeadingText } from '@/components/text'
import { VISITOR_DURATION_OPTIONS, VISITOR_TYPE_OPTIONS } from '@/features/my-home/constants'
import { MyHomeSectionShell } from '@/features/my-home/components/MyHomeSectionShell'
import { useSelectedProperty } from '@/features/my-home/context/MyHomePropertyContext'
import { asList, panelErrorMessage } from '@/features/my-home/hooks/normalizeTenantApp'
import * as myHomeService from '@/features/my-home/services/myHomeService'
import type { Visitor } from '@/features/my-home/types'
import { buildVisitorPassShareMessage } from '@/features/my-home/utils/visitorPassShare'
import { OptionPicker } from '@/features/setup/components/OptionPicker'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

export function VisitorsScreen() {
  const { selectedUuid } = useSelectedProperty()
  const queryClient = useQueryClient()
  const { colors, spacing } = useAppTheme()
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [visitorType, setVisitorType] = useState('guest')
  const [duration, setDuration] = useState('24')
  const [formError, setFormError] = useState<string | null>(null)

  const query = useQuery({
    queryKey: ['my-home', 'visitors', selectedUuid],
    enabled: !!selectedUuid,
    queryFn: () => myHomeService.getActiveVisitors(selectedUuid!),
    retry: false,
  })

  const generateMutation = useMutation({
    mutationFn: () =>
      myHomeService.generateVisitor(selectedUuid!, {
        name: name.trim(),
        phone: phone.trim(),
        visitorType,
        duration: Number(duration),
        numberOfVisitors: 1,
      }),
    onSuccess: async () => {
      setShowForm(false)
      setName('')
      setPhone('')
      await queryClient.invalidateQueries({ queryKey: ['my-home', 'visitors', selectedUuid] })
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  })

  const revokeMutation = useMutation({
    mutationFn: (accessId: string) => myHomeService.revokeVisitor(selectedUuid!, accessId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-home', 'visitors', selectedUuid] })
    },
  })

  const list = asList<Visitor>(query.data)

  return (
    <MyHomeSectionShell
      title="Visitor passes"
      footer={
        !showForm ? (
          <Button fullWidth onPress={() => setShowForm(true)}>
            Generate pass
          </Button>
        ) : undefined
      }
    >
      {showForm ? (
        <Card style={{ gap: spacing[3] }}>
          <HeadingText>New visitor</HeadingText>
          <Input label="Visitor name" value={name} onChangeText={setName} />
          <Input label="Phone" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <OptionPicker
            label="Visitor type"
            value={VISITOR_TYPE_OPTIONS.find((o) => o.value === visitorType)?.label ?? ''}
            options={VISITOR_TYPE_OPTIONS.map((o) => o.label)}
            onChange={(label) => {
              const m = VISITOR_TYPE_OPTIONS.find((o) => o.label === label)
              if (m) setVisitorType(m.value)
            }}
          />
          <OptionPicker
            label="Duration"
            value={VISITOR_DURATION_OPTIONS.find((o) => o.value === duration)?.label ?? ''}
            options={VISITOR_DURATION_OPTIONS.map((o) => o.label)}
            onChange={(label) => {
              const m = VISITOR_DURATION_OPTIONS.find((o) => o.label === label)
              if (m) setDuration(m.value)
            }}
          />
          {formError ? <CaptionText color="error">{formError}</CaptionText> : null}
          <Button
            fullWidth
            loading={generateMutation.isPending}
            onPress={() => {
              setFormError(null)
              if (!name.trim() || phone.trim().length < 10) {
                setFormError('Enter visitor name and a valid phone number.')
                return
              }
              generateMutation.mutate()
            }}
          >
            Create access code
          </Button>
          <Button variant="ghost" fullWidth onPress={() => setShowForm(false)}>
            Cancel
          </Button>
        </Card>
      ) : null}

      {query.isLoading ? <ActivityIndicator /> : null}
      {query.isError ? (
        <CaptionText color="error">{panelErrorMessage(query.error)}</CaptionText>
      ) : null}

      <View style={{ gap: spacing[3] }}>
        {list.map((v) => (
          <Card key={v.id} style={{ gap: spacing[2] }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <BodyText weight="semibold">{v.visitor_name}</BodyText>
              <CaptionText color="clay">{v.status}</CaptionText>
            </View>
            <Pressable onPress={() => Clipboard.setStringAsync(v.code)} accessibilityRole="button">
              <HeadingText style={{ letterSpacing: 2 }}>{v.code}</HeadingText>
              <CaptionText color="textMuted">Tap code to copy</CaptionText>
            </Pressable>
            <CaptionText color="textSecondary">{v.details}</CaptionText>
            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
              <Button
                variant="secondary"
                size="sm"
                style={{ flex: 1 }}
                onPress={async () => {
                  try {
                    await Share.share({
                      message: buildVisitorPassShareMessage(v),
                    })
                  } catch {
                    /* dismissed */
                  }
                }}
              >
                Share pass
              </Button>
              {v.status.toLowerCase() !== 'revoked' && v.status.toLowerCase() !== 'expired' ? (
                <Button
                  variant="outline"
                  size="sm"
                  style={{ flex: 1 }}
                  loading={revokeMutation.isPending}
                  onPress={() => revokeMutation.mutate(v.id)}
                >
                  Revoke
                </Button>
              ) : null}
            </View>
          </Card>
        ))}
      </View>

      {list.length === 0 && !query.isLoading && !query.isError ? (
        <BodyText color="textSecondary">No active visitor passes.</BodyText>
      ) : null}
    </MyHomeSectionShell>
  )
}
