import * as DocumentPicker from 'expo-document-picker'
import * as WebBrowser from 'expo-web-browser'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'expo-router'
import { FileText } from 'lucide-react-native'
import { useState } from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Screen } from '@/components/screen/Screen'
import { BodyText, CaptionText, EyebrowText, TitleText } from '@/components/text'
import { useAuth } from '@/features/auth/AuthProvider'
import { getContracts, uploadContractFile } from '@/features/documents/services/documentService'
import { OptionPicker } from '@/features/setup/components/OptionPicker'
import { getErrorMessage } from '@/lib/errors'
import { formatDate } from '@/lib/format'
import { useAppTheme } from '@/theme'

export function TenancyDocumentsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { colors, spacing, radius } = useAppTheme()
  const properties = (user?.properties ?? []).filter((p) => p.uuid)
  const propertyLabels = properties.map((p) => p.address || p.uuid || 'Property')
  const [propertyLabel, setPropertyLabel] = useState(propertyLabels[0] ?? '')
  const propertyUuid =
    properties[propertyLabels.indexOf(propertyLabel)]?.uuid ?? properties[0]?.uuid

  const query = useQuery({
    queryKey: ['user-contracts'],
    queryFn: getContracts,
  })

  const uploadMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; mimeType: string }) =>
      uploadContractFile(file, propertyUuid),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['user-contracts'] })
    },
  })

  const pickUpload = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    uploadMutation.mutate({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/pdf',
    })
  }

  const contracts = query.data ?? []

  return (
    <Screen scroll background="shell">
      <Pressable
        onPress={() => router.back()}
        accessibilityRole="button"
        style={{ alignSelf: 'flex-start' }}
      >
        <BodyText color="textSecondary">Back</BodyText>
      </Pressable>

      <EyebrowText color="clay">Profile</EyebrowText>
      <TitleText>Tenancy documents</TitleText>
      <BodyText color="textSecondary">
        Leases and agreements uploaded by you or your property manager.
      </BodyText>

      {query.isLoading ? <ActivityIndicator color={colors.clay} /> : null}

      {properties.length > 0 ? (
        <View style={{ gap: spacing[3] }}>
          <OptionPicker
            label="Link to property"
            value={propertyLabel}
            options={propertyLabels.length ? propertyLabels : ['Property']}
            onChange={setPropertyLabel}
          />
          <Button
            variant="secondary"
            fullWidth
            loading={uploadMutation.isPending}
            onPress={() => void pickUpload()}
          >
            Upload lease (PDF or image)
          </Button>
          {uploadMutation.isError ? (
            <CaptionText color="error">{getErrorMessage(uploadMutation.error)}</CaptionText>
          ) : null}
        </View>
      ) : null}

      {contracts.length === 0 && !query.isLoading ? (
        <Card tone="tint">
          <BodyText color="textSecondary">
            No documents yet. Upload a lease above or ask your PM to share files on Upward-PM.
          </BodyText>
        </Card>
      ) : null}

      <View style={{ gap: spacing[3] }}>
        {contracts.map((doc) => {
          const address = doc.userProperty?.location?.address || doc.fileName || 'Tenancy document'
          return (
            <Card key={doc.uuid} style={{ gap: spacing[2] }}>
              <View style={{ flexDirection: 'row', gap: spacing[3], alignItems: 'flex-start' }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: radius.md,
                    backgroundColor: colors.shellTint,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={18} color={colors.clay} />
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <BodyText weight="semibold">{doc.fileName}</BodyText>
                  <CaptionText color="textSecondary">{address}</CaptionText>
                  <CaptionText color="textMuted">
                    {formatDate(doc.createdAt)}
                    {doc.source ? ` · ${doc.source}` : ''}
                  </CaptionText>
                </View>
              </View>
              {doc.fileUrl ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => void WebBrowser.openBrowserAsync(doc.fileUrl!)}
                >
                  Open document
                </Button>
              ) : null}
            </Card>
          )
        })}
      </View>
    </Screen>
  )
}
