import { AppText, type AppTextProps } from '@/components/text/AppText'

/** 13px medium. Form labels and compact controls. */
export function LabelText(props: AppTextProps) {
  return <AppText textRole="label" {...props} />
}
