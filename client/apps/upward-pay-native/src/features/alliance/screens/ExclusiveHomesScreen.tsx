import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ChevronLeft, MapPin } from 'lucide-react-native'
import { useMemo, useState } from 'react'
import { ActivityIndicator, Image, Pressable, View } from 'react-native'

import { Card } from '@/components/card/Card'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, TitleText } from '@/components/text'
import { fetchMarketplaceListings } from '@/features/alliance/services/allianceService'
import { DASHBOARD_HREF, useDashboardNavigation } from '@/features/dashboard/navigation'
import { formatCurrency } from '@/lib/format'
import { useAppTheme } from '@/theme'

type CityFilter = 'all' | 'Lagos' | 'Abuja'
type BedFilter = 'any' | '1' | '2' | '3'

const CITY_OPTIONS: Array<{ value: CityFilter; label: string }> = [
  { value: 'all', label: 'All cities' },
  { value: 'Lagos', label: 'Lagos' },
  { value: 'Abuja', label: 'Abuja' },
]

const BED_OPTIONS: Array<{ value: BedFilter; label: string }> = [
  { value: 'any', label: 'Any beds' },
  { value: '1', label: '1 bed' },
  { value: '2', label: '2 bed' },
  { value: '3', label: '3+ bed' },
]

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

export function ExclusiveHomesScreen() {
  const router = useRouter()
  const { go } = useDashboardNavigation()
  const { colors, spacing, radius } = useAppTheme()
  const [cityFilter, setCityFilter] = useState<CityFilter>('all')
  const [bedFilter, setBedFilter] = useState<BedFilter>('any')

  const bedroomsQuery = bedFilter === 'any' ? undefined : bedFilter === '3' ? 3 : Number(bedFilter)

  const listingsQuery = useQuery({
    queryKey: ['alliance-listings', cityFilter, bedFilter],
    queryFn: () =>
      fetchMarketplaceListings({
        intent: 'RENT',
        city: cityFilter === 'all' ? undefined : cityFilter,
        bedrooms: bedroomsQuery,
        limit: 40,
        sortBy: 'newest',
      }),
  })

  const listings = listingsQuery.data?.data ?? []
  const countLabel = useMemo(() => {
    const n = listings.length
    return `${n} ${n === 1 ? 'home available' : 'homes available'}`
  }, [listings.length])

  return (
    <Screen scroll background="shell">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
      >
        <ChevronLeft size={22} color={colors.textSecondary} />
        <BodyText color="textSecondary">Back</BodyText>
      </Pressable>

      <EyebrowText color="clay">Marketplace</EyebrowText>
      <TitleText>Exclusive homes</TitleText>
      <BodyText color="textSecondary">
        Verified listings from Upward Alliance property managers. Inquire to schedule a viewing or
        apply with your Rent Passport.
      </BodyText>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {CITY_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            label={opt.label}
            active={cityFilter === opt.value}
            onPress={() => setCityFilter(opt.value)}
          />
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
        {BED_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.value}
            label={opt.label}
            active={bedFilter === opt.value}
            onPress={() => setBedFilter(opt.value)}
          />
        ))}
      </View>

      <CaptionText color="textMuted">{countLabel}</CaptionText>

      {listingsQuery.isLoading ? <ActivityIndicator color={colors.clay} /> : null}

      {listingsQuery.isError ? (
        <Card>
          <BodyText color="error">
            Could not load listings. Pull to refresh or try again later.
          </BodyText>
        </Card>
      ) : null}

      {listings.map((home) => {
        const thumb = home.primaryMedia?.publicUrl
        const location = [home.city, home.state].filter(Boolean).join(', ')
        const bedsLabel =
          home.bedrooms != null ? (home.bedrooms >= 3 ? '3+ bed' : `${home.bedrooms} bed`) : null
        return (
          <Pressable
            key={home.uuid}
            onPress={() => go(DASHBOARD_HREF.exclusiveHomeDetail(home.uuid))}
            accessibilityRole="button"
          >
            <Card style={{ gap: spacing[3], padding: 0, overflow: 'hidden' }}>
              {thumb ? (
                <Image
                  source={{ uri: thumb }}
                  style={{ width: '100%', height: 160, backgroundColor: colors.shellTint }}
                  resizeMode="cover"
                />
              ) : (
                <View
                  style={{
                    height: 120,
                    backgroundColor: colors.shellTint,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CaptionText color="textMuted">No photo</CaptionText>
                </View>
              )}
              <View style={{ padding: spacing[4], gap: spacing[2] }}>
                <BodyText weight="semibold">{home.title}</BodyText>
                {location ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MapPin size={14} color={colors.textMuted} />
                    <CaptionText color="textSecondary">{location}</CaptionText>
                  </View>
                ) : null}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <BodyText weight="semibold">
                    {home.price != null ? formatCurrency(home.price) : 'Price on request'}
                  </BodyText>
                  {bedsLabel ? <CaptionText color="textMuted">{bedsLabel}</CaptionText> : null}
                </View>
                <CaptionText color="textMuted">{home.pm.displayName}</CaptionText>
              </View>
            </Card>
          </Pressable>
        )
      })}
    </Screen>
  )
}
