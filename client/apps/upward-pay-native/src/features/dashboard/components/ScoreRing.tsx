import Svg, { Circle } from 'react-native-svg'
import { View } from 'react-native'

import { CaptionText, LabelText } from '@/components/text'
import { useAppTheme } from '@/theme'

type ScoreRingProps = {
  percentage: number
  band: string
  rank?: string
  size?: number
  variant?: 'onDark' | 'onLight'
}

export function ScoreRing({
  percentage,
  band,
  rank,
  size = 88,
  variant = 'onDark',
}: ScoreRingProps) {
  const { colors } = useAppTheme()
  const labelColor = variant === 'onDark' ? 'bg' : 'text'
  const rankOpacity = variant === 'onDark' ? 0.85 : 0.7
  const trackStroke = variant === 'onDark' ? 'rgba(255,255,255,0.25)' : colors.surface2
  const progressStroke = variant === 'onDark' ? colors.bg : colors.clay
  const stroke = 6
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(100, Math.max(4, percentage))
  const strokeDashoffset = circumference * (1 - clamped / 100)

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={trackStroke}
          strokeWidth={stroke}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={progressStroke}
          strokeWidth={stroke}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation={-90}
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      <View style={{ alignItems: 'center', maxWidth: size - 16 }}>
        <LabelText color={labelColor} style={{ textAlign: 'center' }}>
          {band}
        </LabelText>
        {rank && rank !== 'N/A' ? (
          <CaptionText color={labelColor} style={{ opacity: rankOpacity, textAlign: 'center' }}>
            {rank}
          </CaptionText>
        ) : null}
      </View>
    </View>
  )
}
