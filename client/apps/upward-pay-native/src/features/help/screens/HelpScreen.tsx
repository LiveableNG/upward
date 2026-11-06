import { useMutation } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react-native'
import { useState } from 'react'
import { Pressable, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Input } from '@/components/input/Input'
import { BodyText, CaptionText, TitleText } from '@/components/text'
import { HELP_FAQ_CATEGORIES } from '@/features/help/constants/faq'
import { createSupportTicket } from '@/features/help/services/supportService'
import { SetupPageShell } from '@/features/setup/components/SetupPageShell'
import { useDashboardNavigation } from '@/features/dashboard/navigation'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

type Tab = 'faq' | 'issue'

export function HelpScreen() {
  const { back } = useDashboardNavigation()
  const { colors, spacing, radius } = useAppTheme()
  const [tab, setTab] = useState<Tab>('faq')
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [issueText, setIssueText] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const ticketMutation = useMutation({
    mutationFn: () => createSupportTicket(issueText.trim()),
    onSuccess: () => {
      setSubmitted(true)
      setIssueText('')
      setTimeout(() => setSubmitted(false), 3000)
    },
  })

  return (
    <SetupPageShell
      title="Help & Support"
      subtitle="FAQs and support tickets"
      onBack={() => back()}
    >
      <View
        style={{
          flexDirection: 'row',
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: 4,
          borderWidth: 1,
          borderColor: colors.shellBorder,
        }}
      >
        {(['faq', 'issue'] as const).map((id) => {
          const active = tab === id
          return (
            <Pressable
              key={id}
              onPress={() => setTab(id)}
              style={{
                flex: 1,
                paddingVertical: spacing[2],
                borderRadius: radius.md,
                backgroundColor: active ? colors.bg : 'transparent',
                alignItems: 'center',
              }}
            >
              <BodyText weight={active ? 'semibold' : undefined}>
                {id === 'faq' ? 'FAQs' : 'Report issue'}
              </BodyText>
            </Pressable>
          )
        })}
      </View>

      {tab === 'faq' ? (
        <View style={{ gap: spacing[4] }}>
          {HELP_FAQ_CATEGORIES.map((cat, catIdx) => (
            <View key={cat.category} style={{ gap: spacing[2] }}>
              <TitleText>{cat.category}</TitleText>
              <Card style={{ paddingVertical: spacing[1], paddingHorizontal: 0, gap: 0 }}>
                {cat.items.map((faq, idx) => {
                  const key = `${catIdx}-${idx}`
                  const open = expandedKey === key
                  return (
                    <View
                      key={key}
                      style={{
                        borderBottomWidth: idx < cat.items.length - 1 ? 1 : 0,
                        borderBottomColor: colors.shellBorder,
                      }}
                    >
                      <Pressable
                        onPress={() => setExpandedKey(open ? null : key)}
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: spacing[2],
                          paddingHorizontal: spacing[4],
                          paddingVertical: spacing[3],
                        }}
                      >
                        <BodyText weight="semibold" style={{ flex: 1 }}>
                          {faq.q}
                        </BodyText>
                        <ChevronDown
                          size={16}
                          color={colors.textMuted}
                          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
                        />
                      </Pressable>
                      {open ? (
                        <CaptionText
                          color="textSecondary"
                          style={{
                            paddingHorizontal: spacing[4],
                            paddingBottom: spacing[3],
                          }}
                        >
                          {faq.a}
                        </CaptionText>
                      ) : null}
                    </View>
                  )
                })}
              </Card>
            </View>
          ))}
        </View>
      ) : (
        <View style={{ gap: spacing[4] }}>
          <BodyText color="textSecondary">
            Describe what went wrong. Our team will follow up on your registered email.
          </BodyText>
          <Input
            label="Issue details"
            value={issueText}
            onChangeText={setIssueText}
            multiline
            numberOfLines={5}
            placeholder="Tell us what happened…"
          />
          {ticketMutation.isError ? (
            <CaptionText color="error">{getErrorMessage(ticketMutation.error)}</CaptionText>
          ) : null}
          {submitted ? (
            <CaptionText style={{ color: '#16a34a' }}>
              Ticket submitted. We&apos;ll be in touch.
            </CaptionText>
          ) : null}
          <Button
            fullWidth
            loading={ticketMutation.isPending}
            disabled={!issueText.trim()}
            onPress={() => ticketMutation.mutate()}
          >
            Submit ticket
          </Button>
        </View>
      )}
    </SetupPageShell>
  )
}
