export function buildShareScoreMessage(input: {
  name: string
  score: number
  maxScore: number
  band: string
  onTimePct: number
  longestStreak: number
  profileUrl: string
}): string {
  const { name, score, maxScore, band, onTimePct, longestStreak, profileUrl } = input
  return [
    `${name}'s Upward Rent Score: ${score}/${maxScore} (${band})`,
    `On-time payments: ${Math.round(onTimePct)}% · Best streak: ${longestStreak} cycles`,
    '',
    `View Rent Passport: ${profileUrl}`,
  ].join('\n')
}
