import { AppText, type AppTextProps } from '@/components/text/AppText'

/** 11px bold, uppercase, tracked. Eyebrows above hero content. */
export function EyebrowText(props: AppTextProps) {
  return <AppText textRole="eyebrow" {...props} />
}
