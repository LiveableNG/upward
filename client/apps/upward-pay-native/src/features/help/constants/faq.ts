export type FaqItem = { q: string; a: string }
export type FaqCategory = { category: string; items: FaqItem[] }

export const HELP_FAQ_CATEGORIES: FaqCategory[] = [
  {
    category: 'Verification & Badges',
    items: [
      {
        q: 'What does "Identity Verified" mean?',
        a: 'Identity Verification means we have confirmed your identity using your Bank Verification Number (BVN). This is the first and most important step — without it, you cannot pay rent or build a credit score on Upward. It is completely secure and your BVN details are never shared.',
      },
      {
        q: 'What does "Property Connection Verified" mean?',
        a: 'A Property Connection is verified when your Property Manager (PM) has accepted and approved your connection request on Upward-PM. Until they approve, your property shows as "Pending Connection".',
      },
      {
        q: 'When can I share my Upward Score?',
        a: 'Your score becomes shareable when your identity is verified, you have made at least one rent payment, and at least one property is managed by a verified PM or is platform synced.',
      },
    ],
  },
  {
    category: 'Payments & Rent',
    items: [
      {
        q: 'My rent payment is pending, what do I do?',
        a: 'Bank transfers sometimes take up to 24 hours to clear. If it stays pending for more than 48 hours, report an issue from Help & Support.',
      },
      {
        q: 'Can I delete a transaction history?',
        a: 'For security and record-keeping, transaction histories cannot be deleted. They serve as your official payment ledger.',
      },
    ],
  },
  {
    category: 'Documents & Profile',
    items: [
      {
        q: 'How do I download my tenancy agreement?',
        a: 'Open Me → Tenancy documents to view leases and downloads when your PM has uploaded them.',
      },
    ],
  },
]
