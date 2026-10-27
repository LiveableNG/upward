import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Modal, Pressable, ScrollView, View } from 'react-native'

import { Button } from '@/components/button/Button'
import { Card } from '@/components/card/Card'
import { Input } from '@/components/input/Input'
import { BodyText, CaptionText, HeadingText, TitleText } from '@/components/text'
import {
  COMPLAINT_FEEDBACK_QUESTIONS,
  COMPLAINT_VENDOR_FEEDBACK_QUESTIONS,
} from '@/features/my-home/constants'
import * as myHomeService from '@/features/my-home/services/myHomeService'
import type { Complaint, ComplaintFeedbackItem } from '@/features/my-home/types'
import { getErrorMessage } from '@/lib/errors'
import { useAppTheme } from '@/theme'

type Props = {
  visible: boolean
  propertyUuid: string | null
  complaint: Complaint | null
  onClose: () => void
}

export function FeedbackComplaintModal({ visible, propertyUuid, complaint, onClose }: Props) {
  const queryClient = useQueryClient()
  const { colors, spacing, radius } = useAppTheme()
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [information, setInformation] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [triedSubmit, setTriedSubmit] = useState(false)

  const questions = useMemo(() => {
    if (!complaint) return [...COMPLAINT_FEEDBACK_QUESTIONS]
    return complaint.has_vendor
      ? [...COMPLAINT_FEEDBACK_QUESTIONS, ...COMPLAINT_VENDOR_FEEDBACK_QUESTIONS]
      : [...COMPLAINT_FEEDBACK_QUESTIONS]
  }, [complaint])

  useEffect(() => {
    if (!visible) {
      setAnswers({})
      setInformation('')
      setFormError(null)
      setTriedSubmit(false)
    }
  }, [visible])

  const feedbackMutation = useMutation({
    mutationFn: () => {
      const feedback: ComplaintFeedbackItem[] = questions.map((q) => ({
        question: q.question,
        answer: answers[q.key] ?? '',
      }))
      feedback.push({
        question: 'Any other information?',
        answer: information.trim(),
      })
      return myHomeService.submitComplaintFeedback(propertyUuid!, complaint!.complaint_id, feedback)
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-home', 'complaints', propertyUuid] })
      onClose()
    },
    onError: (err) => setFormError(getErrorMessage(err)),
  })

  const submit = () => {
    setFormError(null)
    setTriedSubmit(true)
    if (!propertyUuid || !complaint) {
      setFormError('Select a home before submitting feedback.')
      return
    }
    const missing = questions.some((q) => !answers[q.key])
    if (missing) {
      setFormError('Please answer every rating question.')
      return
    }
    feedbackMutation.mutate()
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={{ flex: 1, backgroundColor: colors.shellPageBg }}>
        <ScrollView
          contentContainerStyle={{
            padding: spacing[4],
            gap: spacing[3],
            paddingBottom: spacing[8],
          }}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <TitleText>Rate your experience</TitleText>
            <Pressable onPress={onClose} accessibilityRole="button">
              <BodyText color="clay">Close</BodyText>
            </Pressable>
          </View>
          <BodyText color="textSecondary">
            How was your issue handled? Your feedback helps improve complaint resolution.
          </BodyText>

          <Card style={{ gap: spacing[4] }}>
            {questions.map((question, index) => (
              <View key={question.key} style={{ gap: spacing[2] }}>
                {complaint?.has_vendor && index === COMPLAINT_FEEDBACK_QUESTIONS.length ? (
                  <HeadingText>Rate the vendor</HeadingText>
                ) : null}
                <BodyText weight="semibold">{question.question}</BodyText>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
                  {question.options.map((option) => {
                    const selected = answers[question.key] === option
                    return (
                      <Pressable
                        key={option}
                        onPress={() => setAnswers((prev) => ({ ...prev, [question.key]: option }))}
                        accessibilityRole="button"
                        style={{
                          paddingHorizontal: spacing[3],
                          paddingVertical: spacing[2],
                          borderRadius: radius.full,
                          borderWidth: 1,
                          borderColor: selected ? colors.clay : colors.shellBorder,
                          backgroundColor: selected ? colors.shellTint : colors.bg,
                        }}
                      >
                        <CaptionText
                          style={{
                            color: selected ? colors.clay : colors.textSecondary,
                            fontWeight: selected ? '600' : '400',
                          }}
                        >
                          {option}
                        </CaptionText>
                      </Pressable>
                    )
                  })}
                </View>
                {triedSubmit && !answers[question.key] ? (
                  <CaptionText color="error">Please select an option</CaptionText>
                ) : null}
              </View>
            ))}

            <Input
              label="Any other information? (optional)"
              value={information}
              onChangeText={setInformation}
              placeholder="Add more details…"
              multiline
            />

            {formError ? <CaptionText color="error">{formError}</CaptionText> : null}
            <Button fullWidth loading={feedbackMutation.isPending} onPress={submit}>
              Submit feedback
            </Button>
          </Card>
        </ScrollView>
      </View>
    </Modal>
  )
}
