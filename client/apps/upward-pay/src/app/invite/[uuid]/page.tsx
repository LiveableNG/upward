import InviteClient from './InviteClient'

export function generateStaticParams() {
  return [{ uuid: 'placeholder' }]
}

export default function InvitePage() {
  return <InviteClient />
}