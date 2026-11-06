import { useMutation } from '@tanstack/react-query'
import * as DocumentPicker from 'expo-document-picker'
import { useState } from 'react'
import { View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Input } from '@/components/input/Input'
import { BodyText, CaptionText } from '@/components/text'
import {
  uploadManualProofOfPayment,
  uploadProofOfPaymentFile,
} from '@/features/payments/services/paymentService'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

type Props = {
  paymentRequestUuid: string
  defaultAmount?: number
  onSubmitted: () => void
}

export function ManualProofForm({ paymentRequestUuid, defaultAmount, onSubmitted }: Props) {
  const { spacing } = useAppTheme()
  const [senderName, setSenderName] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : '')
  const [done, setDone] = useState(false)
  const [fileLabel, setFileLabel] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: () =>
      uploadManualProofOfPayment({
        paymentRequestUuid,
        amount: parseFloat(amount) || undefined,
        currency: 'NGN',
        senderName: senderName.trim(),
        paymentDate: paymentDate.trim(),
        referenceNumber: reference.trim() || undefined,
      }),
    onSuccess: () => {
      setDone(true)
      onSubmitted()
    },
  })

  const fileMutation = useMutation({
    mutationFn: (file: { uri: string; name: string; mimeType: string }) =>
      uploadProofOfPaymentFile({
        paymentRequestUuid,
        amount: parseFloat(amount) || undefined,
        file,
      }),
    onSuccess: () => {
      setDone(true)
      onSubmitted()
    },
  })

  const pickFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    })
    if (result.canceled || !result.assets[0]) return
    const asset = result.assets[0]
    setFileLabel(asset.name)
    fileMutation.mutate({
      uri: asset.uri,
      name: asset.name,
      mimeType: asset.mimeType ?? 'application/pdf',
    })
  }

  if (done) {
    return (
      <Card tone="tint">
        <BodyText weight="semibold">Proof submitted</BodyText>
        <CaptionText color="textSecondary">
          Your property manager will review the transfer details.
        </CaptionText>
      </Card>
    )
  }

  return (
    <Card style={{ gap: spacing[3] }}>
      <BodyText weight="semibold">Already paid by transfer?</BodyText>
      <CaptionText color="textSecondary">
        Submit transfer details for PM review (no file upload needed).
      </CaptionText>
      <Input
        label="Amount paid (₦)"
        value={amount}
        onChangeText={setAmount}
        keyboardType="decimal-pad"
      />
      <Input label="Sender name" value={senderName} onChangeText={setSenderName} />
      <Input
        label="Payment date (YYYY-MM-DD)"
        value={paymentDate}
        onChangeText={setPaymentDate}
        autoCapitalize="none"
      />
      <Input
        label="Bank reference (optional)"
        value={reference}
        onChangeText={setReference}
        autoCapitalize="characters"
      />
      {mutation.isError ? (
        <CaptionText color="error">{getErrorMessage(mutation.error)}</CaptionText>
      ) : null}
      <Button
        variant="secondary"
        fullWidth
        loading={mutation.isPending}
        disabled={!senderName.trim() || !paymentDate.trim()}
        onPress={() => mutation.mutate()}
      >
        Submit details only
      </Button>
      <Button
        variant="outline"
        fullWidth
        loading={fileMutation.isPending}
        onPress={() => void pickFile()}
      >
        {fileLabel ? `Uploading ${fileLabel}…` : 'Attach receipt (PDF / image)'}
      </Button>
      {fileMutation.isError ? (
        <CaptionText color="error">{getErrorMessage(fileMutation.error)}</CaptionText>
      ) : null}
    </Card>
  )
}
