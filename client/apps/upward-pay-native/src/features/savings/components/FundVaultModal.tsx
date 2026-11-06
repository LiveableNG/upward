import * as Clipboard from 'expo-clipboard'
import { Check, Copy, Info, Landmark, X, Zap } from 'lucide-react-native'
import { useState } from 'react'
import { Modal, Pressable, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { BodyText, CaptionText, HeadingText, TitleText } from '@/components/text'
import { type VaultDedicatedAccount } from '@/features/dashboard/types'
import { useAppTheme } from '@/theme'

type FundVaultModalProps = {
  visible: boolean
  onClose: () => void
  dedicatedAccount?: VaultDedicatedAccount | null
}

export function FundVaultModal({ visible, onClose, dedicatedAccount }: FundVaultModalProps) {
  const { colors, radius, spacing } = useAppTheme()
  const [copiedField, setCopiedField] = useState<'account' | 'all' | null>(null)

  const bankName = dedicatedAccount?.bank_name || 'Wema Bank'
  const accountNumber = dedicatedAccount?.account_number || ''
  const accountName = dedicatedAccount?.account_name || 'Upward Rent Savings'
  const hasAccount = accountNumber.length >= 10

  const copyText = async (text: string, field: 'account' | 'all') => {
    await Clipboard.setStringAsync(text)
    setCopiedField(field)
    setTimeout(() => setCopiedField(null), 2500)
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <Pressable
        style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}
        onPress={onClose}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
          style={{
            backgroundColor: colors.bg,
            borderTopLeftRadius: radius.xl,
            borderTopRightRadius: radius.xl,
            padding: spacing[5],
            gap: spacing[4],
            maxHeight: '92%',
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
            }}
          >
            <View style={{ flexDirection: 'row', gap: spacing[3], flex: 1 }}>
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
                <Landmark size={20} color={colors.clay} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <TitleText>Fund your rent vault</TitleText>
                <CaptionText color="textMuted">
                  Transfer from any Nigerian bank app or USSD
                </CaptionText>
              </View>
            </View>
            <Pressable onPress={onClose} accessibilityRole="button" hitSlop={12}>
              <X size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {!hasAccount ? (
            <BodyText color="textSecondary">
              Your dedicated account is being assigned. Pull to refresh on the vault screen in a
              moment, or contact support if this persists.
            </BodyText>
          ) : (
            <View
              style={{
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.shellBorder,
                padding: spacing[4],
                gap: spacing[3],
              }}
            >
              <View
                style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <CaptionText color="textMuted">Dedicated virtual account</CaptionText>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    paddingHorizontal: 8,
                    paddingVertical: 4,
                    borderRadius: radius.full,
                  }}
                >
                  <Zap size={11} color="#10b981" />
                  <CaptionText style={{ color: '#10b981', fontWeight: '700' }}>
                    Instant credit
                  </CaptionText>
                </View>
              </View>

              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: colors.bg,
                  borderRadius: radius.md,
                  borderWidth: 1,
                  borderColor: colors.shellBorder,
                  padding: spacing[3],
                }}
              >
                <View>
                  <CaptionText color="textMuted">Account number</CaptionText>
                  <HeadingText>{accountNumber}</HeadingText>
                </View>
                <Pressable
                  onPress={() => copyText(accountNumber, 'account')}
                  accessibilityRole="button"
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor:
                      copiedField === 'account' ? 'rgba(16, 185, 129, 0.1)' : colors.shellTint,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: radius.md,
                  }}
                >
                  {copiedField === 'account' ? (
                    <Check size={16} color="#10b981" />
                  ) : (
                    <Copy size={16} color={colors.clay} />
                  )}
                  <CaptionText
                    color={copiedField === 'account' ? 'text' : 'clay'}
                    weight="semibold"
                  >
                    {copiedField === 'account' ? 'Copied' : 'Copy'}
                  </CaptionText>
                </Pressable>
              </View>

              <View style={{ flexDirection: 'row', gap: spacing[4] }}>
                <View style={{ flex: 1 }}>
                  <CaptionText color="textMuted">Bank</CaptionText>
                  <BodyText weight="semibold">{bankName}</BodyText>
                </View>
                <View style={{ flex: 1 }}>
                  <CaptionText color="textMuted">Account name</CaptionText>
                  <BodyText weight="semibold">{accountName}</BodyText>
                </View>
              </View>
            </View>
          )}

          <View
            style={{
              flexDirection: 'row',
              gap: spacing[3],
              backgroundColor: colors.shellTint,
              borderRadius: radius.md,
              padding: spacing[3],
            }}
          >
            <Info size={18} color={colors.clay} style={{ marginTop: 2 }} />
            <CaptionText color="textSecondary" style={{ flex: 1, lineHeight: 20 }}>
              Transfer any amount from your bank app. Deposits reflect quickly and compound daily at
              14.5% p.a.
            </CaptionText>
          </View>

          <View style={{ flexDirection: 'row', gap: spacing[3] }}>
            <Button variant="secondary" onPress={onClose} style={{ flex: 1 }}>
              Close
            </Button>
            {hasAccount ? (
              <Button
                onPress={() => copyText(`${accountNumber}\n${bankName}\n${accountName}`, 'all')}
                style={{ flex: 2 }}
              >
                {copiedField === 'all' ? 'Details copied' : 'Copy all details'}
              </Button>
            ) : null}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  )
}
