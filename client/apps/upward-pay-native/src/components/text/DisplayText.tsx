import { AppText, type AppTextProps } from '@/components/text/AppText'

/** 64px extrabold. Scores and other hero figures. */
export function DisplayText(props: AppTextProps) {
  return <AppText textRole="display" {...props} />
}
