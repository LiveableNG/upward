import * as WebBrowser from 'expo-web-browser'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { BodyText, CaptionText } from '@/components/text'
import { MyHomeSectionShell } from '@/features/my-home/components/MyHomeSectionShell'
import { useSelectedProperty } from '@/features/my-home/context/MyHomePropertyContext'
import { asList, panelErrorMessage } from '@/features/my-home/hooks/normalizeTenantApp'
import * as myHomeService from '@/features/my-home/services/myHomeService'
import type { HomeDocument } from '@/features/my-home/types'
import { formatDate } from '@/lib/format'
import { useAppTheme } from '@/theme'

export function DocumentsScreen() {
  const { selectedUuid } = useSelectedProperty()
  const queryClient = useQueryClient()
  const { spacing } = useAppTheme()

  const query = useQuery({
    queryKey: ['my-home', 'documents', selectedUuid],
    enabled: !!selectedUuid,
    queryFn: () => myHomeService.getDocuments(selectedUuid!, 1),
    retry: false,
  })

  const markViewed = useMutation({
    mutationFn: (documentId: string) => myHomeService.markDocumentViewed(selectedUuid!, documentId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-home', 'documents', selectedUuid] })
    },
  })

  const docs = asList<HomeDocument>(query.data)

  const openDoc = async (documentId: string, url: string | null | undefined) => {
    void markViewed.mutate(documentId)
    if (url) await WebBrowser.openBrowserAsync(url)
  }

  return (
    <MyHomeSectionShell title="Estate documents">
      {query.isLoading ? <ActivityIndicator /> : null}
      {query.isError ? (
        <CaptionText color="error">{panelErrorMessage(query.error)}</CaptionText>
      ) : null}

      {docs.length === 0 && !query.isLoading && !query.isError ? (
        <BodyText color="textSecondary">No documents shared yet.</BodyText>
      ) : null}

      <View style={{ gap: spacing[3] }}>
        {docs.map((doc) => {
          const title = doc.is_custom ? doc.document_subject || doc.name : doc.name
          const link = doc.file?.document_link
          return (
            <Card key={doc.document_id} style={{ gap: spacing[2] }}>
              <BodyText weight="semibold">{title}</BodyText>
              <CaptionText color="textSecondary">
                {formatDate(doc.sent_at)} · {doc.status.replace(/_/g, ' ')}
              </CaptionText>
              {link ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onPress={() => void openDoc(doc.document_id, link)}
                >
                  Open document
                </Button>
              ) : (
                <CaptionText color="textMuted">No file link available</CaptionText>
              )}
            </Card>
          )
        })}
      </View>
    </MyHomeSectionShell>
  )
}
