import * as ImagePicker from 'expo-image-picker'
import { Camera } from 'lucide-react-native'
import { useMutation } from '@tanstack/react-query'
import { ActivityIndicator, Image, Pressable, View } from 'react-native'

import { BodyText, CaptionText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { uploadProfilePhotoFromUri } from '@/features/auth/utils/avatarUpload'
import { getUserDisplayName } from '@/features/auth/session'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

type ProfileAvatarPickerProps = {
  size?: number
}

export function ProfileAvatarPicker({ size = 88 }: ProfileAvatarPickerProps) {
  const { user, refreshUser } = useAuth()
  const { colors, radius } = useAppTheme()

  const uploadMutation = useMutation({
    mutationFn: async (asset: ImagePicker.ImagePickerAsset) => {
      const mime = asset.mimeType ?? 'image/jpeg'
      const name = asset.fileName ?? `avatar-${Date.now()}.jpg`
      await uploadProfilePhotoFromUri(asset.uri, mime, name)
    },
    onSuccess: async () => {
      await refreshUser()
    },
  })

  const pickPhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (!permission.granted) return

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
    })
    if (result.canceled || !result.assets[0]) return
    uploadMutation.mutate(result.assets[0])
  }

  const initials = getUserDisplayName(user)
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <View style={{ alignItems: 'center', gap: 8 }}>
      <Pressable
        onPress={() => void pickPhoto()}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
        style={{
          width: size,
          height: size,
          borderRadius: radius.full,
          overflow: 'hidden',
          backgroundColor: colors.shellTint,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 2,
          borderColor: colors.shellBorder,
        }}
      >
        {user?.profilePic ? (
          <Image source={{ uri: user.profilePic }} style={{ width: size, height: size }} />
        ) : (
          <BodyText style={{ color: colors.clay, fontWeight: '600' }}>{initials || '?'}</BodyText>
        )}
        {uploadMutation.isPending ? (
          <View
            style={{
              ...{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
              backgroundColor: 'rgba(0,0,0,0.35)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ActivityIndicator color="#fff" />
          </View>
        ) : (
          <View
            style={{
              position: 'absolute',
              right: 4,
              bottom: 4,
              backgroundColor: colors.bg,
              borderRadius: radius.full,
              padding: 6,
              borderWidth: 1,
              borderColor: colors.shellBorder,
            }}
          >
            <Camera size={14} color={colors.clay} />
          </View>
        )}
      </Pressable>
      {uploadMutation.isError ? (
        <CaptionText color="error">{getErrorMessage(uploadMutation.error)}</CaptionText>
      ) : (
        <CaptionText color="textMuted">Tap to update photo</CaptionText>
      )}
    </View>
  )
}
