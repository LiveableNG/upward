import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Input } from '@/components/input/Input'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, HeadingText, TitleText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  fetchMarketplaceListingDetail,
  submitAllianceInquiry,
} from '@/features/alliance/services/allianceService'
import { getUserDisplayName } from '@/features/auth/session'
import { formatCurrency } from '@/lib/format'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

type Props = { listingUuid: string }

export function ExclusiveHomeDetailScreen({ listingUuid }: Props) {
  const router = useRouter()
  const { user } = useAuth()
  const { colors, spacing } = useAppTheme()

  const detailQuery = useQuery({
    queryKey: ['alliance-listing', listingUuid],
    queryFn: () => fetchMarketplaceListingDetail(listingUuid),
    enabled: !!listingUuid,
  })

  const [message, setMessage] = useState('I would like to learn more about this listing.')
  const [phone, setPhone] = useState(user?.phone ?? '')
  const [submitted, setSubmitted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const inquiryMutation = useMutation({
    mutationFn: () =>
      submitAllianceInquiry(listingUuid, {
        clientName: getUserDisplayName(user),
        clientEmail: user?.email,
        clientPhone: phone.trim() || undefined,
        message: message.trim(),
      }),
    onSuccess: () => {
      setSubmitted(true)
      setFormError(null)
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  })

  const listing = detailQuery.data

  if (detailQuery.isLoading) {
    return (
      <Screen background="shell">
        <ActivityIndicator color={colors.clay} style={{ marginTop: 40 }} />
      </Screen>
    )
  }

  if (!listing) {
    return (
      <Screen scroll background="shell">
        <TitleText>Listing not found</TitleText>
        <Button variant="secondary" onPress={() => router.back()}>
          Back
        </Button>
      </Screen>
    )
  }

  const hero = listing.primaryMedia?.publicUrl ?? listing.media?.[0]?.publicUrl

  return (
    <Screen scroll background="shell" avoidKeyboard>
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}
      >
        <ChevronLeft size={22} color={colors.textSecondary} />
        <BodyText color="textSecondary">Back</BodyText>
      </Pressable>

      {hero ? (
        <Image
          source={{ uri: hero }}
          style={{
            width: '100%',
            height: 220,
            borderRadius: 16,
            backgroundColor: colors.shellTint,
          }}
          resizeMode="cover"
        />
      ) : null}

      <EyebrowText color="clay">{listing.intent === 'RENT' ? 'For rent' : 'For sale'}</EyebrowText>
      <TitleText>{listing.title}</TitleText>
      <HeadingText>
        {listing.price != null ? formatCurrency(listing.price) : 'Price on request'}
      </HeadingText>
      <CaptionText color="textSecondary">
        {[listing.address, listing.city, listing.state].filter(Boolean).join(' · ')}
      </CaptionText>
      {listing.description ? (
        <BodyText color="textSecondary">{listing.description}</BodyText>
      ) : null}

      <Card style={{ gap: spacing[2] }}>
        <BodyText weight="semibold">{listing.pm.displayName}</BodyText>
        {listing.pm.companyName ? (
          <CaptionText color="textMuted">{listing.pm.companyName}</CaptionText>
        ) : null}
        {listing.ratingSummary && listing.ratingSummary.totalRatings > 0 ? (
          <CaptionText color="textSecondary">
            {listing.ratingSummary.averageScore.toFixed(1)} · {listing.ratingSummary.totalRatings}{' '}
            ratings
          </CaptionText>
        ) : null}
      </Card>

      {listing.media.length > 1 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginVertical: spacing[2] }}
        >
          {listing.media.map((m) => (
            <Image
              key={m.uuid}
              source={{ uri: m.publicUrl }}
              style={{
                width: 120,
                height: 90,
                borderRadius: 12,
                marginRight: spacing[2],
                backgroundColor: colors.shellTint,
              }}
            />
          ))}
        </ScrollView>
      ) : null}

      {submitted ? (
        <Card tone="tint">
          <BodyText weight="semibold">Inquiry sent</BodyText>
          <CaptionText color="textSecondary">
            The property manager will reach out using your Upward profile contact details.
          </CaptionText>
        </Card>
      ) : (
        <Card style={{ gap: spacing[3] }}>
          <BodyText weight="semibold">Request a viewing</BodyText>
          <Input
            label="Phone (optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Input label="Message" value={message} onChangeText={setMessage} multiline />
          {formError ? <CaptionText color="error">{formError}</CaptionText> : null}
          <Button
            fullWidth
            loading={inquiryMutation.isPending}
            onPress={() => inquiryMutation.mutate()}
          >
            Send inquiry
          </Button>
        </Card>
      )}
    </Screen>
  )
}
