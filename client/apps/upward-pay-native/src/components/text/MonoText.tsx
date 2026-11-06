import { AppText, type AppTextProps } from '@/components/text/AppText'

/** 16px bold monospace. Account numbers and references. */
export function MonoText(props: AppTextProps) {
  return <AppText textRole="mono" {...props} family="mono" />
}
