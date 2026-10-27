import { useMutation } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { ChevronLeft } from 'lucide-react-native'
import { useEffect, useState } from 'react'
import { Pressable } from 'react-native'

import { ProfileAvatarPicker } from '@/features/account/components/ProfileAvatarPicker'
import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Input } from '@/components/input/Input'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, TitleText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { updateProfile } from '@/features/auth/services/authService'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

export function PersonalDetailsScreen() {
  const router = useRouter()
  const { user, refreshUser } = useAuth()
  const { colors, spacing } = useAppTheme()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
    setPhone(user.phone ?? '')
    setDateOfBirth(user.dateOfBirth?.slice(0, 10) ?? '')
  }, [user])

  const saveMutation = useMutation({
    mutationFn: () =>
      updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim() || undefined,
        dateOfBirth: dateOfBirth.trim() || undefined,
      }),
    onSuccess: async () => {
      await refreshUser()
      setSaved(true)
      setError(null)
      setTimeout(() => setSaved(false), 2500)
    },
    onError: (err) => setError(getErrorMessage(err)),
  })

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

      <EyebrowText color="clay">Profile</EyebrowText>
      <TitleText>Personal details</TitleText>
      <BodyText color="textSecondary">{user?.email}</BodyText>

      <ProfileAvatarPicker />

      <Card style={{ gap: spacing[3] }}>
        <Input label="First name" value={firstName} onChangeText={setFirstName} />
        <Input label="Last name" value={lastName} onChangeText={setLastName} />
        <Input
          label="Phone"
          value={phone}
          onChangeText={setPhone}
          placeholder="+2348012345678"
          keyboardType="phone-pad"
        />
        <Input
          label="Date of birth"
          value={dateOfBirth}
          onChangeText={setDateOfBirth}
          placeholder="1990-01-15"
        />
        {error ? <CaptionText color="error">{error}</CaptionText> : null}
        {saved ? <CaptionText color="clay">Profile saved.</CaptionText> : null}
        <Button fullWidth loading={saveMutation.isPending} onPress={() => saveMutation.mutate()}>
          Save changes
        </Button>
      </Card>
    </Screen>
  )
}
