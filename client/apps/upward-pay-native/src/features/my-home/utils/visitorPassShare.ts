import type { Visitor } from '@/features/my-home/types'

export function buildVisitorPassShareMessage(visitor: Visitor, propertyLabel?: string): string {
  const place = propertyLabel || visitor.unit?.name || visitor.unit?.address || 'your estate'
  return [
    `Visitor access for ${place}`,
    '',
    `Guest: ${visitor.visitor_name}`,
    `Access code: ${visitor.code}`,
    visitor.details ? visitor.details : null,
    '',
    'Generated via Upward Pay',
  ]
    .filter(Boolean)
    .join('\n')
}
