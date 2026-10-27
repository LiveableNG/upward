import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { useState } from 'react'
import { View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Input } from '@/components/input/Input'
import { BodyText, CaptionText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import {
  getCredibilityRequests,
  submitRequestRecords,
} from '@/features/records/services/credibilityService'
import { SetupPageShell } from '@/features/setup/components/SetupPageShell'
import { OptionPicker } from '@/features/setup/components/OptionPicker'
import { getErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { useAppTheme } from '@/theme'

export function RequestRecordsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const { spacing } = useAppTheme()
  const queryClient = useQueryClient()
  const properties = (user?.properties ?? []).filter((p) => p.uuid && !p.isPastTenancy)
  const labels = properties.map((p) => p.address || p.uuid || 'Property')
  const [propertyLabel, setPropertyLabel] = useState(labels[0] ?? '')
  const propertyIdx = Math.max(0, labels.indexOf(propertyLabel))
  const propertyUuid = properties[propertyIdx]?.uuid ?? ''

  const [companyName, setCompanyName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const historyQuery = useQuery({
    queryKey: ['credibility-requests'],
    queryFn: getCredibilityRequests,
  })

  const mutation = useMutation({
    mutationFn: () =>
      submitRequestRecords({
        propertyUuid,
        requestContactDetails: {
          companyName: companyName.trim(),
          email: email.trim(),
          phone: phone.trim() || undefined,
          address: address.trim() || undefined,
        },
      }),
    onSuccess: async () => {
      setSuccess(true)
      setError(null)
      await queryClient.invalidateQueries({ queryKey: ['credibility-requests'] })
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

  return (
    <SetupPageShell
      title="Request past records"
      subtitle="Ask a previous landlord or agent to endorse off-platform rent you paid."
      onBack={() => router.back()}
    >
      {properties.length === 0 ? (
        <Card>
          <BodyText color="textSecondary">
            Add a property on your profile before requesting past rent records.
          </BodyText>
        </Card>
      ) : (
        <View style={{ gap: spacing[4] }}>
          <OptionPicker
            label="Property"
            value={propertyLabel}
            options={labels}
            onChange={setPropertyLabel}
          />
          <Input label="Landlord / agent name" value={companyName} onChangeText={setCompanyName} />
          <Input
            label="Contact email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Input
            label="Phone (optional)"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />
          <Input label="Previous address (optional)" value={address} onChangeText={setAddress} />
          {error ? <CaptionText color="error">{error}</CaptionText> : null}
          {success ? (
            <CaptionText style={{ color: '#16a34a' }}>
              Request sent. We&apos;ll email your contact.
            </CaptionText>
          ) : null}
          <Button
            fullWidth
            loading={mutation.isPending}
            disabled={!companyName.trim() || !email.trim() || !propertyUuid}
            onPress={() => mutation.mutate()}
          >
            Send endorsement request
          </Button>
        </View>
      )}

      {(historyQuery.data?.length ?? 0) > 0 ? (
        <View style={{ gap: spacing[3], marginTop: spacing[4] }}>
          <BodyText weight="semibold">Previous requests</BodyText>
          {historyQuery.data?.map((req) => (
            <Card key={req.uuid} style={{ gap: 4 }}>
              <BodyText weight="semibold">
                {req.requestContactDetails?.companyName ?? 'Landlord'}
              </BodyText>
              <CaptionText color="textSecondary">{req.status ?? 'Pending'}</CaptionText>
              {req.createdAt ? (
                <CaptionText color="textMuted">{formatDate(req.createdAt)}</CaptionText>
              ) : null}
            </Card>
          ))}
        </View>
      ) : null}
    </SetupPageShell>
  )
}
