import {
  Building,
  ChevronRight,
  FileText,
  MessageSquareWarning,
  Receipt,
  UserRound,
} from 'lucide-react-native'
import { type ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { useQuery } from '@tanstack/react-query'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, HeadingText, TitleText } from '@/components/text'
import { DASHBOARD_HREF, useDashboardNavigation } from '@/features/dashboard/navigation'
import { useSelectedProperty } from '@/features/my-home/context/MyHomePropertyContext'
import { asList } from '@/features/my-home/hooks/normalizeTenantApp'
import type { Complaint, HomeDocument, PendingBill, Visitor } from '@/features/my-home/types'
import { useMyHomeProperties } from '@/features/my-home/hooks/useMyHomeProperties'
import * as myHomeService from '@/features/my-home/services/myHomeService'
import { OptionPicker } from '@/features/setup/components/OptionPicker'
import { useAppTheme } from '@/theme'

function HubRow({
  icon,
  title,
  preview,
  onPress,
}: {
  icon: ReactNode
  title: string
  preview?: string
  onPress: () => void
}) {
  const { colors, radius, spacing } = useAppTheme()
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        padding: spacing[4],
        backgroundColor: pressed ? colors.surface : colors.bg,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.shellBorder,
        opacity: pressed ? 0.95 : 1,
      })}
    >
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: radius.md,
          backgroundColor: colors.shellTint,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <BodyText weight="semibold">{title}</BodyText>
        {preview ? <CaptionText color="textSecondary">{preview}</CaptionText> : null}
      </View>
      <ChevronRight size={18} color={colors.textMuted} />
    </Pressable>
  )
}

export function MyHomeOverviewScreen() {
  const { go } = useDashboardNavigation()
  const { colors, spacing } = useAppTheme()
  const linked = useMyHomeProperties()
  const { properties, selected, selectedUuid, setSelectedUuid } = useSelectedProperty()

  const complaintsQ = useQuery({
    queryKey: ['my-home', 'complaints', selectedUuid],
    enabled: !!selectedUuid,
    queryFn: () => myHomeService.getComplaints(selectedUuid!, 1),
    retry: false,
  })
  const visitorsQ = useQuery({
    queryKey: ['my-home', 'visitors', selectedUuid],
    enabled: !!selectedUuid,
    queryFn: () => myHomeService.getActiveVisitors(selectedUuid!),
    retry: false,
  })
  const billsQ = useQuery({
    queryKey: ['my-home', 'bills', selectedUuid],
    enabled: !!selectedUuid,
    queryFn: () => myHomeService.getPendingBills(selectedUuid!),
    retry: false,
  })
  const docsQ = useQuery({
    queryKey: ['my-home', 'documents', selectedUuid],
    enabled: !!selectedUuid,
    queryFn: () => myHomeService.getDocuments(selectedUuid!, 1),
    retry: false,
  })

  const complaints = asList<Complaint>(complaintsQ.data)
  const visitors = asList<Visitor>(visitorsQ.data)
  const bills = asList<PendingBill>(billsQ.data)
  const docs = asList<HomeDocument>(docsQ.data)

  if (linked.length === 0) {
    return (
      <Screen scroll background="shell">
        <TitleText>My Home</TitleText>
        <Card tone="tint" style={{ alignItems: 'center', gap: spacing[3] }}>
          <Building size={28} color={colors.clay} />
          <HeadingText>No estate-linked home</HeadingText>
          <BodyText color="textSecondary" style={{ textAlign: 'center' }}>
            When your property is linked to a GoodTenants-managed estate, complaints, visitor
            passes, bills, and documents appear here.
          </BodyText>
          <Button fullWidth onPress={() => go(DASHBOARD_HREF.setupRental)}>
            Add or update property
          </Button>
        </Card>
      </Screen>
    )
  }

  return (
    <Screen scroll background="shell">
      <EyebrowText color="clay">Estate hub</EyebrowText>
      <TitleText>My Home</TitleText>
      <BodyText color="textSecondary">
        Complaints, visitor access, estate bills, and tenancy documents.
      </BodyText>

      {properties.length > 1 && selected ? (
        <OptionPicker
          label="Property"
          value={selected.label}
          options={properties.map((p) => p.label)}
          onChange={(label) => {
            const match = properties.find((p) => p.label === label)
            if (match) setSelectedUuid(match.uuid)
          }}
        />
      ) : null}

      {selected ? (
        <Card style={{ gap: spacing[2] }}>
          <CaptionText color="textMuted">Active tenancy</CaptionText>
          <BodyText weight="semibold">{selected.label}</BodyText>
          {selected.unitName ? (
            <CaptionText color="textSecondary">Unit {selected.unitName}</CaptionText>
          ) : null}
          {selected.managerDisplayName ? (
            <CaptionText color="textSecondary">Manager: {selected.managerDisplayName}</CaptionText>
          ) : null}
        </Card>
      ) : null}

      <View style={{ gap: spacing[3] }}>
        <HubRow
          icon={<MessageSquareWarning size={18} color={colors.clay} />}
          title="Complaints"
          preview={
            complaints[0]
              ? `${complaints[0].category} · ${complaints[0].status}`
              : 'Maintenance & support tickets'
          }
          onPress={() => go('/dashboard/my-home/complaints')}
        />
        <HubRow
          icon={<UserRound size={18} color={colors.clay} />}
          title="Visitor passes"
          preview={
            visitors[0]
              ? `${visitors[0].visitor_name} · ${visitors[0].status}`
              : 'Gate access codes'
          }
          onPress={() => go('/dashboard/my-home/visitors')}
        />
        <HubRow
          icon={<Receipt size={18} color={colors.clay} />}
          title="Estate bills"
          preview={
            bills.length > 0
              ? `${bills.length} bill${bills.length === 1 ? '' : 's'} due`
              : 'Service charge & power'
          }
          onPress={() => go('/dashboard/my-home/payments')}
        />
        <HubRow
          icon={<FileText size={18} color={colors.clay} />}
          title="Documents"
          preview={
            docs[0]
              ? docs[0].is_custom
                ? docs[0].document_subject || docs[0].name
                : docs[0].name
              : 'Estate rules & notices'
          }
          onPress={() => go('/dashboard/my-home/documents')}
        />
      </View>
    </Screen>
  )
}
