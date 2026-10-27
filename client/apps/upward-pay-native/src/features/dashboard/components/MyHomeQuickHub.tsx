import { FileText, Receipt, UserCheck, Wrench } from 'lucide-react-native'
import { Pressable, View } from 'react-native'

import { BodyText, CaptionText, HeadingText } from '@/components/text'
import { DASHBOARD_HREF, useDashboardNavigation } from '@/features/dashboard/navigation'
import { useResponsive } from '@/hooks/useResponsive'
import { useAppTheme } from '@/theme'

const TILES = [
  {
    id: 'visitors',
    icon: UserCheck,
    iconColor: '#c2501f',
    iconBg: '#fbede5',
    title: 'Visitor Pass',
    desc: 'Gate access code',
    href: '/dashboard/my-home/visitors',
  },
  {
    id: 'bills',
    icon: Receipt,
    iconColor: '#2563eb',
    iconBg: 'rgba(37, 99, 235, 0.08)',
    title: 'Estate Bills',
    desc: 'Service charge & power',
    href: '/dashboard/my-home/payments',
  },
  {
    id: 'repairs',
    icon: Wrench,
    iconColor: '#d97706',
    iconBg: 'rgba(217, 119, 6, 0.08)',
    title: 'Maintenance',
    desc: 'Report repair ticket',
    href: '/dashboard/my-home/complaints',
  },
  {
    id: 'documents',
    icon: FileText,
    iconColor: '#16a34a',
    iconBg: 'rgba(22, 163, 74, 0.08)',
    title: 'Tenancy Records',
    desc: 'Lease & digital receipts',
    href: '/dashboard/my-home/documents',
  },
] as const

export function MyHomeQuickHub() {
  const { go } = useDashboardNavigation()
  const { colors, radius, spacing } = useAppTheme()
  const { cardPadding } = useResponsive()

  return (
    <View style={{ gap: spacing[3] }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <HeadingText>My Home Operations</HeadingText>
        <Pressable onPress={() => go(DASHBOARD_HREF.myHome)} accessibilityRole="button">
          <CaptionText color="clay">Open Hub →</CaptionText>
        </Pressable>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] }}>
        {TILES.map((tile) => {
          const Icon = tile.icon
          return (
            <Pressable
              key={tile.id}
              onPress={() => go(tile.href)}
              accessibilityRole="button"
              style={({ pressed }) => ({
                width: '47%',
                flexGrow: 1,
                minWidth: 140,
                backgroundColor: colors.bg,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.shellBorder,
                padding: cardPadding,
                gap: spacing[3],
                opacity: pressed ? 0.92 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              })}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: radius.md,
                  backgroundColor: tile.iconBg,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon size={18} color={tile.iconColor} />
              </View>
              <View style={{ gap: 2 }}>
                <BodyText weight="semibold">{tile.title}</BodyText>
                <CaptionText color="textSecondary">{tile.desc}</CaptionText>
              </View>
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
