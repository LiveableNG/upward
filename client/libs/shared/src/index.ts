export const SESSIONS = [
  {
    id: 'session-tue-mar31',
    label: 'Tuesday (March 31)',
    date: '2026-03-31T19:00:00',
    display: 'Tue · 7:00 PM',
  },
  {
    id: 'session-thu-apr2',
    label: 'Thursday (April 2)',
    date: '2026-04-02T19:00:00',
    display: 'Thu · 7:00 PM',
  },
  {
    id: 'session-wed-apr8',
    label: 'Wednesday (April 8)',
    date: '2026-04-08T12:00:00',
    display: 'Wed · 12:00 PM',
  },
  {
    id: 'session-sat-apr11',
    label: 'Saturday (April 11)',
    date: '2026-04-11T09:00:00',
    display: 'Sat · 9:00 AM',
  },
] as const

export type SessionType = (typeof SESSIONS)[number]

export type CheckboxState = {
  news: boolean
  ambassador: boolean
}
