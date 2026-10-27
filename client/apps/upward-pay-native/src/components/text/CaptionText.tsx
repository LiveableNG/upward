import { AppText, type AppTextProps } from '@/components/text/AppText'

/** 12px medium. Helper copy, errors, and tight controls. */
export function CaptionText(props: AppTextProps) {
  return <AppText textRole="caption" {...props} />
}
